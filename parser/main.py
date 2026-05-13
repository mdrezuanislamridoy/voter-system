from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
from pdf2image import convert_from_path
import pytesseract
import psycopg2
import re
import os
import traceback
from typing import List
from PIL import Image

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Text Cleaning Helper (Lighter for OCR)
def clean_text(text):
    if not text: return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# PostgreSQL Connection Helper
def get_db_conn():
    host = os.getenv("DB_HOST", "db")
    port = os.getenv("DB_PORT", "5432")
    if not os.path.exists("/.dockerenv") and host == "db":
        host = "localhost"
        port = "5439"
    return psycopg2.connect(
        dbname="voterdb", user="admin", password="password123", host=host, port=port
    )

# Extract records from text using robust regex
def extract_records_from_text(text, cursor):
    if not text:
        return 0
    
    # Normalize some common OCR misreadings or variations
    text = text.replace('িপতা', 'পিতা')
    text = text.replace('ঃ', ':')
    
    # Robust Regex Patterns
    # Names: Matches "নাম:" or "নাম " followed by text until newline or start of next record (digit followed by dot)
    names = re.findall(r'নাম[:\s]+(.*?)(?:\n|পিতা:|মাতা:|ভোটার|$)', text)
    # Voter IDs: Matches "নং:" or "নং." or "নং " followed by Bengali or Western digits
    voter_ids = re.findall(r'নং[:\.\s]+([\d০-৯]+)', text)
    # Father's names
    fathers = re.findall(r'পিতা[:\s]+(.*?)(?:\n|মাতা:|ভোটার|$)', text)
    # Mother's names
    mothers = re.findall(r'মাতা[:\s]+(.*?)(?:\n|পিতা:|ভোটার|$)', text)
    
    count = max(len(names), len(voter_ids), len(fathers), len(mothers))
    records_saved = 0
    
    for idx in range(count):
        n = clean_text(names[idx]) if idx < len(names) else ""
        v = clean_text(voter_ids[idx]) if idx < len(voter_ids) else ""
        f_name = clean_text(fathers[idx]) if idx < len(fathers) else ""
        m_name = clean_text(mothers[idx]) if idx < len(mothers) else ""
        
        if n or v:
            try:
                cursor.execute(
                    "INSERT INTO voters (name, voter_id, father_name, mother_name) VALUES (%s, %s, %s, %s)",
                    (n, v, f_name, m_name)
                )
                records_saved += 1
            except Exception as e:
                print(f"DB Insert Error: {e}")
                
    return records_saved

# Initialize Table
try:
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            voter_id VARCHAR(100),
            father_name VARCHAR(255),
            mother_name VARCHAR(255),
            address TEXT
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error initializing database: {e}")

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    total_saved = 0
    errors = []
    
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

    for file in files:
        content = await file.read()
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)
            
        try:
            # STEP 1: Try fast text extraction with PyMuPDF
            print(f"FAST: Extracting text from {file.filename} via PyMuPDF...")
            doc = fitz.open(temp_path)
            extracted_text = ""
            for page in doc:
                extracted_text += page.get_text()
            doc.close()
            
            records_from_fast = 0
            if extracted_text.strip():
                print(f"FAST: Found text in {file.filename}, parsing...")
                records_from_fast = extract_records_from_text(extracted_text, cursor)
                total_saved += records_from_fast
                print(f"FAST: Saved {records_from_fast} records.")

            # STEP 2: Fallback to OCR if PyMuPDF failed to find records (scanned PDF)
            if records_from_fast == 0:
                print(f"OCR: No selectable text found or parsed. Falling back to OCR for {file.filename}...")
                pages = convert_from_path(temp_path, 300)
                
                for i, page in enumerate(pages):
                    print(f"OCR: Processing {file.filename} Page {i+1}...")
                    text = pytesseract.image_to_string(page, lang='ben')
                    if text:
                        saved = extract_records_from_text(text, cursor)
                        total_saved += saved
                
            conn.commit()
        except Exception as e:
            print(f"Error processing file {file.filename}: {e}")
            traceback.print_exc()
            errors.append(f"{file.filename}: {str(e)}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    cursor.close()
    conn.close()

    return {
        "message": f"Processing complete. {total_saved} records saved from {len(files)} files!",
        "errors": errors if errors else None
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

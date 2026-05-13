"use client";
import { useState, useEffect } from 'react';

export default function Home() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');

    // Multiple File Upload Handler
    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        setUploading(true);
        setUploadMessage("Processing your files...");

        try {
            const res = await fetch("http://127.0.0.1:8001/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setUploadMessage(data.message);
            } else {
                setUploadMessage(`Error: ${data.detail?.message || data.detail || "Upload failed"}`);
            }
        } catch (error) {
            setUploadMessage(`Upload failed: ${error.message}`);
        }
        setUploading(false);
    };

    // Instant Search (Debounced)
    useEffect(() => {
        if (query.trim().length === 0) {
            setResults([]);
            return;
        }

        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await fetch(`http://127.0.0.1:5001/api/search?q=${query}`);
                const data = await res.json();
                setResults(data);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(delay);
    }, [query]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Header / Background Decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b,transparent)] pointer-events-none" />
            
            <div className="relative max-w-5xl mx-auto px-4 py-12">
                {/* Logo & Title */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="text-5xl font-black tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        VoterSearch Pro
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Advanced Voter Data Management System with Real-time PDF Parsing & Instant Search.
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid gap-8">
                    
                    {/* Upload Card */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl transition-all hover:shadow-blue-500/10 group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            <h2 className="text-xl font-bold text-white">Batch Import</h2>
                        </div>
                        
                        <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer group/label">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-500">PDF Files only</p>
                            </div>
                            <input 
                                type="file" 
                                multiple 
                                accept="application/pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>

                        {uploading && (
                            <div className="mt-4 flex items-center gap-3 text-blue-400 font-medium animate-pulse">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                Parsing documents...
                            </div>
                        )}
                        {uploadMessage && (
                            <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${uploadMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {uploadMessage}
                            </div>
                        )}
                    </div>

                    {/* Search Card */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl min-h-[500px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                </div>
                                <h2 className="text-xl font-bold text-white">ভোটার অনুসন্ধান</h2>
                            </div>
                            {searching && <span className="text-indigo-400 text-sm animate-pulse">Searching...</span>}
                        </div>

                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder="নাম, পিতার নাম বা আইডি নম্বর লিখুন..." 
                                className="w-full bg-slate-900/80 border border-slate-700 p-5 pl-14 rounded-2xl text-lg text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner group-hover:border-slate-600"
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            </div>
                        </div>

                        <div className="mt-10 grid gap-4">
                            {results.length === 0 && query.trim() !== '' && !searching && (
                                <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                                    <p className="text-slate-500 text-lg">কোন তথ্য পাওয়া যায়নি</p>
                                </div>
                            )}
                            
                            {results.map((voter, index) => (
                                <div 
                                    key={voter.id} 
                                    className="group/item p-6 border border-slate-700/50 rounded-2xl bg-slate-900/40 hover:bg-slate-700/30 transition-all flex items-center justify-between animate-in fade-in zoom-in-95 duration-300"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex gap-6 items-center">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                            {voter.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-white mb-1 group-hover/item:text-indigo-300 transition-colors">{voter.name}</h3>
                                            <p className="text-sm text-slate-400 flex gap-4">
                                                <span><span className="text-slate-500">পিতা:</span> {voter.father_name}</span>
                                                <span className="text-slate-700">|</span>
                                                <span><span className="text-slate-500">মাতা:</span> {voter.mother_name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 mb-1 uppercase tracking-widest font-bold">Voter ID</div>
                                        <div className="bg-indigo-500/20 text-indigo-300 font-mono font-bold px-4 py-2 rounded-xl border border-indigo-500/20 shadow-sm">
                                            {voter.voter_id}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="mt-12 text-center text-slate-600 text-sm">
                    &copy; 2026 VoterSearch Pro • Microservice Architecture • PDF Extraction Engine
                </div>
            </div>
        </div>
    );
}

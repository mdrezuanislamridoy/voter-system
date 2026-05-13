const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());

// PostgreSQL Pool Configuration
const isDocker = require('fs').existsSync('/.dockerenv');
const pool = new Pool({
  user: 'admin',
  host: isDocker ? 'db' : 'localhost',
  database: 'voterdb',
  password: 'password123',
  port: isDocker ? 5432 : 5439,
});

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        // ILIKE diye PostgreSQL e fast case-insensitive search
        const query = `
            SELECT * FROM voters 
            WHERE name ILIKE $1 OR voter_id ILIKE $1 OR father_name ILIKE $1
            LIMIT 50
        `;
        const values = [`%${q}%`];
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB Error" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

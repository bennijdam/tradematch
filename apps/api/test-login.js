/**
 * Minimal test server to verify super admin login
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query(
            'SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            userId: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role
        });
        
        console.log(`✅ Login successful: ${user.email} (${user.role})`);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Test login server running on port ${PORT}`);
    console.log(`📍 Login endpoint: http://localhost:${PORT}/api/auth/login`);
});

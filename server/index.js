import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = join(__dirname, 'db.sqlite');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    "from" TEXT NOT NULL,
    toAddress TEXT NOT NULL,
    amount TEXT NOT NULL,
    memo TEXT,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`);

// API Endpoints

// Get all requests for a specific address (either sent by them or sent to them)
app.get('/api/requests/:address', (req, res) => {
  try {
    const { address } = req.params;
    const stmt = db.prepare('SELECT * FROM requests WHERE "from" = ? OR toAddress = ? ORDER BY createdAt DESC');
    const requests = stmt.all(address, address);
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Create multiple requests
app.post('/api/requests', (req, res) => {
  try {
    const requests = Array.isArray(req.body) ? req.body : [req.body];
    const insert = db.prepare(`
      INSERT INTO requests (id, "from", toAddress, amount, memo, status, createdAt)
      VALUES (@id, @from, @toAddress, @amount, @memo, @status, @createdAt)
    `);

    const insertMany = db.transaction((reqs) => {
      for (const r of reqs) {
        insert.run({
          id: r.id,
          from: r.from,
          toAddress: r.toAddress,
          amount: r.amount,
          memo: r.memo || '',
          status: r.status,
          createdAt: r.createdAt
        });
      }
    });

    insertMany(requests);
    res.status(201).json({ message: 'Requests created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create requests' });
  }
});

// Update request status
app.patch('/api/requests/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'paid', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const stmt = db.prepare('UPDATE requests SET status = ? WHERE id = ?');
    const info = stmt.run(status, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

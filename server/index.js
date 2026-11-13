import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './db.js';
import routes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database & Seed realistic data if fresh
initDatabase();

// API Routes
app.use('/api', routes);

// Serve static frontend files if production build exists
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Cinema Booking API</title></head>
          <body style="font-family: sans-serif; background: #09090b; color: #fff; padding: 40px; text-align: center;">
            <h1 style="color: #f59e0b;">Cinema Booking Server Running</h1>
            <p>API is active on port ${PORT}. Run frontend with Vite on port 5173.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Cinema Server] Running on http://localhost:${PORT}`);
  console.log(`[Cinema Server] REST API available at http://localhost:${PORT}/api`);
});


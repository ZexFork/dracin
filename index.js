process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import cors from 'cors';

// Menyiapkan __dirname untuk ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 4343;

// Middleware untuk menyajikan file statis dari direktori 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk parsing JSON
app.use(express.json());
app.use(cors());

// Gunakan router untuk semua permintaan yang diawali dengan /api
app.use('/api', apiRouter);

// Jalankan server
// Jalankan server jika tidak di environment Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Dokumentasi tersedia di http://localhost:${PORT}`);
  });
}

// Penting untuk Vercel!
export default app;

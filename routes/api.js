import { Router } from 'express';
import { latest, search, linkStream, trendings, foryou, populersearch, randomdrama, vip, detail, dubindo } from '../lib/dramabox.js';
const router = Router();

// --- Helper Function untuk Error Handling ---
const handleRequest = async (handler, req, res) => {
  try {
    const result = await handler(req);
    res.json(result);
  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: 'IP terkena limit, silakan tunggu beberapa menit dan coba lagi', message: error.message });
  }
};

// --- Drama Routes ---

// GET /api/latest - Get latest dramas
router.get('/latest', (req, res) => {
  handleRequest(latest, req, res);
});

// GET /api/trending - Get trending dramas
router.get('/trending', (req, res) => {
  handleRequest(trendings, req, res);
});

// GET /api/for-you - Get personalized recommendations
router.get('/for-you', (req, res) => {
  handleRequest(foryou, req, res);
});

// GET /api/vip - Get VIP dramas
router.get('/vip', (req, res) => {
  handleRequest(vip, req, res);
});

// GET /api/random - Get random drama video
router.get('/random', (req, res) => {
  handleRequest(randomdrama, req, res);
});

// GET /api/popular-searches - Get popular search keywords
router.get('/popular-searches', (req, res) => {
  handleRequest(populersearch, req, res);
});

// GET /api/search?query=namadrama - Search dramas
router.get('/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Parameter "query" dibutuhkan' });
  handleRequest(() => search(query), req, res);
});

// GET /api/detail?bookId=12345 - Get drama details
router.get('/detail', (req, res) => {
  const { bookId } = req.query;
  if (!bookId) return res.status(400).json({ error: 'Parameter "bookId" dibutuhkan' });
  handleRequest(() => detail(bookId), req, res);
});

// GET /api/episodes?bookId=12345 - Get all episodes with streaming links
router.get('/episodes', (req, res) => {
  const { bookId } = req.query;
  if (!bookId) return res.status(400).json({ error: 'Parameter "bookId" dibutuhkan' });
  handleRequest(() => linkStream(bookId), req, res);
});

// GET /api/dubbed?classify=terpopuler&page=1 - Get Indonesian dubbed dramas
router.get('/dubbed', (req, res) => {
  let { classify, page } = req.query;

  if (!classify) {
    return res.status(400).json({
      error: 'Parameter classify dibutuhkan terpopuler atau terbaru'
    });
  }

  // normalize
  classify = classify.toLowerCase();

  // mapping classify ke angka
  let classifyCode;
  if (classify === 'terpopuler') {
    classifyCode = 1;
  } else if (classify === 'terbaru') {
    classifyCode = 2;
  } else {
    return res.status(400).json({
      error: 'Parameter classify harus terpopuler atau terbaru'
    });
  }

  // page default 1 dan pastikan integer
  page = parseInt(page) || 1;

  handleRequest(() => dubindo(classifyCode, page), req, res);
});

export default router;

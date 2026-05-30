import { Router } from 'express';
import db from '../db/index.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

// Áp dụng middleware xác thực cho tất cả endpoint của admin
router.use(requireAdminAuth);

router.get('/comments', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM comments ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const totalComments = await db.query('SELECT COUNT(*) FROM comments');
    const sentimentStats = await db.query(
      'SELECT sentiment, COUNT(*) as count FROM comments GROUP BY sentiment'
    );
    const intentStats = await db.query(
      'SELECT intent, COUNT(*) as count FROM comments GROUP BY intent'
    );
    const statusStats = await db.query(
      'SELECT status, COUNT(*) as count FROM comments GROUP BY status'
    );

    res.json({
      total: parseInt(totalComments.rows[0].count, 10),
      sentiments: sentimentStats.rows.reduce((acc, row) => {
        if (row.sentiment) acc[row.sentiment] = parseInt(row.count, 10);
        return acc;
      }, {}),
      intents: intentStats.rows.reduce((acc, row) => {
        if (row.intent) acc[row.intent] = parseInt(row.count, 10);
        return acc;
      }, {}),
      statuses: statusStats.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {})
    });
  } catch (err) {
    next(err);
  }
});

export default router;

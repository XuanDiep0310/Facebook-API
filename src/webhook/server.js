/**
 * webhook/server.js
 */

import express from 'express';
import { config } from '../config.js';
import webhookRouter from '../routes/webhook.js';
import { connectProducer, disconnectProducer } from '../services/kafkaProducer.js';

const app = express();

// Middleware capture raw body (cần thiết cho signature verification)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Route chính cho Webhook
app.use('/webhook', webhookRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'webhook-service' });
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Khởi động server Webhook
 */
export async function startWebhookServer() {
  // Đảm bảo kết nối tới Kafka (hoặc mock) trước khi nhận event
  await connectProducer();

  return new Promise((resolve) => {
    const server = app.listen(config.webhookPort, '0.0.0.0', () => {
      console.log(`🚀 [webhook-service] Listening on port ${config.webhookPort}`);
      resolve(server);
    });

    const shutdown = async (signal) => {
      console.log(`\n[webhook-service] ${signal} received — shutting down...`);
      await disconnectProducer();
      server.close();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
}

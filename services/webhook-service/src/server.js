import express from 'express';
import { config } from './config.js';
import webhookRouter from './routes/webhook.js';
import { connectProducer, disconnectProducer } from './services/kafkaProducer.js';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use('/webhook', webhookRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'webhook-service', port: config.port });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export async function startWebhookServer() {
  await connectProducer();

  return new Promise((resolve) => {
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 [webhook-service] Listening on port ${config.port}`);
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

// Khởi động server
startWebhookServer().catch((err) => {
  console.error('[webhook-service] Failed to start:', err);
});

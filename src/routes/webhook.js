/**
 * webhook.js
 */

import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config.js';
import { normalizeWebhookPayload } from '../services/eventNormalizer.js';
import { publishEvent } from '../services/kafkaProducer.js';

const router = Router();

/**
 * ─── Verification Handshake ──────────────────────────────────────────────────
 * Facebook gọi GET để xác thực webhook
 */
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    console.log('✅ [webhook] Handshake successful');
    return res.status(200).send(challenge);
  }
  
  console.warn('❌ [webhook] Handshake failed: Token mismatch');
  return res.status(403).send('Forbidden');
});

/**
 * ─── Signature Verification Middleware ───────────────────────────────────────
 * Kiểm tra tính toàn vẹn của dữ liệu bằng App Secret
 */
function verifySignature(req, res, next) {
  if (!config.appSecret) {
    console.warn('⚠️ [webhook] FACEBOOK_APP_SECRET not set — skipping signature check');
    return next();
  }

  const sigHeader = req.headers['x-hub-signature-256'];
  if (!sigHeader) {
    console.warn('⚠️ [webhook] Missing signature header');
    return res.status(401).send('No signature');
  }

  const [scheme, receivedSig] = sigHeader.split('=');
  const expectedSig = createHmac('sha256', config.appSecret)
    .update(req.rawBody || '')
    .digest('hex');

  try {
    // Sử dụng timingSafeEqual để tránh timing attacks
    const isMatch = timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    if (!isMatch) {
      console.error('❌ [webhook] Signature mismatch! Request rejected.');
      return res.status(401).send('Invalid signature');
    }
  } catch (err) {
    return res.status(401).send('Signature verification error');
  }

  next();
}

/**
 * ─── Receive and Process Event ───────────────────────────────────────────────
 */
router.post('/', verifySignature, async (req, res) => {
  // Trả lời 200 OK ngay lập tức cho Facebook (giới hạn 20 giây)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    const events = normalizeWebhookPayload(body);

    if (events.length === 0) return;

    for (const event of events) {
      console.log(`🚀 [webhook] Received ${event.eventType} event from ${event.senderName || event.senderId}`);
      
      // Publish vào Kafka topic raw_events
      await publishEvent(config.kafkaTopicRawEvents, event.eventId, event);
    }
  } catch (err) {
    console.error('❌ [webhook] Error processing payload:', err.message);
  }
});

export default router;

/**
 * test/send_mock_webhook.js
 *
 * Script test gửi mock webhook POST tới localhost:3001/webhook
 *
 * Cách chạy:
 *   node test/send_mock_webhook.js [comment|message|reaction]
 *
 * Ví dụ:
 *   node test/send_mock_webhook.js comment
 *   node test/send_mock_webhook.js message
 */

import { createHmac } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const WEBHOOK_URL = `http://127.0.0.1:${process.env.WEBHOOK_PORT || 3001}/webhook`;
const APP_SECRET  = process.env.FACEBOOK_APP_SECRET || 'test_secret';
const PAGE_ID     = '123456789';

// ─── Mock payloads ────────────────────────────────────────────────────────────

const payloads = {
  // Comment event (feed change)
  comment: {
    object: 'page',
    entry: [
      {
        id: PAGE_ID,
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: `${PAGE_ID}_comment_${Date.now()}`,
              post_id: `${PAGE_ID}_post_001`,
              from: { id: '987654321', name: 'Nguyen Van A' },
              message: 'Bình luận test từ mock webhook!',
              created_time: Math.floor(Date.now() / 1000),
            },
          },
        ],
      },
    ],
  },

  // Message event (Messenger)
  message: {
    object: 'page',
    entry: [
      {
        id: PAGE_ID,
        time: Math.floor(Date.now() / 1000),
        messaging: [
          {
            sender:    { id: '111222333' },
            recipient: { id: PAGE_ID },
            timestamp: Date.now(),
            message: {
              mid: `m_${Date.now()}`,
              text: 'Tin nhắn test từ mock webhook!',
            },
          },
        ],
      },
    ],
  },

  // Reaction event (feed change)
  reaction: {
    object: 'page',
    entry: [
      {
        id: PAGE_ID,
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'feed',
            value: {
              
              item: 'reaction',
              verb: 'add',
              reaction_id: `${PAGE_ID}_reaction_${Date.now()}`,
              post_id: `${PAGE_ID}_post_001`,
              from: { id: '444555666', name: 'Tran Thi B' },
              reaction_type: 'like',
              created_time: Math.floor(Date.now() / 1000),
            },
          },
        ],
      },
    ],
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const type = process.argv[2] || 'comment';

  if (!payloads[type]) {
    console.error(`Unknown payload type: "${type}". Use: comment | message | reaction`);
    process.exit(1);
  }

  const body = JSON.stringify(payloads[type]);

  // Tính chữ ký HMAC-SHA256 như Facebook
  const sig = 'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex');

  console.log(`\n🚀 Sending mock [${type}] webhook to ${WEBHOOK_URL}`);
  console.log(`   X-Hub-Signature-256: ${sig}`);
  console.log(`   Body: ${body.slice(0, 120)}...`);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': sig,
      },
      body,
    });

    const text = await res.text();
    console.log(`\n✅ Response: HTTP ${res.status} — "${text}"`);
  } catch (err) {
    console.error(`\n❌ Request failed: ${err.message}`);
    console.error('   Đảm bảo webhook server đang chạy: npm run dev');
  }
}

main();

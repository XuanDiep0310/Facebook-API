import fetch from 'node-fetch';
import { createHmac } from 'crypto';

const APP_SECRET = '0be92aa04415bcef7bf264f213f93e07';
const WEBHOOK_URL = 'http://127.0.0.1:3001/webhook';

// Nhận bình luận từ tham số dòng lệnh hoặc mặc định
const message = process.argv[2] || 'Shop oi gia bao nhieu';
const senderId = process.argv[3] || 'user_diep_' + Math.floor(Math.random() * 1000);
const commentId = 'comment_' + Date.now();

const payload = {
  object: 'page',
  entry: [
    {
      id: '1234567890',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'feed',
          value: {
            item: 'comment',
            verb: 'add',
            comment_id: commentId,
            post_id: 'post_78910',
            from: {
              id: senderId,
              name: 'Xuan Diep'
            },
            message: message
          }
        }
      ]
    }
  ]
};

const rawBody = JSON.stringify(payload);
const hmac = createHmac('sha256', APP_SECRET)
  .update(rawBody)
  .digest('hex');

const signature = `sha256=${hmac}`;

console.log(`Sending mock webhook event: "${message}" from sender: ${senderId}`);
console.log(`Comment ID: ${commentId}`);
console.log(`Signature: ${signature}`);

async function send() {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: rawBody
    });

    const text = await res.text();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Body: ${text}`);
  } catch (err) {
    console.error('Error sending request:', err.message);
  }
}

send();

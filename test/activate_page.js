/**
 * test/activate_page.js
 * Script dùng để kích hoạt Webhook cho Page (Subscribed Apps)
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v25.0';

async function activatePage() {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('❌ Thiếu FACEBOOK_PAGE_ACCESS_TOKEN trong file .env');
    return;
  }

  try {
    // 1. Lấy Page ID từ Token
    console.log('🔍 Đang kiểm tra Page ID từ Token...');
    const meRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?access_token=${PAGE_ACCESS_TOKEN}`);
    const meData = await meRes.json();

    if (meData.error) {
      throw new Error(meData.error.message);
    }

    const pageId = meData.id;
    const pageName = meData.name;
    console.log(`✅ Đã tìm thấy Page: ${pageName} (ID: ${pageId})`);

    // 2. Gọi API subscribed_apps để kích hoạt
    console.log('🚀 Đang kích hoạt Webhook cho Page...');
    const subRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/subscribed_apps?subscribed_fields=feed&access_token=${PAGE_ACCESS_TOKEN}`,
      { method: 'POST' }
    );
    const subData = await subRes.json();

    if (subData.success) {
      console.log('✨ THÀNH CÔNG! Page của bạn đã được kết nối với App.');
      console.log('👉 Bây giờ hãy thử bình luận thật trên Page, log sẽ hiện ra.');
    } else {
      console.error('❌ Kích hoạt thất bại:', subData);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

activatePage();

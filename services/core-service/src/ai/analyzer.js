import { GoogleGenerativeAI } from '@google/generative-ai';
import opossum from 'opossum';
import { config } from '../config.js';

let genAI = null;
if (config.geminiApiKey && config.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
}

async function callGemini(message) {
  if (!genAI) {
    throw new Error('Gemini API Key is not configured.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Phân loại bình luận sau từ người dùng Facebook.
Bạn PHẢI trả về duy nhất một chuỗi JSON hợp lệ theo cấu trúc sau (không chứa các khối markdown lồng nhau hay văn bản thừa, không chứa \`\`\`json):
{
  "intent": "ask_price" | "complaint" | "compliment" | "spam" | "other",
  "sentiment": "positive" | "neutral" | "negative",
  "isSpam": true | false
}

Chú ý định nghĩa:
- ask_price: hỏi giá, mua hàng, hỏi size, inbox...
- complaint: phàn nàn dịch vụ, chờ lâu, hàng lỗi, thái độ...
- compliment: khen, đánh giá tốt, cảm ơn shop...
- spam: chứa link quảng cáo, lặp nội dung rác, chửi bới vô cớ...

Bình luận cần phân loại: "${message}"`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  
  // Parse response thành JSON
  try {
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = responseText.slice(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(responseText);
  } catch (e) {
    console.error('[AI-Analyzer] Failed to parse Gemini response:', responseText, e.message);
    throw new Error('Invalid JSON format from AI API');
  }
}

// Cấu hình Circuit Breaker cho AI API
const options = {
  timeout: 8000, // Timeout 8s
  errorThresholdPercentage: 50, // Mở mạch nếu 50% cuộc gọi thất bại
  resetTimeout: 60000 // Chờ 60s để thử lại
};

const breaker = new opossum(callGemini, options);

// Fallback logic khi mạch mở hoặc API lỗi liên tục
breaker.fallback((message, err) => {
  console.warn('[AI-Analyzer] Fallback triggered! Using default classification. Reason:', err.message);
  return {
    intent: 'other',
    sentiment: 'neutral',
    isSpam: false
  };
});

breaker.on('open', () => console.warn('[AI-Analyzer] Gemini API circuit opened!'));
breaker.on('close', () => console.log('[AI-Analyzer] Gemini API circuit closed.'));

export async function analyzeComment(message) {
  if (!genAI) {
    return {
      intent: 'other',
      sentiment: 'neutral',
      isSpam: false
    };
  }
  return breaker.fire(message);
}

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  graphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v25.0',
};

if (!config.accessToken) {
  console.warn('Warning: FACEBOOK_PAGE_ACCESS_TOKEN is not set');
}

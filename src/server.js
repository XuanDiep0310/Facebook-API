import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import openApiSpec from './docs/openapi.js';
import pageRouter from './routes/pageApi.js';

const app = express();

app.use(express.json());
app.get('/openapi.json', (req, res) => res.json(openApiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/page', pageRouter);

app.use((err, req, res, next) => {
  if (err.graphError) {
    return res.status(err.status || 502).json({ error: err.graphError });
  }
  console.error(err);
  res.status(500).json({
    error: { message: err.message || 'Internal Server Error' },
  });
});

app.listen(config.port, () => {
  console.log(`Listening on http://localhost:${config.port}`);
});

/*
  Manual checks (curl) — set BASE=http://localhost:3000 PAGE_ID=... POST_ID=...

  GET /api/page/{pageId}
  curl -s "%BASE%/api/page/%PAGE_ID%"

  GET /api/page/{pageId}/posts
  curl -s "%BASE%/api/page/%PAGE_ID%/posts?limit=5"

  POST /api/page/{pageId}/posts
  curl -s -X POST "%BASE%/api/page/%PAGE_ID%/posts" -H "Content-Type: application/json" -d "{\"message\":\"Hello from API\"}"

  DELETE /api/page/post/{postId}
  curl -s -X DELETE "%BASE%/api/page/post/%POST_ID%"

  GET /api/page/post/{postId}/comments
  curl -s "%BASE%/api/page/post/%POST_ID%/comments"

  GET /api/page/post/{postId}/likes
  curl -s "%BASE%/api/page/post/%POST_ID%/likes"

  GET /api/page/{pageId}/insights (metric required)
  curl -s "%BASE%/api/page/%PAGE_ID%/insights?metric=page_impressions_unique&period=day"
*/

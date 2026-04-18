import { Router } from 'express';
import { graphDelete, graphGet, graphPost } from '../services/graphApi.js';

const router = Router();

const DEFAULT_PAGE_FIELDS = 'id,name,about,category,fan_count,link';

function hasMetric(metric) {
  if (metric === undefined || metric === null) return false;
  if (Array.isArray(metric)) {
    return metric.length > 0 && metric.every((m) => m && String(m).trim() !== '');
  }
  return String(metric).trim() !== '';
}

router.delete('/post/:postId', async (req, res, next) => {
  try {
    const data = await graphDelete(`/${req.params.postId}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/post/:postId/comments', async (req, res, next) => {
  try {
    const { postId } = req.params;
    const passthrough = ['limit', 'after', 'before', 'fields', 'filter', 'order'];
    const params = {};
    for (const k of passthrough) {
      if (req.query[k] !== undefined) params[k] = req.query[k];
    }
    const data = await graphGet(`/${postId}/comments`, params);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/post/:postId/likes', async (req, res, next) => {
  try {
    const { postId } = req.params;
    const params = { ...req.query, summary: 'true' };
    const data = await graphGet(`/${postId}/likes`, params);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:pageId/insights', async (req, res, next) => {
  try {
    const { metric, period, since, until } = req.query;
    if (!hasMetric(metric)) {
      return res.status(400).json({
        error: {
          message:
            'Query parameter "metric" is required (e.g. ?metric=page_impressions_unique)',
          code: 'MISSING_METRIC',
        },
      });
    }
    const { pageId } = req.params;
    const params = { metric };
    if (period !== undefined) params.period = period;
    if (since !== undefined) params.since = since;
    if (until !== undefined) params.until = until;
    const data = await graphGet(`/${pageId}/insights`, params);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:pageId/posts', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const passthrough = ['limit', 'after', 'before', 'fields', 'include_hidden'];
    const params = {};
    for (const k of passthrough) {
      if (req.query[k] !== undefined) params[k] = req.query[k];
    }
    const data = await graphGet(`/${pageId}/feed`, params);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/:pageId/posts', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { message, link, published } = req.body || {};
    if (message === undefined && link === undefined) {
      return res.status(400).json({
        error: {
          message: 'Request body must include at least "message" or "link"',
          code: 'INVALID_BODY',
        },
      });
    }
    const body = {};
    if (message !== undefined) body.message = message;
    if (link !== undefined) body.link = link;
    if (published !== undefined) {
      body.published = published ? 'true' : 'false';
    }
    const data = await graphPost(`/${pageId}/feed`, body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:pageId', async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const fields = req.query.fields || DEFAULT_PAGE_FIELDS;
    const data = await graphGet(`/${pageId}`, { fields });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;

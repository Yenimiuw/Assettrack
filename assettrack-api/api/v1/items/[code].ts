import { route, HttpError } from '../../../lib/http';
import { getItemByCode } from '../../../lib/repo';
import { CODE_RE } from '../../../lib/util';

// GET /v1/items/:code -> Item
export default route(
  { name: 'item', methods: ['GET'], limit: { max: 60, windowMs: 60_000 } },
  async (req, res) => {
    const code = String(req.query.code ?? '').toLowerCase();
    if (!CODE_RE.test(code)) throw new HttpError(400, 'Invalid code', 'INVALID_CODE');

    const item = await getItemByCode(code);
    if (!item) {
      throw new HttpError(
        404,
        'Item not found. If you think this is a system problem, please contact the admin.',
        'ITEM_NOT_FOUND',
      );
    }
    // "private": responses are per-authenticated-guest, so shared/CDN caches must not store them.
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.status(200).json(item);
  },
);

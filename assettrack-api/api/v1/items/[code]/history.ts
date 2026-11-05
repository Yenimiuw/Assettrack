import { route, HttpError } from '../../../../lib/http';
import { getHistory, getItemByCode } from '../../../../lib/repo';
import { CODE_RE } from '../../../../lib/util';

// GET /v1/items/:code/history?limit=50 -> { assetNumber, events: MovementEvent[] } newest first
export default route(
  { name: 'history', methods: ['GET'], limit: { max: 60, windowMs: 60_000 } },
  async (req, res) => {
    const code = String(req.query.code ?? '').toLowerCase();
    if (!CODE_RE.test(code)) throw new HttpError(400, 'Invalid code', 'INVALID_CODE');

    const item = await getItemByCode(code);
    if (!item) throw new HttpError(404, 'Item not found. If you think this is a system problem, please contact the admin.', 'ITEM_NOT_FOUND');

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const events = await getHistory(item.assetNumber, limit);
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.status(200).json({ assetNumber: item.assetNumber, events });
  },
);

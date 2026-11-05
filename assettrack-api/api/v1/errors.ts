import { route, HttpError } from '../../lib/http';
import { appendErrorReports, collapse, sanitizeReport } from '../../lib/errorlog';

// POST /v1/errors  body: { reports: [{ timestamp, appVersion, platform, osVersion, screen,
//                                       errorType, httpStatus, endpoint, message, stack, count }] }
export default route(
  // reportFailures:false -> if logging itself fails we do NOT try to log that failure.
  { name: 'errors', methods: ['POST'], limit: { max: 10, windowMs: 60_000 }, reportFailures: false },
  async (req, res, { guestId }) => {
    if (Number(req.headers['content-length'] ?? 0) > 32_768) {
      throw new HttpError(413, 'Payload too large', 'PAYLOAD_TOO_LARGE');
    }
    let body: any;
    try { body = req.body; } catch { throw new HttpError(400, 'Invalid JSON', 'BAD_REQUEST'); }
    if (!body || !Array.isArray(body.reports) || body.reports.length === 0) {
      throw new HttpError(400, 'Expected { reports: [...] }', 'BAD_REQUEST');
    }

    const clean = body.reports
      .slice(0, 20)
      .map((r: unknown) => sanitizeReport(r, guestId))
      .filter((r: unknown): r is NonNullable<ReturnType<typeof sanitizeReport>> => r !== null);
    const rows = collapse(clean);

    if (rows.length) await appendErrorReports(rows);
    res.status(202).json({ accepted: rows.length });
  },
);

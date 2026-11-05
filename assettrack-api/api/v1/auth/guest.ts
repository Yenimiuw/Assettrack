import { route, HttpError } from '../../../lib/http';
import { APP_ID, issueGuestToken } from '../../../lib/auth';

// POST /v1/auth/guest -> { token, guestId, expiresIn }
// The x-app-id header only filters casual traffic; anything shipped in an app can be extracted.
export default route(
  { name: 'auth', methods: ['POST'], auth: false, limit: { max: 10, windowMs: 60_000 } },
  async (req, res) => {
    if (req.headers['x-app-id'] !== APP_ID) {
      throw new HttpError(403, 'Unknown client', 'FORBIDDEN');
    }
    res.status(201).json(await issueGuestToken());
  },
);

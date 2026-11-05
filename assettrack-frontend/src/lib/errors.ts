import { ApiError } from '../api/client';

export interface ErrorInfo { message: string; retryable: boolean; report: boolean }

/** Maps any failure to the message the user sees, and whether it deserves a bug report. */
export function describeError(e: unknown): ErrorInfo {
  if (e instanceof ApiError) {
    if (e.kind === 'cancelled') return { message: '', retryable: false, report: false };
    if (e.code === 'TIMEOUT') {
      return { message: 'The server is taking too long to respond. Please try again.', retryable: true, report: false };
    }
    if (e.kind === 'network') {
      return { message: "Can't reach the server. Check your connection and try again.", retryable: true, report: false };
    }
    if (e.code === 'ITEM_NOT_FOUND' || e.status === 404) {
      return {
        message: "Item not found. If you suspect there's a problem with the system, please contact the admin.",
        retryable: false,
        report: false,
      };
    }
    if (e.status === 429) {
      return { message: 'Too many requests, try again in a moment.', retryable: true, report: false };
    }
    return { message: 'Something went wrong. Please try again.', retryable: true, report: e.status >= 500 || e.status === 0 };
  }
  return { message: 'Something went wrong. Please try again.', retryable: true, report: true };
}

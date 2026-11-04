import { onSessionCleared } from '@/api/session-events';

// The booking has no "reviewed" field in the contract, so the app remembers which ones it saw
// reviewed (a 201, or a 409 REVIEW_ALREADY_EXISTS) for the rest of the session: leaving "Mis reservas"
// and coming back must not offer the review again. The rating is null when only the 409 is known.
// shortcut: lost on restart, where the first attempt answers 409 again; a backend field would fix it.
const reviewed = new Map<string, number | null>();

// Per account: the next one to sign in on this device must not inherit them.
onSessionCleared(() => {
  reviewed.clear();
});

export function getReviewedBookings(): ReadonlyMap<string, number | null> {
  return reviewed;
}

export function markBookingReviewed(bookingId: string, rating: number | null): void {
  // A known rating is never replaced by an unknown one.
  if (rating === null && reviewed.has(bookingId)) return;
  reviewed.set(bookingId, rating);
}

import { useRef, useState } from 'react';
import { ApiError, createBookingReview, type components } from '@spot/shared';
import { authClient } from '@/api/client';
import { NETWORK_ERROR, isUnauthorized } from '@/api/errors';
import { useToast } from '@/components/Toast';
import { resetTo } from '@/navigation/resetTo';
import { getReviewedBookings, markBookingReviewed } from './reviewedBookings';
import type { BookingReviewProps } from './BookingReview';

type Booking = components['schemas']['Booking'];

interface UseBookingReviewOptions {
  /** Sets (or clears, with null) the screen's message: why a review couldn't be sent at all. */
  onMessage: (message: string | null) => void;
  /** The booking is gone or isn't COMPLETED anymore: the screen's list must be reloaded. */
  onStale: () => void;
}

/** The message for a failed review, by the API's status (409 is handled before this: it's a success for the card). */
function reviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return NETWORK_ERROR;
  if (error.status === 400) return 'Revisá la calificación e intentá de nuevo.';
  if (error.status === 403) return 'No podés reseñar esta reserva.';
  if (error.status === 404) return 'Esta reserva ya no existe.';
  if (error.code === 'REVIEW_BOOKING_NOT_COMPLETED' || error.status === 422) {
    return 'Solo podés reseñar una reserva completada.';
  }
  return 'No se pudo enviar la reseña. Intentá de nuevo.';
}

/** The "Dejar reseña" flow of a bookings list (#29): one form open at a time, one submit in flight. */
export function useBookingReview({ onMessage, onStale }: UseBookingReviewOptions) {
  const showToast = useToast();
  // One review form open at a time; its draft lives in ReviewForm.
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A copy of the session's reviewed bookings, so a new review re-renders the card.
  const [reviewed, setReviewed] = useState(() => new Map(getReviewedBookings()));
  const inFlight = useRef(false);

  function open(bookingId: string) {
    // A submit still in flight closes its form when it ends: it must not close this one instead.
    if (inFlight.current) return;
    onMessage(null);
    setError(null);
    setReviewingId(bookingId);
  }

  function close() {
    setReviewingId(null);
  }

  function markReviewed(bookingId: string, rating: number | null) {
    markBookingReviewed(bookingId, rating);
    setReviewed(new Map(getReviewedBookings()));
  }

  async function submit(booking: Booking, rating: number, comment: string | undefined) {
    // One submit at a time. A ref, not the state: a double tap fires both presses before React
    // re-renders, and the second POST would answer 409 right after the first one's 201.
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmittingId(booking.id);
    try {
      await createBookingReview(authClient, booking.id, { rating, comment });
      markReviewed(booking.id, rating);
      setReviewingId(null);
      showToast('Tu reseña se envió.');
    } catch (err) {
      if (isUnauthorized(err)) {
        resetTo('/');
        return;
      }
      // Already reviewed (another device, or before a restart): the card says so instead of offering it again.
      if (err instanceof ApiError && (err.code === 'REVIEW_ALREADY_EXISTS' || err.status === 409)) {
        markReviewed(booking.id, null);
        setReviewingId(null);
        onMessage('Esta reserva ya tenía una reseña, así que no se envió otra.');
        return;
      }
      // Not something a retry fixes: the form closes and the reason goes to the screen's message.
      if (err instanceof ApiError && (err.status === 403 || err.status === 404 || err.status === 422)) {
        setReviewingId(null);
        onMessage(reviewErrorMessage(err));
        // The list is stale: the booking is gone or isn't COMPLETED anymore.
        if (err.status !== 403) onStale();
        return;
      }
      setError(reviewErrorMessage(err));
    } finally {
      inFlight.current = false;
      setSubmittingId(null);
    }
  }

  /** Everything one booking card needs to show its review part. */
  function propsFor(booking: Booking): BookingReviewProps {
    const reviewing = reviewingId === booking.id;
    return {
      bookingId: booking.id,
      reviewable: booking.status === 'COMPLETED' && !reviewed.has(booking.id),
      reviewed: reviewed.has(booking.id),
      rating: reviewed.get(booking.id) ?? null,
      reviewing,
      submitting: submittingId === booking.id,
      error: reviewing ? error : null,
      onOpen: () => open(booking.id),
      onCancel: close,
      onSubmit: (value, comment) => void submit(booking, value, comment),
    };
  }

  return { propsFor, close };
}

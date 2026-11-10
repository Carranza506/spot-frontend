import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  /** A few words naming the action. */
  title: string;
  /** The question, with what makes this one specific. */
  message: string;
  confirmLabel: string;
  /** Paints the confirm button red: the action deletes something or can't be undone. */
  danger?: boolean;
}

export interface Feedback {
  /** Opens the confirmation dialog; resolves true only if the user confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Shows a success message for a few seconds. Errors stay on screen instead. */
  showToast: (message: string) => void;
}

export const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error('useFeedback must be used inside FeedbackProvider.');
  return feedback;
}

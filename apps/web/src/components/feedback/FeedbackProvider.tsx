import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Button } from '../Button';
import { FeedbackContext, type ConfirmOptions } from './feedbackContext';
import styles from './Feedback.module.css';

const TOAST_MS = 4000;

interface Toast {
  id: number;
  message: string;
}

/** The app's one confirmation dialog and toast list, opened from anywhere with useFeedback(). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [request, setRequest] = useState<ConfirmOptions | null>(null);

  const nextToastId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolveRef.current?.(false);
    setRequest(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), TOAST_MS);
  }, []);

  useEffect(() => {
    if (request && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [request]);

  function settle(confirmed: boolean) {
    // close() hands the focus back to the button that opened the dialog.
    dialogRef.current?.close();
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setRequest(null);
  }

  function handleEscape(event: SyntheticEvent) {
    event.preventDefault();
    settle(false);
  }

  const feedback = useMemo(() => ({ confirm, showToast }), [confirm, showToast]);

  return (
    <FeedbackContext.Provider value={feedback}>
      {children}

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="confirmTitle" onCancel={handleEscape}>
        {request && (
          <>
            <h2 id="confirmTitle" className={styles.title}>
              {request.title}
            </h2>
            <p className={styles.message}>{request.message}</p>
            <div className={styles.actions}>
              {/* First in the DOM, so it takes the initial focus: Enter must not confirm by accident. */}
              <Button type="button" variant="secondary" compact onClick={() => settle(false)}>
                Volver
              </Button>
              <Button type="button" variant={request.danger ? 'danger' : 'primary'} compact onClick={() => settle(true)}>
                {request.confirmLabel}
              </Button>
            </div>
          </>
        )}
      </dialog>

      {/* Always mounted, only its content changes: a live region has to exist before its content does. */}
      <div className={styles.toasts} role="status">
        {toasts.map((toast) => (
          <p key={toast.id} className={styles.toast}>
            {toast.message}
          </p>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

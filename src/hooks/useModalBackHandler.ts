import { useEffect, useRef } from 'react';

/**
 * Global flag to prevent popstate event listeners from triggering onClose
 * during programmatic history.back() cleanups.
 */
let isProgrammaticBackNavigation = false;

/**
 * Custom hook that intercepts mobile / browser back button (or swipe back gesture)
 * when a modal or sheet is open, closing the modal instead of navigating away from the page.
 *
 * @param isOpen Whether the modal/sheet is currently open
 * @param onClose Callback to close the modal/sheet
 * @param modalName Optional identifier for debugging or state tracking
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalName: string = 'modal'
) {
  const modalKeyRef = useRef<string | null>(null);
  const isPoppedRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose reference updated without re-triggering the history effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      modalKeyRef.current = null;
      isPoppedRef.current = false;
      return;
    }

    // Generate a unique key for this modal instance
    const modalKey = `${modalName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    modalKeyRef.current = modalKey;
    isPoppedRef.current = false;

    // Push state into browser history so back button closes modal instead of exiting site
    try {
      window.history.pushState({ modalKey, isAppModal: true }, '');
    } catch (e) {
      console.warn('[useModalBackHandler] pushState failed:', e);
    }

    const handlePopState = () => {
      if (isProgrammaticBackNavigation) {
        return;
      }
      // Marked that this closure was triggered by the phone / browser back button
      isPoppedRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // If closed programmatically (e.g. clicking 'X' button or submit) and not by back button,
      // pop the history entry we pushed so history stack stays clean.
      if (!isPoppedRef.current) {
        try {
          if (window.history.state?.modalKey === modalKey) {
            isProgrammaticBackNavigation = true;
            window.history.back();
            setTimeout(() => {
              isProgrammaticBackNavigation = false;
            }, 100);
          }
        } catch (e) {
          console.warn('[useModalBackHandler] history back failed:', e);
          isProgrammaticBackNavigation = false;
        }
      }
    };
  }, [isOpen, modalName]);
}

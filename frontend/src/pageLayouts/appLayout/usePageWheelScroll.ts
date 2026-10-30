import { RefObject, useEffect } from 'react';

/** Let the page surroundings scroll a panel without moving the sidebars. */
export default function usePageWheelScroll(
  targetRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      const panel = targetRef.current;
      if (!panel || event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const target = event.target;
      if (target instanceof Node && panel.contains(target)) return;
      if (target instanceof Element && target.closest(
        '[role="dialog"], [aria-modal="true"], input, textarea, select, [contenteditable="true"]',
      )) return;
      if (panel.scrollHeight <= panel.clientHeight) return;

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1;
      event.preventDefault();
      panel.scrollTop += event.deltaY * unit;
    };

    document.addEventListener('wheel', onWheel, { passive: false });
    return () => document.removeEventListener('wheel', onWheel);
  }, [enabled, targetRef]);
}

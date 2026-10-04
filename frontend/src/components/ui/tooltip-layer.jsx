import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

const SHOW_DELAY = 400;
const HIDE_DELAY = 100;
const GAP = 8;
const EDGE_THRESHOLD = 60;
const EASE = [0.22, 1, 0.38, 1];
const SLIDE_MS = 200;

/**
 * @typedef {object} Tip
 * @property {string} label
 * @property {number} x
 * @property {number} y
 * @property {'top' | 'bottom'} placement
 */

export function TooltipLayer() {
  /** @type {[Tip | null, React.Dispatch<React.SetStateAction<Tip | null>>]} */
  const [tip, setTip] = useState(null);

  const currentTriggerRef = useRef(null);
  const pendingTriggerRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    /**
     * @param {Element} trigger
     */
    const reveal = (trigger) => {
      const label = trigger.getAttribute('data-tooltip');
      if (!label) return;
      const rect = trigger.getBoundingClientRect();
      /** @type {'top' | 'bottom'} */
      const placement =
        rect.bottom > window.innerHeight - EDGE_THRESHOLD ? 'top' : 'bottom';
      const y = Math.round(
        placement === 'top' ? rect.top - GAP : rect.bottom + GAP
      );
      const x = Math.round(rect.left + rect.width / 2);
      setTip({ label, x, y, placement });
      currentTriggerRef.current = trigger;
    };

    const hide = () => {
      setTip(null);
      currentTriggerRef.current = null;
    };

    /** @param {MouseEvent} e */
    const handleOver = (e) => {
      const target = /** @type {Element | null} */ (e.target);
      const trigger = target?.closest?.('[data-tooltip]');
      if (!trigger) return;

      if (trigger === currentTriggerRef.current) {
        clearHideTimer();
        return;
      }

      if (trigger === pendingTriggerRef.current) return;

      clearHideTimer();

      if (currentTriggerRef.current) {
        clearShowTimer();
        pendingTriggerRef.current = null;
        reveal(trigger);
        return;
      }

      pendingTriggerRef.current = trigger;
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        if (pendingTriggerRef.current !== trigger) return;
        pendingTriggerRef.current = null;
        reveal(trigger);
      }, SHOW_DELAY);
    };

    /** @param {MouseEvent} e */
    const handleOut = (e) => {
      const target = /** @type {Element | null} */ (e.target);
      const trigger = target?.closest?.('[data-tooltip]');
      if (!trigger) return;

      const related = /** @type {Element | null} */ (e.relatedTarget);
      if (related && related.closest?.('[data-tooltip]')) return;

      if (trigger === pendingTriggerRef.current) {
        clearShowTimer();
        pendingTriggerRef.current = null;
      }

      if (trigger === currentTriggerRef.current) {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          hide();
        }, HIDE_DELAY);
      }
    };

    const handleBlur = () => {
      clearShowTimer();
      clearHideTimer();
      pendingTriggerRef.current = null;
      currentTriggerRef.current = null;
      setTip(null);
    };

    const handleDown = () => {
      clearShowTimer();
      clearHideTimer();
      pendingTriggerRef.current = null;
      currentTriggerRef.current = null;
      setTip(null);
    };

    document.addEventListener('mouseover', handleOver);
    document.addEventListener('mouseout', handleOut);
    document.addEventListener('mousedown', handleDown);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseout', handleOut);
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('blur', handleBlur);
      clearShowTimer();
      clearHideTimer();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {tip && (
        <motion.div
          key="tooltip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: EASE }}
          style={
            /** @type {import('motion/react').MotionStyle} */ ({
              position: 'fixed',
              left: tip.x,
              top: tip.y,
              transition: `left ${SLIDE_MS}ms cubic-bezier(0.22,1,0.38,1), top ${SLIDE_MS}ms cubic-bezier(0.22,1,0.38,1)`,
            })
          }
          className="pointer-events-none z-50"
        >
          <div
            style={{
              transform:
                tip.placement === 'top'
                  ? 'translate(-50%,-100%)'
                  : 'translate(-50%, 0)',
            }}
            className="bg-saturn-900 border-saturn-700/60 text-saturn-100 rounded-md border px-2.5 py-1.5 text-xs font-thin whitespace-nowrap"
          >
            {tip.label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

import { useState, useRef, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TermTooltipProps {
  term: string;
  description: string;
  children?: ReactNode;
}

interface TooltipPosition {
  left: number;
  top: number;
  arrowLeft: number;
  showAbove: boolean;
}

export default function TermTooltip({ term, description, children }: TermTooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback((): TooltipPosition => {
    const icon = iconRef.current;
    const tooltip = tooltipRef.current;
    const margin = 8;
    const gap = 8;
    const maxWidth = 260;

    if (!icon) {
      return { left: 0, top: 0, arrowLeft: 0, showAbove: true };
    }

    const iconRect = icon.getBoundingClientRect();
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;

    const tooltipWidth = tooltip?.offsetWidth ?? maxWidth;
    const tooltipHeight = tooltip?.offsetHeight ?? 80;

    const spaceAbove = iconRect.top;
    const showAbove = spaceAbove >= tooltipHeight + gap + margin;
    const top = showAbove
      ? iconRect.top - tooltipHeight - gap
      : iconRect.bottom + gap;

    let left = iconCenterX - tooltipWidth / 2;

    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin)
      left = window.innerWidth - margin - tooltipWidth;

    let arrowLeft = iconCenterX - left;
    const arrowMin = 12;
    const arrowMax = tooltipWidth - 12;
    arrowLeft = Math.max(arrowMin, Math.min(arrowMax, arrowLeft));

    return { left, top, arrowLeft, showAbove };
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    setPos(computePosition());
  }, [show, computePosition]);

  useLayoutEffect(() => {
    if (!show) return;
    const handler = () => setPos(computePosition());
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [show, computePosition]);

  return (
    <span className="relative inline-flex items-center gap-1">
      {children ?? <span className="uppercase tracking-wider">{term}</span>}
      <button
        ref={iconRef}
        type="button"
        className="text-gray-400 hover:text-blue-600 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={`Ayuda: ${term}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos ? pos.left : -9999,
              top: pos ? pos.top : -9999,
              zIndex: 99999,
              maxWidth: 260,
              width: 'max-content',
            }}
            className="p-3 rounded-lg bg-gray-900 text-white text-xs font-normal normal-case tracking-normal shadow-xl pointer-events-none break-words"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
          >
            <span className="block font-semibold text-white mb-1">{term}</span>
            {description}
            {pos && (
              <span
                style={{
                  left: pos.arrowLeft,
                  transform: 'translateX(-50%)',
                  ...(pos.showAbove
                    ? { top: '100%' }
                    : { bottom: '100%' }),
                } as React.CSSProperties}
                className={`absolute w-0 h-0 border-4 border-transparent ${
                  pos.showAbove ? 'border-t-gray-900' : 'border-b-gray-900'
                }`}
              />
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

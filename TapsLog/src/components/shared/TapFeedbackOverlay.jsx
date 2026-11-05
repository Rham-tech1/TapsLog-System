/**
 * TapFeedbackOverlay — sleek feedback on NFC tap
 */
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const FEEDBACK_CONFIG = {
  success: {
    bg:    'bg-white border-emerald-200 shadow-xl',
    icon:  CheckCircle,
    color: 'text-emerald-500',
    label: 'Tap Accepted',
  },
  warning: {
    bg:    'bg-white border-amber-200 shadow-xl',
    icon:  AlertTriangle,
    color: 'text-amber-500',
    label: 'Late Check-In',
  },
  error: {
    bg:    'bg-white border-rose-200 shadow-xl',
    icon:  XCircle,
    color: 'text-rose-500',
    label: 'Tap Rejected',
  },
};

export function TapFeedbackOverlay() {
  const tapFeedback = useAppStore((s) => s.tapFeedback);
  if (!tapFeedback) return null;

  const cfg  = FEEDBACK_CONFIG[tapFeedback];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none p-4',
        'animate-fade-in'
      )}
    >
      <div className={cn(
        'flex flex-col items-center gap-2.5 px-8 py-6 rounded-2xl border',
        'animate-tap-pulse',
        cfg.bg
      )}>
        <Icon className={cn('w-12 h-12', cfg.color)} strokeWidth={1.8} />
        <span className={cn('text-sm font-bold tracking-wide uppercase', cfg.color)}>{cfg.label}</span>
      </div>
    </div>
  );
}

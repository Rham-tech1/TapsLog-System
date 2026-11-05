/**
 * ToastContainer — sleek light toast alerts
 */
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const TOAST_STYLES = {
  success: 'bg-white border-emerald-200 text-slate-800 shadow-md',
  warning: 'bg-white border-amber-200 text-slate-800 shadow-md',
  error:   'bg-white border-rose-200 text-slate-800 shadow-md',
  info:    'bg-white border-blue-200 text-slate-800 shadow-md',
};

const ICON_COLORS = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error:   'text-rose-500',
  info:    'text-blue-500',
};

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
};

export function ToastContainer() {
  const toasts      = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  const isNotificationPanelOpen = useAppStore((s) => s.isNotificationPanelOpen);

  if (isNotificationPanelOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        const iconColor = ICON_COLORS[toast.type] || 'text-blue-500';
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border',
              'pointer-events-auto animate-slide-up',
              TOAST_STYLES[toast.type] || TOAST_STYLES.info
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', iconColor)} />
            <span className="text-xs font-medium flex-1 text-slate-700">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 transition-opacity shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

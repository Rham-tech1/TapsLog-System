import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const TYPE_STYLES = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
  info: 'bg-blue-100 text-blue-700',
};

function formatTime(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const notifications = useAppStore((state) => state.notifications);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  const setNotificationPanelOpen = useAppStore((state) => state.setNotificationPanelOpen);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const togglePanel = () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    setNotificationPanelOpen(nextIsOpen);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setIsOpen(false);
        setNotificationPanelOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setNotificationPanelOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setNotificationPanelOpen]);

  useEffect(() => () => setNotificationPanelOpen(false), [setNotificationPanelOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-50 flex max-h-[50dvh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[calc(100dvh-5rem)] sm:w-[min(20rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
              <p className="text-[10px] text-slate-500">
                {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  title="Mark all as read"
                  aria-label="Mark all as read"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-brand-700"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  title="Clear notifications"
                  aria-label="Clear notifications"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-80 sm:flex-none">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                Attendance and session updates will appear here.
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-2.5 border-b border-slate-100 px-3.5 py-3 last:border-b-0 ${
                    notification.read ? 'bg-white' : 'bg-blue-50/50'
                  }`}
                >
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[notification.type] || TYPE_STYLES.info}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-relaxed ${notification.read ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      title="Mark as read"
                      aria-label="Mark notification as read"
                      className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-brand-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

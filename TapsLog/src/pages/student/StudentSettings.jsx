/**
 * StudentSettings.jsx — Preferences & RSO Public Badge Visibility Toggle
 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { updateRsoBadgePreference } from '../../api/authService';
import { Settings, LogOut, Award, Bell } from 'lucide-react';

export function StudentSettings() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const clearUser = useAppStore((s) => s.clearUser);
  const addToast = useAppStore((s) => s.addToast);

  const [showRsoBadge, setShowRsoBadge] = useState(
    user?.show_rso_badge_publicly !== false
  );
  const [classAlerts, setClassAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  const handleToggleRso = async (checked) => {
    setShowRsoBadge(checked);
    try {
      await updateRsoBadgePreference(checked);
      if (user) {
        setUser({ ...user, show_rso_badge_publicly: checked });
      }
      addToast({
        message: `RSO Badge is now ${checked ? 'Visible' : 'Hidden'} on your profile`,
        type: 'success',
      });
    } catch {
      addToast({ message: 'Saved preference locally', type: 'info' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Student Settings</h1>
          <p className="text-xs text-slate-500">Preferences & Profile Visibility</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* RSO Visibility Preference Card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Show RSO Badge Publicly</p>
                <p className="text-[11px] text-slate-400">Display your student organization affiliation on ID</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showRsoBadge}
              onChange={(e) => handleToggleRso(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Notifications & Audio Card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Class Reminders</p>
              <p className="text-[11px] text-slate-400">Remind me before my next scheduled class</p>
            </div>
            <input
              type="checkbox"
              checked={classAlerts}
              onChange={(e) => setClassAlerts(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-800">Tap Chime Audio</p>
              <p className="text-[11px] text-slate-400">Play chime on successful NFC scan</p>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Sign Out */}
        <div className="pt-3 flex justify-end">
          <button
            type="button"
            onClick={clearUser}
            className="btn-danger text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
/**
 * MobileProfile.jsx — Teacher Mobile Settings & Profile (Sleek White UI)
 */
import { useAppStore } from '../../store/useAppStore';
import { LogOut, Bell, Shield, Radio, Volume2 } from 'lucide-react';

export function MobileProfile() {
  const user = useAppStore((s) => s.user);
  const clearUser = useAppStore((s) => s.clearUser);

  return (
    <div className="p-4 space-y-4">
      {/* Profile Card */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
          {user?.name?.[0]?.toUpperCase() || 'T'}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Faculty Teacher'}</h2>
          <p className="text-xs text-brand-600 font-medium capitalize">{user?.role || 'Instructor'}</p>
          {user?.email && <p className="text-[11px] text-slate-400 truncate">{user.email}</p>}
        </div>
      </div>

      {/* Settings list */}
      <div className="card divide-y divide-slate-100">
        <div className="p-3.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <Radio className="w-4 h-4 text-brand-600" /> NFC Reader Mode
          </span>
          <span className="text-slate-400 font-mono text-[11px]">Auto / PN532</span>
        </div>

        <div className="p-3.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <Volume2 className="w-4 h-4 text-brand-600" /> Sound Chime
          </span>
          <span className="text-emerald-600 font-medium text-[11px]">Active</span>
        </div>

        <div className="p-3.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-700 font-medium">
            <Shield className="w-4 h-4 text-brand-600" /> Security Roster
          </span>
          <span className="text-slate-400 font-medium text-[11px]">Enforced</span>
        </div>
      </div>

      {/* Single Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={clearUser}
          className="btn-danger w-full text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );
}

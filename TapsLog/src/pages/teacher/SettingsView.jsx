/**
 * SettingsView.jsx — Teacher POV: Settings (Sleek White UI)
 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, Radio, Volume2, Clock, LogOut, Save } from 'lucide-react';

export function SettingsView() {
  const clearUser = useAppStore((s) => s.clearUser);
  const addToast = useAppStore((s) => s.addToast);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [baudRate, setBaudRate] = useState('115200');
  const [autoAbsentMinutes, setAutoAbsentMinutes] = useState(45);

  const handleSave = (e) => {
    e.preventDefault();
    addToast({ message: 'Settings saved', type: 'success' });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">System Settings</h1>
          <p className="text-xs text-slate-500">Hardware & attendance rules</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Hardware Reader */}
        <div className="card p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-brand-600" /> NFC Hardware Reader
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Connection Port</label>
              <select className="input-field text-xs py-1.5">
                <option value="usb-serial">USB Serial Reader (PN532)</option>
                <option value="web-nfc">Web NFC (Chrome Mobile)</option>
                <option value="virtual">Virtual Simulator</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Baud Rate</label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(e.target.value)}
                className="input-field text-xs py-1.5"
              >
                <option value="9600">9600 bps</option>
                <option value="115200">115200 bps</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="card p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-600" /> Attendance Timing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(Number(e.target.value))}
                className="input-field text-xs"
                min={1}
                max={60}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Auto-Absent (Minutes)</label>
              <input
                type="number"
                value={autoAbsentMinutes}
                onChange={(e) => setAutoAbsentMinutes(Number(e.target.value))}
                className="input-field text-xs"
                min={10}
                max={120}
              />
            </div>
          </div>
        </div>

        {/* Audio */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800">Sound Effects</p>
            <p className="text-[11px] text-slate-400">Play acoustic chime on scan</p>
          </div>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="submit" className="btn-primary text-xs px-5 py-2">
            <Save className="w-3.5 h-3.5" /> Save
          </button>

          <button
            type="button"
            onClick={clearUser}
            className="btn-danger text-xs px-4 py-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}

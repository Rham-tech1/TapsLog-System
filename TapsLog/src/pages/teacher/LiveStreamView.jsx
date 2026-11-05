/**
 * LiveStreamView.jsx — Teacher POV: Live Attendance Radar (Sleek White UI)
 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime } from '../../lib/utils';
import { Search, Trash2, Radio, CheckCircle2, Clock, Users } from 'lucide-react';

export function LiveStreamView() {
  const attendanceFeed = useAppStore((s) => s.attendanceFeed);
  const clearFeed = useAppStore((s) => s.clearFeed);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const activeSession = useAppStore((s) => s.activeSession);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredFeed = attendanceFeed.filter((item) => {
    const matchesSearch =
      item.student?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.program?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && item.status === filterStatus;
  });

  const presentCount = attendanceFeed.filter((e) => e.status === 'PRESENT').length;
  const lateCount = attendanceFeed.filter((e) => e.status === 'LATE').length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Live Attendance Stream</h1>
              {sessionStatus === 'ACTIVE' && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Listening
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activeSession ? `${activeSession.subject} · ${activeSession.section}` : 'No active session'}
            </p>
          </div>
        </div>

        <button
          onClick={clearFeed}
          disabled={attendanceFeed.length === 0}
          className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 self-start sm:self-auto disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Stream
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 border-emerald-100 bg-emerald-50/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-700 leading-tight">{presentCount}</p>
            <p className="text-[11px] text-slate-500">Present</p>
          </div>
        </div>

        <div className="card p-3 border-amber-100 bg-amber-50/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-700 leading-tight">{lateCount}</p>
            <p className="text-[11px] text-slate-500">Late</p>
          </div>
        </div>

        <div className="card p-3 border-blue-100 bg-blue-50/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold text-brand-700 leading-tight">{attendanceFeed.length}</p>
            <p className="text-[11px] text-slate-500">Total Taps</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student..."
            className="input-field pl-9 text-xs py-1.5"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'PRESENT', 'LATE', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === status
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Stream List */}
      <div className="space-y-2">
        {filteredFeed.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-xs">
            {sessionStatus === 'ACTIVE' ? 'Listening for NFC taps…' : 'No active session'}
          </div>
        ) : (
          filteredFeed.map((event, idx) => (
            <div
              key={`${event.student}-${event.scanned_at}-${idx}`}
              className={`card p-3 flex items-center justify-between gap-3 border transition-all ${
                idx === 0 ? 'border-brand-200 bg-blue-50/30' : 'hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {event.student?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{event.student}</p>
                  <p className="text-[10px] text-slate-400">{event.program || 'BSIT-3A'} · ID: {event.student_id || '2023-10492'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={event.status || event.action} />
                <span className="text-[10px] text-slate-400 font-mono">{formatTime(event.scanned_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

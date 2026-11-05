/**
 * MobileScan.jsx — Production Native Android NFC Attendance Scanner
 * 
 * Features:
 * - Continuous Web NFC (NDEFReader) scan loop on Android Chrome over HTTPS.
 * - Extracts physical MIFARE Classic UID from event.serialNumber.
 * - Instant acoustic chimes + haptic vibration feedback.
 * - Option A1 Enforcement: Read-Only Observer Mode for Co-Teachers/Deans.
 * - Fallback manual entry for testing and desktop simulation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { useWebNFC } from '../../hooks/useWebNFC';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime, playBeep } from '../../lib/utils';
import {
  ScanLine,
  Loader2,
  Wifi,
  WifiOff,
  Eye,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';

export function MobileScan() {
  const [cardUID, setCardUID] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const { submitScan, loading } = useAttendance();
  const activeSession = useAppStore((s) => s.activeSession);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const user = useAppStore((s) => s.user);

  // Web NFC native hook
  const { isSupported, isScanning, nfcError, startScanning, stopScanning } = useWebNFC();

  // Option A1: Check if teacher is an Observer / Co-Teacher (Read-Only)
  const isObserver = activeSession?.teacher_role === 'CO_TEACHER' || activeSession?.teacher_role === 'OBSERVER';

  /**
   * Process a card scan (from Web NFC or manual input)
   */
  const processCardTap = useCallback(
    async (scannedUid) => {
      if (!scannedUid || !activeSession?.session_id) return;
      if (isObserver) return;

      try {
        const result = await submitScan({
          session_id: activeSession.session_id,
          card_uid: scannedUid.trim(),
        });
        setLastResult(result);
        setCardUID('');
      } catch (err) {
        setLastResult({
          error: true,
          message: err.friendlyMessage || err.message,
          scanned_at: new Date().toISOString(),
        });
      }
    },
    [activeSession, isObserver, submitScan]
  );

  /**
   * Continuous NFC scanning loop when session is ACTIVE
   */
  useEffect(() => {
    if (sessionStatus === 'ACTIVE' && isSupported && !isObserver) {
      startScanning({
        onReading: ({ serialNumber }) => {
          processCardTap(serialNumber);
        },
        onError: (err) => {
          console.warn('[NFC Scanner Warning]:', err.message);
        },
      });
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [sessionStatus, isSupported, isObserver, startScanning, stopScanning, processCardTap]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    processCardTap(cardUID);
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">NFC Tap Scanner</h2>
          {isSupported ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Wifi className="w-3 h-3" /> Hardware Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <WifiOff className="w-3 h-3" /> Manual Mode
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">Hold student card near back of phone</p>
      </div>

      {/* Option A1 Banner: Read-Only Observer Mode */}
      {isObserver && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Observer Mode Active (Option A1):</strong> You have full read-only access to live logs and reports. Only the primary instructor scans cards.
          </span>
        </div>
      )}

      {/* NFC Tap Target Zone */}
      <div
        className={`card p-8 flex flex-col items-center justify-center gap-3 text-center border-2 transition-all ${
          sessionStatus === 'ACTIVE' && !isObserver
            ? 'border-brand-500 bg-blue-50/30 shadow-md'
            : 'border-dashed border-slate-200 bg-slate-50/50'
        }`}
      >
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            sessionStatus === 'ACTIVE' && !isObserver
              ? 'bg-brand-600 text-white shadow-lg animate-pulse'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          <ScanLine className="w-10 h-10" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900">
            {isObserver
              ? 'Observer Mode'
              : sessionStatus === 'ACTIVE'
              ? isScanning
                ? 'NFC Antenna Active'
                : 'Session Active'
              : 'Session Inactive'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isObserver
              ? 'Monitoring live stream'
              : sessionStatus === 'ACTIVE'
              ? 'Tap physical card to back of phone'
              : 'Start class session to activate NFC'}
          </p>
        </div>
      </div>

      {/* NFC Error Alert */}
      {nfcError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{nfcError}</span>
        </div>
      )}

      {/* Last Result Feed */}
      {lastResult && (
        <div className="card p-3.5 animate-slide-up flex items-center justify-between border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-900">
              {lastResult.student || (lastResult.error ? 'Tap Error' : 'Card Scanned')}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              {lastResult.message || formatTime(lastResult.scanned_at)}
            </p>
          </div>
          {lastResult.error ? (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              FAILED
            </span>
          ) : (
            <StatusBadge status={lastResult.status || lastResult.action} />
          )}
        </div>
      )}

      {/* Manual Entry Form */}
      {!isObserver && (
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-2">
          <p className="section-header">Manual / Simulator Tap</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={cardUID}
              onChange={(e) => setCardUID(e.target.value.toUpperCase())}
              placeholder="e.g. 65:49:9D:00"
              className="input-field font-mono text-xs flex-1 uppercase"
              disabled={!activeSession || loading}
            />
            <button
              type="submit"
              disabled={!cardUID.trim() || !activeSession || loading}
              className="btn-primary text-xs px-4 shrink-0 font-medium"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tap'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
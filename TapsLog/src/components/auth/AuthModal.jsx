/**
 * AuthModal.jsx — UA TapsLog Authentication & Self-Registration Portal
 *
 * - Login & Register via authService.js (real Supabase API)
 * - Hardware NFC card binding via Web NFC or manual UID entry fallback
 * - NFC scan triggers for both Student and Faculty onboarding
 * - Strict @ua.edu.ph institutional email validation
 * - Tri-role onboarding: Student | Faculty | Admin Portal
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { loginUser, registerUser } from '../../api/authService';
import { useWebNFC } from '../../hooks/useWebNFC';
import { playBeep } from '../../lib/utils';
import {
  ScanLine,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  KeyRound,
  IdCard,
  Sparkles,
  Wifi,
  ChevronRight,
  School,
  Lock,
  Smartphone,
  Loader2,
  Radio,
  AlertTriangle
} from 'lucide-react';

const ALLOWED_DOMAIN = '@ua.edu.ph';

export function AuthModal() {
  const setUser = useAppStore((s) => s.setUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setStudentView = useAppStore((s) => s.setStudentView);
  const addToast = useAppStore((s) => s.addToast);
  const setTapFeedback = useAppStore((s) => s.setTapFeedback);

  // Views: 'select' | 'login' | 'register'
  const [view, setView] = useState('select');
  const [activeRole, setActiveRole] = useState('student'); // 'student' | 'teacher' | 'admin'

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Registration state
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    studentNumber: '',
    program: 'BS Information Technology',
    yearLevel: '3rd Year',
    facultyId: '',
    department: 'College of Information Technology',
  });
  const [scannedCardUid, setScannedCardUid] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);

  // Web NFC Hook
  const { isSupported: isNfcSupported, isScanning, startScanning, stopScanning } = useWebNFC();

  const triggerNfcScan = () => {
    if (!isNfcSupported) {
      addToast({
        message: 'Web NFC requires HTTPS on Android Chrome. Please open via https:// URL.',
        type: 'warning'
      });
      return;
    }

    startScanning({
      onReading: ({ serialNumber }) => {
        setScannedCardUid(serialNumber);
        setTapFeedback('success');
        addToast({ message: `Physical NFC Tag Detected: ${serialNumber}`, type: 'success' });
      },
      onError: (err) => {
        console.warn('[NFC Scan Warning]:', err.message);
        addToast({ message: err.message || 'NFC read error. Try holding card closer.', type: 'error' });
      },
    });
  };

  // Auto-start NFC scan when reaching the registration view (if supported)
  useEffect(() => {
    if (view === 'register' && isNfcSupported && !scannedCardUid) {
      triggerNfcScan();
    }

    return () => {
      stopScanning();
    };
  }, [view, isNfcSupported, scannedCardUid]);

  const handleRegChange = (e) => {
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
    setRegError(null);
  };

  // ==========================================================================
  // LOGIN SUBMIT
  // ==========================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await loginUser({ email: loginEmail.trim(), password: loginPassword });
      setUser(res.user);

      const userRole = (res.user.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        setCurrentView('admin');
      } else if (userRole === 'TEACHER') {
        setCurrentView('dashboard');
      } else {
        setStudentView('schedule');
      }

      playBeep('success');
      addToast({ message: `Welcome back, ${res.user.name}!`, type: 'success' });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed. Check your credentials.';
      setLoginError(errorMsg);
      playBeep('error');
    } finally {
      setLoginLoading(false);
    }
  };

  // ==========================================================================
  // REGISTRATION SUBMIT
  // ==========================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    if (!regForm.email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setRegError(`Institutional restriction: Email must end with ${ALLOWED_DOMAIN}`);
      setRegLoading(false);
      return;
    }

    if (!scannedCardUid.trim()) {
      setRegError('Hardware identity required: Please scan or enter your physical NFC Card UID.');
      setRegLoading(false);
      return;
    }

    try {
      const payload = {
        role: activeRole.toUpperCase(),
        email: regForm.email.trim(),
        password: regForm.password,
        first_name: regForm.firstName.trim(),
        last_name: regForm.lastName.trim(),
        card_uid: scannedCardUid.trim(),
        student_number: regForm.studentNumber.trim(),
        program: regForm.program,
        year_level: regForm.yearLevel,
        employee_id: regForm.facultyId.trim(),
        department: regForm.department,
      };

      const res = await registerUser(payload);
      setUser(res.user);

      if (res.user.role?.toUpperCase() === 'TEACHER') {
        setCurrentView('dashboard');
      } else {
        setStudentView('schedule');
      }

      playBeep('success');
      addToast({ message: 'Account registered & physical NFC card locked!', type: 'success' });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed.';
      setRegError(errorMsg);
      playBeep('error');
    } finally {
      setRegLoading(false);
    }
  };

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Brand Banner Header */}
        <div className="p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white backdrop-blur-xs">
                <ScanLine className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">TapsLog Portal</h2>
                <p className="text-[11px] text-blue-100">UA Attendance & NFC Identity</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 border border-white/20 text-blue-100">
              UA · 2026
            </span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* VIEW 1: ROLE SELECTION / MODE SELECT                                */}
        {/* ================================================================== */}
        {view === 'select' && (
          <div className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Select Access Role</h3>
              <p className="text-xs text-slate-500">Log in or self-register your school NFC ID</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveRole('student');
                  setLoginEmail('');
                  setLoginPassword('');
                  setView('login');
                }}
                className="p-3.5 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-blue-50/50 transition-all text-left flex flex-col justify-between group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900">Student</p>
                  <p className="text-[10px] text-slate-500">Student Portal</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole('teacher');
                  setLoginEmail('');
                  setLoginPassword('');
                  setView('login');
                }}
                className="p-3.5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex flex-col justify-between group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <School className="w-5 h-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900">Faculty</p>
                  <p className="text-[10px] text-slate-500">Course Studio</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  setLoginEmail('admin@ua.edu.ph');
                  setLoginPassword('');
                  setView('login');
                }}
                className="p-3.5 rounded-2xl border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/50 transition-all text-left flex flex-col justify-between group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900">Admin Portal</p>
                  <p className="text-[10px] text-slate-500">Telemetry & Cards</p>
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveRole('student');
                  setView('register');
                }}
                className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center justify-center gap-1 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New here? Register & lock your NFC Card</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* VIEW 2: LOGIN FORM                                                 */}
        {/* ================================================================== */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => setView('select')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className={`text-xs font-bold capitalize ${activeRole === 'admin' ? 'text-red-600' : 'text-brand-600'}`}>
                {activeRole} Login
              </span>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={`name${ALLOWED_DOMAIN}`}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className={`btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 ${
                activeRole === 'admin' ? 'bg-red-600 hover:bg-red-700' : ''
              }`}
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In to TapsLog'}
            </button>

            {activeRole !== 'admin' && (
              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    Register NFC ID
                  </button>
                </p>
              </div>
            )}
          </form>
        )}

        {/* ================================================================== */}
        {/* VIEW 3: SELF-REGISTRATION & HARDWARE CARD LOCKING                   */}
        {/* ================================================================== */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setView('select')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveRole('student')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeRole === 'student' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRole('teacher')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeRole === 'teacher' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Faculty
                </button>
              </div>
            </div>

            {regError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* Demographics */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">First Name</label>
                <input
                  type="text"
                  required
                  name="firstName"
                  value={regForm.firstName}
                  onChange={handleRegChange}
                  placeholder="Juan"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Last Name</label>
                <input
                  type="text"
                  required
                  name="lastName"
                  value={regForm.lastName}
                  onChange={handleRegChange}
                  placeholder="Dela Cruz"
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Role specific ID */}
            {activeRole === 'student' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Student Number</label>
                  <input
                    type="text"
                    required
                    name="studentNumber"
                    value={regForm.studentNumber}
                    onChange={handleRegChange}
                    placeholder="2023-10492"
                    className="input-field text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Year Level</label>
                  <select
                    name="yearLevel"
                    value={regForm.yearLevel}
                    onChange={handleRegChange}
                    className="input-field text-xs"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Faculty / Employee ID</label>
                  <input
                    type="text"
                    name="facultyId"
                    value={regForm.facultyId}
                    onChange={handleRegChange}
                    placeholder="FAC-ALFON"
                    className="input-field text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={regForm.department}
                    onChange={handleRegChange}
                    className="input-field text-xs"
                  />
                </div>
              </div>
            )}

            {/* Email & Password */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                  Institutional Email ({ALLOWED_DOMAIN})
                </label>
                <input
                  type="email"
                  required
                  name="email"
                  value={regForm.email}
                  onChange={handleRegChange}
                  placeholder={`username${ALLOWED_DOMAIN}`}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Password</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={regForm.password}
                  onChange={handleRegChange}
                  placeholder="Set account password"
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Hardware NFC Tap to Lock */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-brand-600" />
                  Physical NFC Card Lock ({activeRole === 'teacher' ? 'Faculty ID' : 'Student ID'})
                </span>
                {isNfcSupported ? (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isScanning ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'}`} />
                    {isScanning ? 'NFC Scanning Active' : 'Web NFC Ready'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    HTTPS Required
                  </span>
                )}
              </div>

              {/* Big Tap to Scan Button */}
              {isNfcSupported && (
                <button
                  type="button"
                  onClick={triggerNfcScan}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isScanning
                      ? 'bg-emerald-600 text-white shadow-sm animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>{isScanning ? 'Scanning... Hold ID Card to Back of Phone' : `⚡ Activate NFC Reader & Tap ${activeRole === 'teacher' ? 'Faculty' : 'Student'} ID Card`}</span>
                </button>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={scannedCardUid}
                  onChange={(e) => setScannedCardUid(e.target.value.toUpperCase())}
                  placeholder={isNfcSupported ? 'Card UID will appear here after tap...' : 'e.g. 65:49:9D:00'}
                  className="input-field font-mono text-xs flex-1 uppercase font-bold text-slate-900 bg-white"
                />
              </div>

              {!isHttps && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Android Chrome requires HTTPS for NFC:
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Open using <strong>https://192.168.254.111:5173</strong> (with <code>https://</code>, accept the self-signed certificate) so Chrome enables the NFC hardware reader.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                1 physical card locks immutably to your {activeRole === 'teacher' ? 'Faculty' : 'Student'} account.
              </p>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Registration & Lock Card'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;

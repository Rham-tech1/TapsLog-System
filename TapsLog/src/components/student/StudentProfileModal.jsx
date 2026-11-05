import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Award, BookOpen, Hash, UserPlus, Loader2, Layers, ShieldCheck } from 'lucide-react';
import rsoService from '../../api/rsoService';

export function StudentProfileModal({ student, onClose }) {
  const [showAppoint, setShowAppoint] = useState(false);
  const [rsoList, setRsoList] = useState([]);
  const [selectedRsoId, setSelectedRsoId] = useState('');
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTier, setCustomTier] = useState('COORDINATING');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rsoDetails, setRsoDetails] = useState(
    student?.rso_badge ? {
      rso_abbreviation: student.rso_badge,
      rso_name: student.rso_name,
      position: student.rso_position,
      tier: student.rso_tier || 'COORDINATING'
    } : null
  );

  const studentUserId = student?.user_id || student?.user_uuid || student?.student_id || student?.id;

  // Load student's active RSO details
  useEffect(() => {
    if (studentUserId) {
      rsoService.getStudentMembership(studentUserId).then((res) => {
        if (res.success && res.membership) {
          setRsoDetails(res.membership);
        }
      }).catch(() => {});
    }
  }, [studentUserId]);

  useEffect(() => {
    rsoService.getRsoList().then((res) => {
      if (res.success && res.organizations) {
        setRsoList(res.organizations);
        if (res.organizations.length > 0) {
          setSelectedRsoId(res.organizations[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRsoId) {
      rsoService.getPositions(selectedRsoId).then((res) => {
        if (res.success && res.positions) {
          setPositions(res.positions);
          const vacant = res.positions.filter(p => !p.holder_user_id);
          if (vacant.length > 0) {
            setSelectedPositionId(vacant[0].id);
            setIsCustom(false);
          } else {
            setIsCustom(true);
          }
        }
      }).catch(() => {
        setIsCustom(true);
      });
    }
  }, [selectedRsoId]);

  if (!student) return null;

  const handleAppoint = async (e) => {
    e.preventDefault();
    if (!selectedRsoId) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isCustom) {
        if (!customTitle.trim()) {
          setErrorMsg('Position title is required.');
          setSubmitting(false);
          return;
        }
        await rsoService.addPosition({
          rso_id: selectedRsoId,
          position_title: customTitle.trim(),
          tier: customTier,
          holder_user_id: studentUserId,
          user_id: studentUserId,
        });
      } else {
        await rsoService.updatePosition(selectedPositionId, {
          holder_user_id: studentUserId,
          user_id: studentUserId,
        });
      }

      // Refresh RSO details immediately to display badge
      if (studentUserId) {
        const memRes = await rsoService.getStudentMembership(studentUserId);
        if (memRes.success && memRes.membership) {
          setRsoDetails(memRes.membership);
        }
      }

      setSuccessMsg(`Successfully appointed ${student.full_name} to RSO!`);
      setTimeout(() => {
        setShowAppoint(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to appoint to RSO.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Top Accent Header */}
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 relative">
          <div className="w-20 h-20 rounded-2xl bg-slate-950 border-4 border-slate-900 -mt-10 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
            {student.full_name?.charAt(0) || 'S'}
          </div>

          <div className="mt-3">
            <h3 className="text-xl font-bold text-white">{student.full_name}</h3>
            <p className="text-xs text-slate-400 font-mono">{student.email || 'UA Verified Student'}</p>
          </div>

          <div className="mt-5 space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-400" /> School ID Number
              </span>
              <span className="font-mono font-semibold text-slate-200">
                {student.student_number || student.student_id || 'N/A'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Academic Program
              </span>
              <span className="font-medium text-slate-200">
                {student.program || 'N/A'} {student.year_level ? `(Year ${student.year_level})` : ''}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Physical NFC Card
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bound & Active
              </span>
            </div>

            {/* RSO Leadership & Hierarchy Badge */}
            {rsoDetails && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-400 shrink-0">
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/80 border border-blue-700 text-[10px] font-bold text-blue-300">
                        {rsoDetails.rso_abbreviation || rsoDetails.rso_badge}
                      </span>
                      <p className="text-xs font-bold text-white">
                        {rsoDetails.position || rsoDetails.rso_position}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                      {rsoDetails.rso_name || 'Extracurricular Organization'}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  (rsoDetails.tier || rsoDetails.rso_tier) === 'EXECUTIVE'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/80'
                    : 'bg-indigo-950/60 text-indigo-300 border-indigo-700/80'
                }`}>
                  {(rsoDetails.tier || rsoDetails.rso_tier || 'COORDINATING')}
                </span>
              </div>
            )}
          </div>

          {/* Appoint / Invite to RSO Section */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            {!showAppoint ? (
              <button
                onClick={() => setShowAppoint(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <UserPlus className="w-4 h-4" /> Appoint / Invite to RSO
              </button>
            ) : (
              <form onSubmit={handleAppoint} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Appoint to RSO Leadership
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAppoint(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {successMsg && (
                  <p className="text-xs text-emerald-400 font-semibold">{successMsg}</p>
                )}
                {errorMsg && (
                  <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Organization</label>
                  <select
                    value={selectedRsoId}
                    onChange={(e) => setSelectedRsoId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-blue-500"
                  >
                    {rsoList.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Position Mode</label>
                  <button
                    type="button"
                    onClick={() => setIsCustom(!isCustom)}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    {isCustom ? '← Pick Existing Slot' : '+ Custom Position'}
                  </button>
                </div>

                {!isCustom && positions.length > 0 ? (
                  <div>
                    <select
                      value={selectedPositionId}
                      onChange={(e) => setSelectedPositionId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-blue-500"
                    >
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.position_title} ({p.tier}) {p.holder_user_id ? '• Occupied' : '• Vacant'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. Sports Coordinator, Dev Lead"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      {['EXECUTIVE', 'COORDINATING'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCustomTier(t)}
                          className={`flex-1 py-1 rounded text-[10px] font-semibold transition ${
                            customTier === t
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Appointment'}
                </button>
              </form>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-medium text-xs transition-all"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentProfileModal;

/**
 * RsoGovernance.jsx - Full RSO Governance Portal
 * Phase 3.1: Two-tier hierarchy, position management, advisor offboarding, RSO lifecycle.
 */
import React, { useState, useEffect } from 'react';
import {
  Award, Users, Calendar, KeyRound, Download, Plus, Radio,
  Clock, MapPin, CheckCircle2, AlertCircle, ShieldAlert, Loader2, X,
  UserCheck, Trash2, GraduationCap, Shield, RefreshCw, ChevronRight,
  Crown, Layers, Star, Settings
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import rsoService from '../../api/rsoService';
import reportService from '../../api/reportService';
import adminService from '../../api/adminService';
import { HierarchyTree } from '../../components/rso/HierarchyTree';

function formatDate(dateStr) {
  if (!dateStr) return 'TBA';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RsoGovernance() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);

  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';

  // ── Core State ──
  const [organizations, setOrganizations] = useState([]);
  const [selectedRso, setSelectedRso] = useState(null);
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [hierarchy, setHierarchy] = useState([]);
  const [positions, setPositions] = useState([]);
  const [usePositions, setUsePositions] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  // ── Faculty Passcode Claim Modal ──
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPasscode, setClaimPasscode] = useState('');
  const [claiming, setClaiming] = useState(false);

  // ── Admin: Create RSO Modal ──
  const [showCreateRsoModal, setShowCreateRsoModal] = useState(false);
  const [rsoForm, setRsoForm] = useState({ name: '', abbreviation: '', description: '', advisor_passcode: '' });
  const [submittingRso, setSubmittingRso] = useState(false);

  // ── Admin: Assign Advisor Modal ──
  const [showAssignAdvisorModal, setShowAssignAdvisorModal] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [assigningAdvisor, setAssigningAdvisor] = useState(false);

  // ── Admin: Delete RSO Confirm ──
  const [showDeleteRsoConfirm, setShowDeleteRsoConfirm] = useState(false);
  const [deletingRso, setDeletingRso] = useState(false);

  // ── Admin: Unassign Advisor ──
  const [unassigningAdvisor, setUnassigningAdvisor] = useState(false);

  // ── Create Event Modal ──
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '', description: '',
    event_date: new Date().toISOString().slice(0, 10),
    event_time: '13:00', location: 'St. Thomas Hall',
  });

  // ── NFC Terminal State ──
  const [selectedEventForTerminal, setSelectedEventForTerminal] = useState(null);
  const [cardUidInput, setCardUidInput] = useState('');
  const [tapLogs, setTapLogs] = useState([]);
  const [tapFeedback, setTapFeedback] = useState(null);

  // ── Lifecycle ──
  useEffect(() => { loadOrganizations(); }, []);
  useEffect(() => {
    if (selectedRso?.id) {
      loadHierarchy(selectedRso.id);
      loadEvents(selectedRso.id);
    }
  }, [selectedRso?.id]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const res = await rsoService.getRsoList();
      if (res.success) {
        // Teacher filter: only orgs where they are adviser
        let orgs = res.organizations || [];
        if (isTeacher) {
          orgs = orgs.filter(org =>
            org.advisor_email === user?.email ||
            org.advisor_id === user?.id
          );
        }
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedRso) setSelectedRso(orgs[0]);
      }
    } catch (err) {
      console.error('[RSO List Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchy = async (rsoId) => {
    try {
      setHierarchyLoading(true);
      // Try new positions endpoint first
      try {
        const posRes = await rsoService.getPositions(rsoId);
        if (posRes.success && posRes.positions && posRes.positions.length > 0) {
          setPositions(posRes.positions);
          setUsePositions(true);
          return;
        }
      } catch (_) { /* fall through to legacy */ }
      // Fallback: legacy hierarchy
      const res = await rsoService.getHierarchy(rsoId);
      if (res.success) {
        setHierarchy(res.hierarchy || []);
        setUsePositions(false);
      }
    } catch (err) {
      console.error('[Hierarchy Error]:', err);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const loadEvents = async (rsoId) => {
    try {
      const res = await rsoService.getRsoEvents(rsoId);
      if (res.success) setEvents(res.events || []);
    } catch (err) { console.error('[Events Error]:', err); }
  };

  const handleSeedPositions = async () => {
    if (!selectedRso?.id) return;
    try {
      const res = await rsoService.seedPositions(selectedRso.id);
      if (res.success) {
        setPositions(res.positions || []);
        setUsePositions(true);
        if (addToast) addToast({ message: 'Default positions seeded successfully.', type: 'success' });
      }
    } catch (err) {
      if (addToast) addToast({ message: 'Failed to seed positions.', type: 'error' });
    }
  };

  const handleClaimAdvisor = async () => {
    if (!claimPasscode.trim()) return;
    try {
      setClaiming(true);
      const res = await rsoService.claimAdvisor(selectedRso.id, user.id, claimPasscode.trim());
      if (res.success) {
        if (addToast) addToast({ message: res.message || 'Advisership claimed!', type: 'success' });
        setShowClaimModal(false);
        setClaimPasscode('');
        await loadOrganizations();
        await loadHierarchy(selectedRso.id);
      }
    } catch (err) {
      if (addToast) addToast({ message: err?.response?.data?.message || 'Invalid passcode.', type: 'error' });
    } finally { setClaiming(false); }
  };

  const handleCreateRso = async () => {
    if (!rsoForm.name || !rsoForm.abbreviation) return;
    try {
      setSubmittingRso(true);
      const res = await rsoService.createRso({
        name: rsoForm.name, abbreviation: rsoForm.abbreviation,
        description: rsoForm.description, advisor_passcode: rsoForm.advisor_passcode || undefined,
      });
      if (res.success) {
        if (addToast) addToast({ message: `${rsoForm.name} created successfully.`, type: 'success' });
        setShowCreateRsoModal(false);
        setRsoForm({ name: '', abbreviation: '', description: '', advisor_passcode: '' });
        await loadOrganizations();
      }
    } catch (err) {
      if (addToast) addToast({ message: err?.response?.data?.message || 'Failed to create RSO.', type: 'error' });
    } finally { setSubmittingRso(false); }
  };

  const handleLoadFaculty = async () => {
    try {
      setLoadingFaculty(true);
      const res = await adminService.getUsers({ role: 'TEACHER' });
      if (res.success) setFacultyList(res.users || []);
    } catch (err) { console.error('[Faculty Load Error]:', err); }
    finally { setLoadingFaculty(false); }
  };

  const handleAssignAdvisor = async () => {
    if (!selectedFacultyId) return;
    try {
      setAssigningAdvisor(true);
      const res = await rsoService.assignAdvisor(selectedRso.id, selectedFacultyId);
      if (res.success) {
        if (addToast) addToast({ message: res.message || 'Advisor assigned.', type: 'success' });
        setShowAssignAdvisorModal(false);
        setSelectedFacultyId('');
        await loadOrganizations();
        await loadHierarchy(selectedRso.id);
      }
    } catch (err) {
      if (addToast) addToast({ message: err?.response?.data?.message || 'Failed to assign advisor.', type: 'error' });
    } finally { setAssigningAdvisor(false); }
  };

  const handleUnassignAdvisor = async () => {
    if (!selectedRso?.id) return;
    if (!confirm(`Unassign the faculty adviser from ${selectedRso.name}? The RSO will be preserved.`)) return;
    try {
      setUnassigningAdvisor(true);
      const res = await rsoService.unassignAdvisor(selectedRso.id);
      if (res.success) {
        if (addToast) addToast({ message: 'Faculty adviser unassigned.', type: 'success' });
        await loadOrganizations();
        await loadHierarchy(selectedRso.id);
      }
    } catch (err) {
      if (addToast) addToast({ message: 'Failed to unassign advisor.', type: 'error' });
    } finally { setUnassigningAdvisor(false); }
  };

  const handleDeleteRso = async () => {
    if (!selectedRso?.id) return;
    try {
      setDeletingRso(true);
      const res = await rsoService.deleteRso(selectedRso.id);
      if (res.success) {
        if (addToast) addToast({ message: res.message || 'RSO deleted.', type: 'success' });
        setShowDeleteRsoConfirm(false);
        setSelectedRso(null);
        await loadOrganizations();
      }
    } catch (err) {
      if (addToast) addToast({ message: 'Failed to delete RSO.', type: 'error' });
    } finally { setDeletingRso(false); }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.event_date) return;
    try {
      const res = await rsoService.createEvent(selectedRso.id, { ...eventForm, created_by: user.id });
      if (res.success) {
        if (addToast) addToast({ message: 'Event created!', type: 'success' });
        setShowCreateEventModal(false);
        setEventForm({ name: '', description: '', event_date: new Date().toISOString().slice(0, 10), event_time: '13:00', location: 'St. Thomas Hall' });
        await loadEvents(selectedRso.id);
      }
    } catch (err) {
      if (addToast) addToast({ message: 'Failed to create event.', type: 'error' });
    }
  };

  const handleEventTap = async (e) => {
    e.preventDefault();
    if (!cardUidInput.trim() || !selectedEventForTerminal) return;
    try {
      const res = await rsoService.scanEventTap(selectedEventForTerminal.id, cardUidInput.trim());
      const fb = { type: res.success ? 'success' : 'error', message: res.message };
      setTapFeedback(fb);
      if (res.success) {
        setTapLogs(prev => [{ ...res, uid: cardUidInput.trim(), time: new Date().toLocaleTimeString() }, ...prev]);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Tap error.';
      setTapFeedback({ type: 'error', message: msg });
    } finally {
      setCardUidInput('');
      setTimeout(() => setTapFeedback(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedAdvisorName = selectedRso?.advisor_name || null;
  const selectedAdvisorEmail = selectedRso?.advisor_email || null;
  const canManageHierarchy = isAdmin || (isTeacher && selectedRso?.advisor_email === user?.email);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">RSO Governance</h1>
            <p className="text-xs text-slate-500">Registered Student Organizations · UA Campus</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateRsoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Create RSO
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Org List Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Organizations ({organizations.length})</p>
          {organizations.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
              {isTeacher ? 'No organizations assigned to you.' : 'No organizations found.'}
            </div>
          ) : organizations.map(org => (
            <button
              key={org.id}
              onClick={() => setSelectedRso(org)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedRso?.id === org.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  selectedRso?.id === org.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {org.abbreviation?.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{org.name}</p>
                  <p className="text-[10px] text-slate-400">{org.member_count || 0} members</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Main Panel */}
        {selectedRso ? (
          <div className="lg:col-span-3 space-y-4">
            {/* RSO Header Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedRso.name}</h2>
                  <p className="text-xs text-slate-500">{selectedRso.description}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                  {selectedRso.abbreviation}
                </span>
              </div>

              {/* Faculty Adviser Row */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Faculty Adviser</p>
                    {selectedAdvisorEmail ? (
                      <p className="text-xs font-bold text-slate-800">{selectedAdvisorName || selectedAdvisorEmail}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No adviser assigned</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && selectedAdvisorEmail && (
                    <button
                      onClick={handleUnassignAdvisor}
                      disabled={unassigningAdvisor}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                    >
                      {unassigningAdvisor ? 'Ending...' : 'End Term'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => { setShowAssignAdvisorModal(true); handleLoadFaculty(); }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      {selectedAdvisorEmail ? 'Reassign' : 'Assign'}
                    </button>
                  )}
                  {isTeacher && !selectedAdvisorEmail && (
                    <button
                      onClick={() => setShowClaimModal(true)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                      <KeyRound className="w-3 h-3" /> Claim Advisership
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Actions Row */}
              {isAdmin && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSeedPositions}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <Crown className="w-3 h-3" /> Seed Default Positions
                  </button>
                  <button
                    onClick={() => { loadHierarchy(selectedRso.id); loadEvents(selectedRso.id); }}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  <button
                    onClick={() => setShowDeleteRsoConfirm(true)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Delete RSO
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'hierarchy', label: 'Org Chart', Icon: Layers },
                { id: 'events',    label: 'Events',    Icon: Calendar },
                { id: 'terminal',  label: 'NFC Terminal', Icon: Radio },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white min-h-[300px]">
              {activeTab === 'hierarchy' && (
                hierarchyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <HierarchyTree
                    rsoId={selectedRso.id}
                    members={hierarchy}
                    positions={positions}
                    usePositions={usePositions}
                    canManage={canManageHierarchy}
                    onRefresh={() => loadHierarchy(selectedRso.id)}
                  />
                )
              )}

              {activeTab === 'events' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campus Events ({events.length})</p>
                    {(isAdmin || canManageHierarchy) && (
                      <button
                        onClick={() => setShowCreateEventModal(true)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        <Plus className="w-3 h-3" /> Create Event
                      </button>
                    )}
                  </div>
                  {events.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No events scheduled for {selectedRso.name} yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map(evt => (
                        <div key={evt.id} className="p-3 rounded-xl border border-slate-200 hover:border-blue-200 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{evt.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <Calendar className="w-3 h-3" /> {formatDate(evt.event_date)}
                                </span>
                                {evt.event_time && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <Clock className="w-3 h-3" /> {evt.event_time}
                                  </span>
                                )}
                                {evt.location && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <MapPin className="w-3 h-3" /> {evt.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {evt.attendance_count || 0} tapped in
                              </span>
                              <button
                                onClick={() => { setSelectedEventForTerminal(evt); setActiveTab('terminal'); }}
                                className="block mt-1 text-[11px] text-blue-600 hover:underline"
                              >
                                Open Terminal →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'terminal' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900">NFC Event Terminal</h3>
                  </div>

                  {!selectedEventForTerminal ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Select an event to start scanning:</p>
                      {events.map(evt => (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEventForTerminal(evt)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"
                        >
                          <p className="text-xs font-bold text-slate-900">{evt.name}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(evt.event_date)}</p>
                        </button>
                      ))}
                      {events.length === 0 && <p className="text-xs text-slate-400 italic">No events available. Create an event first.</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedEventForTerminal.name}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(selectedEventForTerminal.event_date)}</p>
                        </div>
                        <button onClick={() => setSelectedEventForTerminal(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {tapFeedback && (
                        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                          tapFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {tapFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {tapFeedback.message}
                        </div>
                      )}

                      <form onSubmit={handleEventTap} className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Card UID or scan via NFC..."
                          value={cardUidInput}
                          onChange={e => setCardUidInput(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                        >
                          Tap In
                        </button>
                      </form>

                      {tapLogs.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {tapLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                              <div>
                                <p className="text-xs font-bold text-slate-900">{log.user?.full_name || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{log.uid}</p>
                              </div>
                              <span className="text-[10px] text-emerald-700 font-mono">{log.time}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-400">Select an organization from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Faculty Passcode Claim */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowClaimModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Claim Advisership</h3>
            </div>
            <p className="text-xs text-slate-500">Enter the designated advisor passcode for <span className="font-semibold">{selectedRso?.name}</span>.</p>
            <input
              type="password"
              placeholder="Advisor passcode"
              value={claimPasscode}
              onChange={e => setClaimPasscode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClaimAdvisor()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowClaimModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleClaimAdvisor}
                disabled={claiming || !claimPasscode.trim()}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {claiming ? 'Verifying...' : 'Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create RSO Modal */}
      {showCreateRsoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateRsoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Create New RSO</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Organization Name *</label>
                <input type="text" placeholder="e.g. UA Junior Philippine Computer Society"
                  value={rsoForm.name} onChange={e => setRsoForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Abbreviation *</label>
                <input type="text" placeholder="e.g. JPCS"
                  value={rsoForm.abbreviation} onChange={e => setRsoForm(f => ({ ...f, abbreviation: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Advisor Passcode</label>
                <input type="text" placeholder="Optional"
                  value={rsoForm.advisor_passcode} onChange={e => setRsoForm(f => ({ ...f, advisor_passcode: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <textarea rows={2} placeholder="Brief mission statement"
                  value={rsoForm.description} onChange={e => setRsoForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateRsoModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleCreateRso}
                disabled={submittingRso || !rsoForm.name || !rsoForm.abbreviation}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingRso ? 'Creating...' : 'Create RSO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Advisor Modal */}
      {showAssignAdvisorModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAssignAdvisorModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Assign Faculty Adviser</h3>
            {loadingFaculty ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
            ) : (
              <select
                value={selectedFacultyId}
                onChange={e => setSelectedFacultyId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">Select faculty member...</option>
                {facultyList.map(f => (
                  <option key={f.id} value={f.id}>{f.name || f.email} ({f.email})</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAssignAdvisorModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleAssignAdvisor}
                disabled={assigningAdvisor || !selectedFacultyId}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {assigningAdvisor ? 'Assigning...' : 'Assign Adviser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateEventModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Create Campus Event</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Event Name *</label>
                <input type="text" placeholder="e.g. UA Dev Summit 2026"
                  value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date *</label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                  <input type="time" value={eventForm.event_time} onChange={e => setEventForm(f => ({ ...f, event_time: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Location</label>
                <input type="text" placeholder="e.g. UA Gymnasium"
                  value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateEventModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleCreateEvent}
                disabled={!eventForm.name || !eventForm.event_date}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete RSO Confirm */}
      {showDeleteRsoConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDeleteRsoConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete RSO?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">
                You are about to permanently delete <span className="font-bold">{selectedRso?.name}</span> and all its associated memberships, positions, and events.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteRsoConfirm(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleDeleteRso}
                disabled={deletingRso}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deletingRso ? 'Deleting...' : 'Yes, Delete RSO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RsoGovernance;

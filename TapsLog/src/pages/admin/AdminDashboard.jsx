import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CreditCard,
  Activity,
  Clock,
  Search,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import adminService from '../../api/adminService';
import reportService from '../../api/reportService';

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

export function AdminDashboard() {
  const [telemetry, setTelemetry] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [unbindingUserId, setUnbindingUserId] = useState(null);
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState(null);

  useEffect(() => {
    loadTelemetry();
    loadUsers();
  }, []);

  const loadTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await adminService.getTelemetry();
      if (res.success && res.telemetry) {
        setTelemetry(res.telemetry);
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const loadUsers = async (query = searchQuery, role = selectedRoleFilter) => {
    setLoadingUsers(true);
    try {
      const res = await adminService.getUsers(query, role);
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers(searchQuery, selectedRoleFilter);
  };

  const handleRoleFilterSelect = (role) => {
    setSelectedRoleFilter(role);
    loadUsers(searchQuery, role);
  };

  const handleUnbindCard = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to unbind the NFC card from ${userEmail}? The card will be permanently deactivated for this user.`)) {
      return;
    }

    setUnbindingUserId(userId);
    try {
      const res = await adminService.unbindCard(userId);
      if (res.success) {
        alert(res.message);
        await Promise.all([loadTelemetry(), loadUsers()]);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to unbind NFC card.');
    } finally {
      setUnbindingUserId(null);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setRoleUpdatingUserId(targetUserId);
    try {
      const res = await adminService.updateUserRole(targetUserId, newRole);
      if (res.success) {
        await Promise.all([loadTelemetry(), loadUsers()]);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update user role.');
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  const handleExportMasterExcel = async () => {
    setExportingExcel(true);
    try {
      await reportService.downloadMasterExcel();
    } catch (err) {
      alert('Failed to export master university report.');
    } finally {
      setExportingExcel(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Admin Control Portal</h1>
            <p className="text-xs text-slate-500">System telemetry, card security management, and university directory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadTelemetry();
              loadUsers();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh Registry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportMasterExcel}
            disabled={exportingExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{exportingExcel ? 'Exporting...' : 'Master Excel Export'}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loadingTelemetry ? '...' : telemetry?.totalUsers || 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Faculty, Students & Admins</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active NFC Cards</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loadingTelemetry ? '...' : telemetry?.activeNfcCards || 0}
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-semibold">1-Card = 1-Account Locked</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Daily NFC Taps</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loadingTelemetry ? '...' : telemetry?.dailyTaps || 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Academic + RSO events today</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Backend Uptime</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {loadingTelemetry ? '...' : formatUptime(telemetry?.systemUptimeSeconds)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Node.js Express Process</p>
        </div>
      </div>

      {/* User Management Section */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {['', 'STUDENT', 'TEACHER', 'ADMIN'].map((r) => (
              <button
                key={r || 'ALL'}
                onClick={() => handleRoleFilterSelect(r)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  selectedRoleFilter === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {r || 'All Roles'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email, name, student ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
            />
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading university user directory...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No matching user accounts found.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Profile Details</th>
                  <th className="py-3 px-4">NFC Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={roleUpdatingUserId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                          u.role === 'ADMIN'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : u.role === 'TEACHER'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {u.details ? (
                        u.role === 'TEACHER' ? (
                          <div>
                            <div>{u.details.department || 'Faculty'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.details.employee_id}</div>
                          </div>
                        ) : u.role === 'STUDENT' ? (
                          <div>
                            <div>{u.details.program || 'Student'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {u.details.student_number || 'N/A'} {u.details.year_level ? `• Yr ${u.details.year_level}` : ''}
                            </div>
                          </div>
                        ) : (
                          'System Administrator'
                        )
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.nfcCard ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Card Bound
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No Card Bound</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.nfcCard ? (
                        <button
                          onClick={() => handleUnbindCard(u.id, u.email)}
                          disabled={unbindingUserId === u.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] border border-red-200 transition-all disabled:opacity-50"
                          title="1-Click Card Unbind"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>{unbindingUserId === u.id ? 'Unbinding...' : 'Unbind NFC'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
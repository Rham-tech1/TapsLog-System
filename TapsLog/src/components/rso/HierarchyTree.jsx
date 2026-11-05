/**
 * HierarchyTree.jsx - Two-Tier RSO Org Chart
 * EXECUTIVE BOARD (top) → horizontal divider → COORDINATING COUNCIL (bottom)
 * Supports: position cards, role dropdowns, vacate/remove, add position modals.
 */
import React, { useState } from 'react';
import {
  Shield, Crown, Award, Users, ChevronDown, UserCheck,
  GraduationCap, Plus, Trash2, Star, Layers
} from 'lucide-react';
import rsoService from '../../api/rsoService';

// Legacy positions used if new positions endpoint is unavailable
const LEGACY_POSITIONS = ['Member', 'Committee Head', 'Vice President', 'President', 'Adviser'];

// Default executive preset titles
const DEFAULT_EXECUTIVE_TITLES = [
  'President', 'Internal Vice President', 'External Vice President',
  'Secretary', 'Treasurer', 'Auditor'
];

/** Position card for a named two-tier slot */
function PositionCard({
  position,     // { id, position_title, tier, holder_user_id, holder_name, holder_email, is_custom, parent_officer_id }
  rsoId,
  canManage,
  onRefresh,
  execPositions, // array of executive positions (for parent dropdown in coordinating)
}) {
  const [deleting, setDeleting] = useState(false);

  const isVacant = !position.holder_user_id;
  const isExec = position.tier === 'EXECUTIVE';

  const badgeStyle = isExec
    ? isVacant ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'
    : isVacant ? 'bg-slate-50 text-slate-300' : 'bg-blue-100 text-blue-700';

  const Icon = isExec ? Crown : Star;

  const handleDelete = async () => {
    if (!confirm(isVacant || !position.is_custom
      ? 'Vacate this position (clear the holder)?'
      : 'Delete this custom position?')) return;
    try {
      setDeleting(true);
      await rsoService.deletePosition(position.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to remove position.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`p-3 rounded-2xl border ${isVacant ? 'border-dashed border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white shadow-xs hover:border-blue-300'} transition-all min-w-[200px] max-w-[260px] flex-shrink-0`}>
      {/* Title Row */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{position.position_title}</span>
        {canManage && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Holder */}
      {isVacant ? (
        <p className="text-xs text-slate-400 italic">Vacant</p>
      ) : (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl ${badgeStyle} flex items-center justify-center font-bold text-xs shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{position.holder_name}</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{position.holder_email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Legacy member card (used when positions endpoint is unavailable) */
function LegacyMemberCard({ member, rsoId, canManage, onRefresh }) {
  const [updating, setUpdating] = useState(false);

  const badgeMap = {
    Adviser:        { color: 'bg-indigo-100 text-indigo-700', Icon: GraduationCap },
    President:      { color: 'bg-amber-100 text-amber-700',   Icon: Crown        },
    'Vice President': { color: 'bg-blue-100 text-blue-700',   Icon: Shield       },
    'Committee Head': { color: 'bg-emerald-100 text-emerald-700', Icon: Award    },
  };
  const { color = 'bg-slate-100 text-slate-700', Icon = UserCheck } = badgeMap[member.position] || {};

  const handleChange = async (e) => {
    const newPos = e.target.value;
    try {
      setUpdating(true);
      await rsoService.updateMemberRole(rsoId, member.user_id, newPos);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update member role.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between gap-3 min-w-[240px]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{member.full_name}</p>
          <p className="text-[10px] text-slate-400 font-mono truncate">{member.email}</p>
          {member.student_number && (
            <p className="text-[10px] text-slate-500 font-mono">ID: {member.student_number}</p>
          )}
        </div>
      </div>
      {canManage && member.position !== 'Adviser' && (
        <select
          value={member.position}
          disabled={updating}
          onChange={handleChange}
          className="text-[11px] font-semibold py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-blue-500 transition-all shrink-0 cursor-pointer"
        >
          {LEGACY_POSITIONS.filter(p => p !== 'Adviser').map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Add Position Modal */
function AddPositionModal({ rsoId, tier, execPositions = [], onClose, onRefresh }) {
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      await rsoService.addPosition({
        rso_id: rsoId,
        position_title: title.trim(),
        tier,
        parent_officer_id: tier === 'COORDINATING' ? (parentId || null) : null,
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add position.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900">
          {tier === 'EXECUTIVE' ? '+ Add Executive Position' : '+ Add Council Position'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Position Title</label>
            <input
              autoFocus
              type="text"
              placeholder={tier === 'EXECUTIVE' ? 'e.g. External Relations Officer' : 'e.g. Sports Coordinator'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          {tier === 'COORDINATING' && execPositions.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Reports to (Executive Lead)</label>
              <select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">No specific lead</option>
                {execPositions.map(p => (
                  <option key={p.id} value={p.id}>{p.position_title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Position'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main HierarchyTree component.
 * Supports both new two-tier (positions) and legacy (members) modes.
 */
export function HierarchyTree({ rsoId, members = [], positions = [], onRefresh, canManage = false, usePositions = false }) {
  const [showAddExec, setShowAddExec] = useState(false);
  const [showAddCoord, setShowAddCoord] = useState(false);

  if (usePositions && positions.length > 0) {
    // --- TWO-TIER MODE ---
    const execPositions = positions.filter(p => p.tier === 'EXECUTIVE').sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
    const coordPositions = positions.filter(p => p.tier === 'COORDINATING');

    return (
      <div className="space-y-6">
        {/* Executive Board */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Board</span>
            </div>
            {canManage && (
              <button
                onClick={() => setShowAddExec(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
              >
                <Plus className="w-3 h-3" /> Add Executive Position
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {execPositions.length > 0 ? execPositions.map(pos => (
              <PositionCard
                key={pos.id}
                position={pos}
                rsoId={rsoId}
                canManage={canManage}
                onRefresh={onRefresh}
                execPositions={execPositions}
              />
            )) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                No executive positions defined. Click &ldquo;Seed Defaults&rdquo; or add manually.
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500">
            <Layers className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Coordinating Council</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
        </div>

        {/* Coordinating Council */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Coordinating Officers ({coordPositions.length})
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => setShowAddCoord(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <Plus className="w-3 h-3" /> Add Council Position
              </button>
            )}
          </div>

          {coordPositions.length > 0 ? (
            /* Group by parent executive */
            (() => {
              const groups = {};
              coordPositions.forEach(cp => {
                const parentKey = cp.parent_officer_id || '__none__';
                if (!groups[parentKey]) groups[parentKey] = [];
                groups[parentKey].push(cp);
              });
              return Object.entries(groups).map(([parentId, coords]) => {
                const parent = execPositions.find(e => e.id === parentId);
                return (
                  <div key={parentId} className="mb-4">
                    {parent && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Under {parent.position_title}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 pl-2 border-l-2 border-blue-100">
                      {coords.map(pos => (
                        <PositionCard
                          key={pos.id}
                          position={pos}
                          rsoId={rsoId}
                          canManage={canManage}
                          onRefresh={onRefresh}
                          execPositions={execPositions}
                        />
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
              No coordinating positions yet. Add council roles to build your org chart.
            </div>
          )}
        </div>

        {/* Add Position Modals */}
        {showAddExec && (
          <AddPositionModal
            rsoId={rsoId}
            tier="EXECUTIVE"
            execPositions={execPositions}
            onClose={() => setShowAddExec(false)}
            onRefresh={onRefresh}
          />
        )}
        {showAddCoord && (
          <AddPositionModal
            rsoId={rsoId}
            tier="COORDINATING"
            execPositions={execPositions}
            onClose={() => setShowAddCoord(false)}
            onRefresh={onRefresh}
          />
        )}
      </div>
    );
  }

  // --- LEGACY MODE (members-based, fallback) ---
  const adviser = members.find(m => m.position === 'Adviser');
  const president = members.find(m => m.position === 'President');
  const vps = members.filter(m => m.position === 'Vice President');
  const heads = members.filter(m => m.position === 'Committee Head');
  const generalMembers = members.filter(m => m.position === 'Member' || !m.position);

  return (
    <div className="space-y-6">
      {/* Faculty Adviser */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <GraduationCap className="w-4 h-4 text-indigo-600" /> Faculty Adviser
        </div>
        {adviser ? (
          <div className="max-w-md">
            <LegacyMemberCard member={adviser} rsoId={rsoId} canManage={canManage} onRefresh={onRefresh} />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 max-w-md">
            No verified Lead Faculty Adviser claimed yet.
          </div>
        )}
      </div>

      {/* Executive Board divider */}
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Board</span>
        <div className="flex-1 border-t border-dashed border-slate-200 ml-2" />
      </div>

      {/* President */}
      <div>
        {president ? (
          <div className="max-w-md">
            <LegacyMemberCard member={president} rsoId={rsoId} canManage={canManage} onRefresh={onRefresh} />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 max-w-md">
            No President assigned. Elevate an officer below.
          </div>
        )}
      </div>

      {/* Vice Presidents */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Shield className="w-4 h-4 text-blue-600" /> Vice President(s) ({vps.length})
        </div>
        {vps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vps.map(vp => <LegacyMemberCard key={vp.user_id} member={vp} rsoId={rsoId} canManage={canManage} onRefresh={onRefresh} />)}
          </div>
        ) : <p className="text-xs text-slate-400 italic">No Vice Presidents appointed.</p>}
      </div>

      {/* Coordinating Council divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t-2 border-dashed border-slate-200" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500">
          <Layers className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Coordinating Council</span>
        </div>
        <div className="flex-1 border-t-2 border-dashed border-slate-200" />
      </div>

      {/* Committee Heads */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Award className="w-4 h-4 text-emerald-600" /> Committee Heads ({heads.length})
        </div>
        {heads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {heads.map(h => <LegacyMemberCard key={h.user_id} member={h} rsoId={rsoId} canManage={canManage} onRefresh={onRefresh} />)}
          </div>
        ) : <p className="text-xs text-slate-400 italic">No Committee Heads assigned.</p>}
      </div>

      {/* General Members */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Users className="w-4 h-4 text-slate-600" /> General Members ({generalMembers.length})
        </div>
        {generalMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {generalMembers.map(m => <LegacyMemberCard key={m.user_id} member={m} rsoId={rsoId} canManage={canManage} onRefresh={onRefresh} />)}
          </div>
        ) : <p className="text-xs text-slate-400 italic">No general members joined yet.</p>}
      </div>
    </div>
  );
}

export default HierarchyTree;

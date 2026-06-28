import React, { useState, useEffect } from 'react';
import { useGroupStore } from '../store/groupStore';
import { GroupPoolsTab } from '../components/groups/GroupPoolsTab';
import { Gift, Sparkles, Folder } from 'lucide-react';

export function PoolsPage() {
  const { groups, syncFromSupabase } = useGroupStore();
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Sync groups on load
  useEffect(() => {
    syncFromSupabase();
  }, [syncFromSupabase]);

  // Set default group selection once groups are loaded
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  if (groups.length === 0) {
    return (
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center max-w-md mx-auto space-y-4 my-8">
        <div className="w-12 h-12 bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto text-indigo-400 border border-indigo-800/40">
          <Gift className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">No Groups Found</h3>
          <p className="text-xs text-slate-400">
            You must create a group in the <strong>Split Bills (Groups)</strong> tab before you can manage on-chain crowdfunding pools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Group selector */}
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-indigo-400" />
          <label className="text-xs font-semibold text-slate-300">Select Group:</label>
        </div>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {activeGroup ? (
        <GroupPoolsTab group={activeGroup} />
      ) : (
        <div className="text-center py-10 text-xs text-slate-400">
          Select a group from the list to load pools.
        </div>
      )}
    </div>
  );
}

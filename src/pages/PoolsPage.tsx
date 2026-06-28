import React, { useState, useEffect } from 'react';
import { useGroupStore } from '../store/groupStore';
import { GroupPoolsTab } from '../components/groups/GroupPoolsTab';
import { Gift, Folder } from 'lucide-react';

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
      <div className="bg-violet-50 p-6 rounded-2xl border border-violet-200 text-center max-w-md mx-auto space-y-4 my-8">
        <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto text-violet-500 border border-violet-200">
          <Gift className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-900">No Groups Found</h3>
          <p className="text-xs text-gray-500">
            Create a group in the <strong>Split Bills</strong> tab first to start managing crowdfunding pools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Group selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-violet-500" />
          <label className="text-xs font-semibold text-gray-700">Select Group:</label>
        </div>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-violet-600 font-bold focus:outline-none focus:ring-2 focus:ring-violet-400 transition cursor-pointer"
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
        <div className="text-center py-10 text-xs text-gray-400">
          Select a group from the list to load pools.
        </div>
      )}
    </div>
  );
}

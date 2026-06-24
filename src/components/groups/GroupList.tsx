import { useGroupStore } from '../../store/groupStore';
import { Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GroupList() {
  const { groups } = useGroupStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Groups</h2>
        <button
          onClick={() => navigate('new')}
          className="flex items-center gap-1 text-sm bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-200"
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">No groups yet</p>
          <p className="text-sm text-gray-500 mb-4 max-w-[200px]">
            Create a group to split expenses with friends.
          </p>
          <button
            onClick={() => navigate('new')}
            className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700"
          >
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(group.id)}
              className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {group.members.length} members · {group.expenses.length} expenses
              </p>
              <div className="flex gap-1 mt-3">
                {group.members.map((m) => (
                  <div
                    key={m.address}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
                    style={{ backgroundColor: m.avatarColor }}
                    title={m.name}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Group } from '../types';
import { GroupList } from '../components/groups/GroupList';
import { GroupDetail } from '../components/groups/GroupDetail';
import { AddExpense } from '../components/groups/AddExpense';
import { useGroupStore } from '../store/groupStore';
import { useWalletStore } from '../store/walletStore';

export function GroupPage() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const { createGroup } = useGroupStore();
  const { address } = useWalletStore();

  const handleCreateGroup = () => {
    if (!address) {
      alert('Please connect your wallet first!');
      return;
    }
    const name = prompt('Enter group name:');
    if (!name) return;

    // For demo purposes, we'll create a default group with the current user and a dummy user
    const groupId = createGroup(name, [
      { name: 'You', address, avatarColor: '#7C3AED' },
      { name: 'Alice', address: 'GALICE...DEMO', avatarColor: '#059669' },
      { name: 'Bob', address: 'GBOB...DEMO', avatarColor: '#D97706' },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      {selectedGroup ? (
        <GroupDetail
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          onAddExpense={() => setIsAddingExpense(true)}
        />
      ) : (
        <GroupList
          onSelectGroup={setSelectedGroup}
          onCreateNew={handleCreateGroup}
        />
      )}

      {isAddingExpense && selectedGroup && (
        <AddExpense
          group={selectedGroup}
          onClose={() => setIsAddingExpense(false)}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Group } from '../types';
import { GroupList } from '../components/groups/GroupList';
import { GroupDetail } from '../components/groups/GroupDetail';
import { AddExpense } from '../components/groups/AddExpense';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { useGroupStore } from '../store/groupStore';
import { useWalletStore } from '../store/walletStore';
import toast from 'react-hot-toast';

export function GroupPage() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const { createGroup } = useGroupStore();
  const { address } = useWalletStore();

  const handleCreateGroupClick = () => {
    if (!address) {
      toast.error('Please connect your wallet first!');
      return;
    }
    setIsCreatingGroup(true);
  };

  const handleCreateGroupSubmit = (name: string, members: any[]) => {
    createGroup(name, members);
    setIsCreatingGroup(false);
    toast.success('Group created successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
      {selectedGroup ? (
        <GroupDetail
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          onAddExpense={() => setIsAddingExpense(true)}
        />
      ) : (
        <GroupList
          onSelectGroup={setSelectedGroup}
          onCreateNew={handleCreateGroupClick}
        />
      )}

      {isAddingExpense && selectedGroup && (
        <AddExpense
          group={selectedGroup}
          onClose={() => setIsAddingExpense(false)}
        />
      )}

      {isCreatingGroup && (
        <CreateGroupModal
          onClose={() => setIsCreatingGroup(false)}
          onCreate={handleCreateGroupSubmit}
        />
      )}
    </div>
  );
}

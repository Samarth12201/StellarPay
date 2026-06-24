import { Routes, Route } from 'react-router-dom';
import { GroupList } from '../components/groups/GroupList';
import { GroupDetail } from '../components/groups/GroupDetail';
import { CreateGroup } from '../components/groups/CreateGroup';

export function GroupPage() {
  return (
    <div className="max-w-4xl mx-auto w-full relative">
      <Routes>
        <Route index element={<GroupList />} />
        <Route path="new" element={<CreateGroup />} />
        <Route path=":groupId" element={<GroupDetail />} />
      </Routes>
    </div>
  );
}

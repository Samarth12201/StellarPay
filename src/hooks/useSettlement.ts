import { useMemo } from 'react';
import { useGroupStore } from '../store/groupStore';
import { calculateSettlements, totalSpent, memberShares } from '../utils/settlement';
import { Settlement } from '../types';

export function useSettlement(groupId: string) {
  const { groups } = useGroupStore();
  const group = groups.find((g) => g.id === groupId);

  const settlements = useMemo<Settlement[]>(() => {
    if (!group) return [];
    return calculateSettlements(group.expenses, group.members);
  }, [group]);

  const total = useMemo(() => {
    if (!group) return 0;
    return totalSpent(group.expenses);
  }, [group]);

  const shares = useMemo(() => {
    if (!group) return {};
    return memberShares(group.expenses, group.members);
  }, [group]);

  return { settlements, total, shares, group };
}

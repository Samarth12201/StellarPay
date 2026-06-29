import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGroupStore } from '../store/groupStore';
import { useWalletStore } from '../store/walletStore';

export function useRealtimeGroups() {
  const { address } = useWalletStore();
  const { syncFromSupabase } = useGroupStore();

  useEffect(() => {
    if (!address || !supabase) return;

    let syncTimeout: NodeJS.Timeout;
    const triggerSync = () => {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncFromSupabase();
      }, 500); // Wait 500ms to ensure all related table inserts (like group_members) finish
    };

    // We subscribe to all changes on groups, expenses, and pools
    const channel = supabase
      .channel(`groups-sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pools' }, triggerSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, triggerSync)
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [address, syncFromSupabase]);
}

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGroupStore } from '../store/groupStore';
import { useWalletStore } from '../store/walletStore';

export function useRealtimeGroups() {
  const { address } = useWalletStore();
  const { syncFromSupabase } = useGroupStore();

  useEffect(() => {
    if (!address || !supabase) return;

    // We subscribe to all changes on groups, expenses, and pools
    // When a change occurs, we simply trigger a re-sync
    const channel = supabase
      .channel(`groups-sync`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pools' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        syncFromSupabase();
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [address, syncFromSupabase]);
}

import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { useWalletStore } from '../store/walletStore';

export function useInviteLink() {
  const { address } = useWalletStore();

  const generateInvite = async (groupId: string): Promise<string> => {
    const code = nanoid(8);
    if (!supabase) throw new Error('Supabase not initialized');
    await supabase.from('group_invitations').insert({
      id: nanoid(),
      group_id: groupId,
      invite_code: code,
      created_by: address ?? '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
    const url = `${window.location.origin}/invite/${code}`;
    return url;
  };

  const acceptInvite = async (code: string, memberName: string, memberAddress: string) => {
    // Look up invite
    if (!supabase) throw new Error('Supabase not initialized');
    const { data: invite } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (!invite) throw new Error('Invite not found or expired');
    if (invite.use_count >= invite.max_uses) throw new Error('Invite link has reached its limit');
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite link has expired');

    // Add member to group
    const memberId = nanoid();
    await supabase.from('group_members').insert({
      id: memberId,
      group_id: invite.group_id,
      name: memberName,
      address: memberAddress,
      avatarcolor: '#059669', // Match the database lowercase column name
    });

    // Increment use count
    await supabase
      .from('group_invitations')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    return invite.group_id as string;
  };

  return { generateInvite, acceptInvite };
}

import { useState, useMemo } from 'react';
import {
  Horizon, TransactionBuilder, Networks,
  BASE_FEE, Operation, Asset, Memo,
} from '@stellar/stellar-sdk';
import { useWallet } from './useWallet';
import { useWalletStore } from '../store/walletStore';
import { useGroupStore } from '../store/groupStore';
import { useRequestStore } from '../store/requestStore';
import { calculateSettlements, totalSpent, memberBalances } from '../utils/settlement';
import { Settlement } from '../types';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useGroupSettlement(groupId: string) {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { getGroup } = useGroupStore();
  const { addRequest } = useRequestStore();

  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const group = getGroup(groupId);

  const settlements = useMemo(
    () => (group ? calculateSettlements(group.expenses, group.members) : []),
    [group]
  );

  const myMember = useMemo(
    () => (group && address ? group.members.find((m) => m.address === address) ?? null : null),
    [group, address]
  );

  const myOutgoingSettlements = useMemo(
    () => settlements.filter((s) => s.fromAddress === address),
    [settlements, address]
  );

  const myIncomingSettlements = useMemo(
    () => settlements.filter((s) => s.toAddress === address),
    [settlements, address]
  );

  const total = useMemo(() => (group ? totalSpent(group.expenses) : 0), [group]);

  const balances = useMemo(
    () => (group ? memberBalances(group.members, group.expenses) : {}),
    [group]
  );

  const myBalance = useMemo(
    () => (myMember ? balances[myMember.id] ?? { paid: 0, owed: 0, net: 0 } : { paid: 0, owed: 0, net: 0 }),
    [myMember, balances]
  );

  // ── PAY: sends XLM on Stellar + saves receipt to Supabase ──
  const paySettlement = async (settlement: Settlement): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (settlement.fromAddress !== address) throw new Error('This is not your payment to make');
    if (!settlement.toAddress?.startsWith('G') || settlement.toAddress.length !== 56) {
      throw new Error(`${settlement.toName} has no valid Stellar address. Recreate the group with their G... key.`);
    }
    if (settlement.amount <= 0) throw new Error('Amount must be greater than 0');

    const key = `${settlement.from}-${settlement.to}`;
    setPaying(key);
    setError(null);

    try {
      const sourceAccount = await server.loadAccount(address);
      const memo = `${group?.name ?? 'Group'} split`.slice(0, 28);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({
          destination: settlement.toAddress,
          asset: Asset.native(),
          amount: settlement.amount.toFixed(7),
        }))
        .addMemo(Memo.text(memo))
        .setTimeout(30)
        .build();

      const xdr = tx.toEnvelope().toXDR('base64');
      const signedXDR = await signXdr(xdr);
      const signedTx = TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx);
      const txHash = response.hash;

      // Save paid receipt to Supabase — the RECEIVER will see this in their outgoing
      await addRequest({
        fromAddress: address,
        toAddress: settlement.toAddress,
        fromName: myMember?.name ?? settlement.fromName,
        amount: settlement.amount.toFixed(7),
        memo,
        groupId: group?.id,
        groupName: group?.name,
        status: 'paid',
        txHash,
      });

      return txHash;
    } catch (err: any) {
      const msg =
        err?.response?.data?.extras?.result_codes?.operations?.[0] ??
        err?.message ?? 'Transaction failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setPaying(null);
    }
  };

  // ── REQUEST: saves to Supabase so DEBTOR sees it in their inbox ──
  const sendPaymentRequest = async (settlement: Settlement): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (settlement.toAddress !== address) {
      throw new Error('You can only request payment for settlements where you are the creditor');
    }
    if (!settlement.fromAddress?.startsWith('G') || settlement.fromAddress.length !== 56) {
      throw new Error(`${settlement.fromName} has no Stellar address. Recreate the group with their G... key.`);
    }

    // toAddress = fromAddress (the debtor) — they see it in their inbox
    const requestId = await addRequest({
      fromAddress: address,              // creditor (me) — who is owed
      toAddress: settlement.fromAddress, // debtor — whose inbox this goes into
      fromName: myMember?.name ?? settlement.toName,
      amount: settlement.amount.toFixed(7),
      memo: `${group?.name ?? 'Group'} — payment request from ${myMember?.name ?? 'member'}`,
      groupId: group?.id,
      groupName: group?.name,
      status: 'pending',
    });
    return requestId;
  };

  // ── BULK REQUEST: send to all debtors at once ──
  const sendAllPaymentRequests = async (): Promise<number> => {
    if (!address) return 0;
    const myReceivables = settlements.filter((s) => s.toAddress === address);
    let count = 0;
    for (const s of myReceivables) {
      try {
        await sendPaymentRequest(s);
        count++;
      } catch {
        // skip invalid ones silently
      }
    }
    return count;
  };

  return {
    group, settlements, myMember,
    myOutgoingSettlements, myIncomingSettlements,
    myBalance, balances, total,
    paying, error,
    paySettlement,
    sendPaymentRequest,
    sendAllPaymentRequests,
  };
}

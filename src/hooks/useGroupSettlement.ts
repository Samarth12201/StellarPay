import { useState, useMemo } from 'react';
import {
  Horizon,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';
import { useWalletStore } from '../store/walletStore';
import { useWallet } from './useWallet';
import { useGroupStore } from '../store/groupStore';
import { useRequestStore } from '../store/requestStore';
import { calculateSettlements, totalSpent, memberBalance } from '../utils/settlement';
import { Settlement } from '../types';
import { WalletError } from '../errors/WalletError';
import { NetworkError } from '../errors/NetworkError';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useGroupSettlement(groupId: string) {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { getGroup, markExpensePaid } = useGroupStore();
  const { addRequest } = useRequestStore();

  const [paying, setPaying] = useState<string | null>(null); // settlement key being processed
  const [error, setError] = useState<string | null>(null);

  const group = getGroup(groupId);

  // ── Derived data ──────────────────────────────────────────

  const settlements = useMemo(
    () => (group ? calculateSettlements(group.expenses, group.members) : []),
    [group]
  );

  const myMember = useMemo(
    () => group?.members.find((m) => m.address === address) ?? null,
    [group, address]
  );

  // Settlements where the connected wallet needs to pay
  const mySettlements = useMemo(
    () => settlements.filter((s) => s.fromAddress === address),
    [settlements, address]
  );

  // Settlements where the connected wallet will receive
  const incomingSettlements = useMemo(
    () => settlements.filter((s) => s.toAddress === address),
    [settlements, address]
  );

  const total = useMemo(() => (group ? totalSpent(group.expenses) : 0), [group]);

  const myBalance = useMemo(() => {
    if (!myMember || !group) return { paid: 0, owed: 0, net: 0 };
    return memberBalance(myMember.id, group.expenses);
  }, [myMember, group]);

  // ── Core payment function ─────────────────────────────────

  /**
   * Pay a single settlement:
   * 1. Validates inputs
   * 2. Sends XLM on Stellar testnet
   * 3. Creates a PaymentRequest record so the receiver can see it
   * 4. Returns the transaction hash
   */
  const paySettlement = async (settlement: Settlement): Promise<string> => {
    if (!address) throw new WalletError('NOT_CONNECTED', 'Connect your wallet first.');
    if (!settlement.toAddress || !settlement.toAddress.startsWith('G')) {
      throw new Error(
        `Invalid destination address for ${settlement.toName}. ` +
        `Make sure you entered their full Stellar G... address when creating the group.`
      );
    }
    if (settlement.fromAddress !== address) {
      throw new Error("This isn't your payment to make.");
    }
    if (settlement.amount <= 0) {
      throw new Error('Settlement amount must be greater than 0.');
    }

    const settlementKey = `${settlement.from}-${settlement.to}`;
    setPaying(settlementKey);
    setError(null);

    try {
      // Step 1: Load source account
      const sourceAccount = await server.loadAccount(address).catch(() => {
        throw new NetworkError('HORIZON_UNAVAILABLE', 'Could not load your account. Check your connection.');
      });

      // Step 2: Build transaction
      const memo = `StellarPay: ${group?.name ?? 'Group'} settlement`;
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: settlement.toAddress,
            asset: Asset.native(),
            amount: settlement.amount.toFixed(7),
          })
        )
        .addMemo(Memo.text(memo.slice(0, 28)))
        .setTimeout(30)
        .build();

      // Step 3: Sign with wallet
      const xdr = tx.toEnvelope().toXDR('base64');
      let signedXDR: string;
      try {
        signedXDR = await signXdr(xdr);
      } catch (err: any) {
        const msg = String(err);
        if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('cancel')) {
          throw new WalletError('USER_REJECTED', 'You cancelled the transaction.');
        }
        throw new WalletError('NOT_CONNECTED', 'Wallet signing failed: ' + msg);
      }

      // Step 4: Submit to Stellar
      const signedTx = TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx).catch((err: any) => {
        throw NetworkError.fromHorizonError(err);
      });

      const txHash = response.hash;

      // Step 5: Create a PaymentRequest record so the RECEIVER can see this was paid
      // This is stored in Zustand (localStorage) — in production you'd use a shared DB or the contract
      addRequest({
        groupId: group?.id,
        groupName: group?.name,
        fromMemberId: myMember?.id ?? '',
        fromName: myMember?.name ?? settlement.fromName,
        fromAddress: address,          // payer — this is the connected wallet
        toAddress: settlement.toAddress, // receiver
        amount: settlement.amount.toFixed(7),
        memo: `${group?.name ?? 'Group'} settlement`,
        status: 'paid',                 // mark as paid immediately since we just sent it
        txHash,
      });

      // Step 6: Also create a "pending" version in the RECEIVER's inbox
      // (they will see this when they connect their wallet)
      addRequest({
        groupId: group?.id,
        groupName: group?.name,
        fromMemberId: myMember?.id ?? '',
        fromName: settlement.fromName,
        fromAddress: address,
        toAddress: settlement.toAddress,
        amount: settlement.amount.toFixed(7),
        memo: `${group?.name ?? 'Group'} — paid by ${settlement.fromName}`,
        status: 'paid',
        txHash,
      });

      return txHash;
    } finally {
      setPaying(null);
    }
  };

  // ── Send payment request without paying ──────────────────

  /**
   * Create a payment REQUEST for a settlement (instead of paying immediately).
   * The payer will see it in their inbox and can pay later.
   */
  const requestSettlement = (settlement: Settlement): string => {
    if (!address) throw new WalletError('NOT_CONNECTED', 'Connect your wallet first.');

    // Create request in payer's inbox
    const requestId = addRequest({
      groupId: group?.id,
      groupName: group?.name,
      fromMemberId: myMember?.id ?? '',
      fromName: settlement.toName,    // the person who is owed (requester)
      fromAddress: settlement.toAddress,
      toAddress: settlement.fromAddress, // payer must see this in their inbox
      amount: settlement.amount.toFixed(7),
      memo: `${group?.name ?? 'Group'} settlement`,
      status: 'pending',
    });

    return requestId;
  };

  // ── Request ALL settlements for this group ────────────────

  /**
   * After creating a group and adding expenses,
   * the group creator calls this to send payment requests
   * to every person who owes money.
   */
  const requestAllSettlements = (): number => {
    let count = 0;
    for (const s of settlements) {
      if (!s.paid) {
        requestSettlement(s);
        count++;
      }
    }
    return count;
  };

  return {
    group,
    settlements,
    mySettlements,
    incomingSettlements,
    myMember,
    myBalance,
    total,
    paying,
    error,
    paySettlement,
    requestSettlement,
    requestAllSettlements,
  };
}

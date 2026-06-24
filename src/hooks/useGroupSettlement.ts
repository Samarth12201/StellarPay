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
import { useWallet } from './useWallet';
import { useWalletStore } from '../store/walletStore';
import { useGroupStore } from '../store/groupStore';
import { useRequestStore } from '../store/requestStore';
import { calculateSettlements, totalSpent, memberNetBalance, memberBalances } from '../utils/settlement';
import { Settlement } from '../types';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL);

export function useGroupSettlement(groupId: string) {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { getGroup } = useGroupStore();
  const { addRequest, markPaid } = useRequestStore();

  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const group = getGroup(groupId);

  // ── Derived: all settlements for this group ───────────────
  const settlements = useMemo(
    () => (group ? calculateSettlements(group.expenses, group.members) : []),
    [group]
  );

  // ── Derived: who the connected wallet is in this group ───
  const myMember = useMemo(
    () => (group && address ? group.members.find((m) => m.address === address) ?? null : null),
    [group, address]
  );

  // ── Derived: settlements the connected wallet must pay ───
  const myOutgoingSettlements = useMemo(
    () => (address ? settlements.filter((s) => s.fromAddress === address) : []),
    [settlements, address]
  );

  // ── Derived: settlements the connected wallet will receive
  const myIncomingSettlements = useMemo(
    () => (address ? settlements.filter((s) => s.toAddress === address) : []),
    [settlements, address]
  );

  // ── Derived: total spent and per-member balances ─────────
  const total = useMemo(() => (group ? totalSpent(group.expenses) : 0), [group]);

  const balances = useMemo(
    () => (group ? memberBalances(group.members, group.expenses) : {}),
    [group]
  );

  const myBalance = useMemo(
    () => (myMember && balances[myMember.id]) ?? { paid: 0, owed: 0, net: 0 },
    [myMember, balances]
  );

  // ── ACTION 1: Pay a settlement immediately on-chain ───────
  /**
   * Sends XLM on Stellar Testnet and saves a paid record.
   * Called when the connected wallet IS the debtor (fromAddress === myAddress).
   */
  const paySettlement = async (settlement: Settlement): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (settlement.fromAddress !== address) {
      throw new Error("This is not your payment — you are not the debtor in this settlement.");
    }
    if (!settlement.toAddress || settlement.toAddress.length !== 56 || !settlement.toAddress.startsWith('G')) {
      throw new Error(
        `Cannot pay: ${settlement.toName} does not have a valid Stellar address. ` +
        `Ask them to share their G... public key.`
      );
    }
    if (settlement.amount <= 0) throw new Error('Settlement amount must be greater than 0');

    const settlementKey = `${settlement.from}-${settlement.to}`;
    setPaying(settlementKey);
    setError(null);

    try {
      // 1. Load source account from Horizon
      const sourceAccount = await server.loadAccount(address);

      // 2. Build the Stellar payment transaction
      const memo = `${group?.name ?? 'Group'} split`.slice(0, 28);
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
        .addMemo(Memo.text(memo))
        .setTimeout(30)
        .build();

      // 3. Sign via StellarWalletsKit
      const xdr = tx.toEnvelope().toXDR('base64');
      const signedXDR = await signXdr(xdr);

      // 4. Submit to Stellar Testnet
      const signedTx = TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx);
      const txHash = response.hash;

      // 5. Save a PAID receipt record in requestStore
      //    toAddress = settlement.toAddress (the receiver / creditor)
      //    fromAddress = address (the payer / debtor — that's me)
      //    Note: We use fromAddress = MY address because I SENT this payment
      //    The receiver will see this as a "received payment" via getOutgoing on their side
      addRequest({
        fromAddress: address,              // I (the debtor) sent this
        toAddress: settlement.toAddress,   // receiver (creditor)
        fromName: myMember?.name ?? settlement.fromName,
        amount: settlement.amount.toFixed(7),
        memo: memo,
        groupId: group?.id,
        groupName: group?.name,
        status: 'paid',
        txHash,
      });

      return txHash;
    } catch (err: any) {
      const msg =
        err?.response?.data?.extras?.result_codes?.operations?.[0] ??
        err?.message ??
        'Transaction failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setPaying(null);
    }
  };

  // ── ACTION 2: Send a payment REQUEST to a debtor ─────────
  /**
   * Called by the CREDITOR (person who is owed money) to notify the DEBTOR.
   * Creates a pending PaymentRequest with toAddress = debtor's wallet.
   * When the debtor connects their wallet, they see this in their inbox via getIncoming().
   */
  const sendPaymentRequest = async (settlement: Settlement): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (settlement.toAddress !== address) {
      throw new Error("You can only send requests for settlements where you are the creditor.");
    }
    if (!settlement.fromAddress || settlement.fromAddress.length !== 56) {
      throw new Error(
        `Cannot send request: ${settlement.fromName} has no Stellar address saved. ` +
        `The group must be recreated with all addresses filled in.`
      );
    }

    const requestId = await addRequest({
      fromAddress: address,
      toAddress: settlement.fromAddress,
      fromName: myMember?.name ?? settlement.toName,
      amount: settlement.amount.toFixed(7),
      memo: `${group?.name ?? 'Group'} — settle with ${myMember?.name ?? 'member'}`,
      groupId: group?.id,
      groupName: group?.name,
      status: 'pending',
    });

    return requestId;
  };

  const sendAllPaymentRequests = async (): Promise<number> => {
    if (!address) return 0;
    const myReceivables = settlements.filter((s) => s.toAddress === address);
    let count = 0;
    for (const s of myReceivables) {
      try {
        await sendPaymentRequest(s);
        count++;
      } catch {
        // skip invalid entries silently
      }
    }
    return count;
  };

  return {
    group,
    settlements,
    myMember,
    myOutgoingSettlements,
    myIncomingSettlements,
    myBalance,
    balances,
    total,
    paying,
    error,
    paySettlement,
    sendPaymentRequest,
    sendAllPaymentRequests,
  };
}

import { useState, useMemo } from 'react';
import {
  Horizon, TransactionBuilder, Networks,
  BASE_FEE, Operation, Asset, Memo,
  Contract, Address, nativeToScVal, rpc
} from '@stellar/stellar-sdk';
import { useWallet } from './useWallet';
import { useWalletStore } from '../store/walletStore';
import { useGroupStore } from '../store/groupStore';
import { useRequestStore } from '../store/requestStore';
import { calculateSettlements, totalSpent, memberBalances } from '../utils/settlement';
import { Settlement } from '../types';
import { GROUP_EXPENSE_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS, NETWORK } from '../constants/contract';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL || NETWORK.horizonUrl);
const rpcServer = new rpc.Server(NETWORK.rpcUrl);

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

  // ── PAY: sends XLM or USDC (contract call) + saves receipt to Supabase ──
  const paySettlement = async (settlement: Settlement, assetType: 'XLM' | 'USDC' = 'XLM'): Promise<string> => {
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
      let txHash = '';
      const memo = `${group?.name ?? 'Group'} split`.slice(0, 28);

      if (assetType === 'XLM') {
        const sourceAccount = await server.loadAccount(address);

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
        txHash = response.hash;
      } else {
        // USDC payment using Soroban smart contract inter-contract call
        const contract = new Contract(GROUP_EXPENSE_CONTRACT_ADDRESS);
        const sourceAccount = await rpcServer.getAccount(address);
        const amountStroops = Math.round(settlement.amount * 10_000_000); // 7 decimals for USDC

        const tx = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            contract.call(
              'settle_expense_with_token',
              new Address(address).toScVal(),
              new Address(USDC_CONTRACT_ADDRESS).toScVal(),
              nativeToScVal(amountStroops, { type: 'i128' }),
              new Address(settlement.toAddress).toScVal(),
              nativeToScVal(0, { type: 'u64' }), // group_id = 0 for net split
              nativeToScVal(0, { type: 'u64' }), // expense_id = 0 for net split
            )
          )
          .setTimeout(60)
          .build();

        const sim = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
          if (sim.error.includes('Error(Contract, #10)')) {
            throw new Error('Insufficient USDC balance. Please fund your testnet wallet via the Circle Faucet.');
          }
          throw new Error(`Simulation failed: ${sim.error}`);
        }

        const preparedTx = rpc.assembleTransaction(tx, sim).build();
        const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));

        const response = await rpcServer.sendTransaction(
          TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
        );

        if (response.status === 'ERROR') {
          throw new Error('Transaction submission failed');
        }

        // Poll for confirmation
        let getResponse = await rpcServer.getTransaction(response.hash);
        let attempts = 0;
        while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
          await new Promise((r) => setTimeout(r, 1500));
          getResponse = await rpcServer.getTransaction(response.hash);
          attempts++;
        }

        if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          txHash = response.hash;
        } else {
          throw new Error('USDC Settlement did not confirm in time.');
        }
      }

      // Save paid receipt to Supabase — the RECEIVER will see this in their outgoing
      await addRequest({
        fromAddress: address,
        toAddress: settlement.toAddress,
        fromName: myMember?.name ?? settlement.fromName,
        amount: settlement.amount.toFixed(7),
        memo: `${memo} (${assetType})`,
        groupId: group?.id,
        groupName: group?.name,
        status: 'paid',
        txHash,
      });

      return txHash;
    } catch (err: any) {
      const msg = err?.message ?? 'Transaction failed';
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

import { useState } from 'react';
import {
  Contract, Networks, TransactionBuilder, BASE_FEE,
  Address, nativeToScVal, rpc, Asset, Operation, Horizon
} from '@stellar/stellar-sdk';
import { useWalletStore, useTxStore } from '../store';
import { useWallet } from './useWallet';
import { useGroupStore } from '../store/groupStore';
import { GROUP_EXPENSE_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS, NETWORK } from '../constants/contract';

const rpcServer = new rpc.Server(NETWORK.rpcUrl);
const horizonServer = new Horizon.Server(NETWORK.horizonUrl);

// Native XLM Soroban Asset Contract address on Testnet
const XLM_SAC_ADDRESS = 'CAS3J7GY3CDUAE6YEXEXPOWDZHKYV4733PBAOKX23L575JM4CX72PHSS';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export function useGroupPools(groupId: string) {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { setTx, updateTxStatus } = useTxStore();
  const { createPool, contributeToPool, withdrawFromPool } = useGroupStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add USDC trustline
  const addUsdcTrustline = async () => {
    if (!address) throw new Error('Wallet not connected');
    const txId = `tx_trust_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: 'Establishing USDC Trustline...' });

    try {
      const source = await horizonServer.loadAccount(address);
      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset('USDC', USDC_ISSUER),
          })
        )
        .setTimeout(30)
        .build();

      const signedXdr = await signXdr(tx.toEnvelope().toXDR('base64'));
      const response = await horizonServer.submitTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      updateTxStatus(txId, 'success', response.hash);
      return response.hash;
    } catch (err: any) {
      updateTxStatus(txId, 'failed');
      throw err;
    }
  };

  const createPoolOnChain = async (title: string, targetAmount: number, asset: 'XLM' | 'USDC') => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);

    const txId = `tx_pool_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Create Pool: ${title}` });

    try {
      const contract = new Contract(GROUP_EXPENSE_CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address);

      const targetStroops = Math.round(targetAmount * 10_000_000);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'create_pool',
            new Address(address).toScVal(),
            nativeToScVal(1, { type: 'u64' }), // dummy group ID fitting u64
            nativeToScVal(title, { type: 'string' }),
            nativeToScVal(targetStroops, { type: 'i128' }),
          )
        )
        .setTimeout(45)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw new Error(`Simulation failed: ${sim.error}`);
      }

      const preparedTx = rpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (response.status === 'ERROR') {
        throw new Error('Transaction submission failed');
      }

      let getResponse = await rpcServer.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);

        // Assign a mock pool ID based on timestamp to keep UI key unique
        const poolId = `pool_${Date.now()}`;
        await createPool(groupId, poolId, title, targetAmount, address, asset);
        return response.hash;
      } else {
        throw new Error('Failed to confirm pool creation.');
      }
    } catch (err: any) {
      updateTxStatus(txId, 'failed');
      setError(err?.message ?? 'Transaction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const contributeToPoolOnChain = async (poolId: string, amount: number, asset: 'XLM' | 'USDC') => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);

    const txId = `tx_contrib_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Donate ${amount} ${asset} to pool` });

    try {
      const contract = new Contract(GROUP_EXPENSE_CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address);

      const amountStroops = Math.round(amount * 10_000_000);
      const tokenAddress = asset === 'USDC' ? USDC_CONTRACT_ADDRESS : XLM_SAC_ADDRESS;

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'contribute_pool',
            new Address(address).toScVal(),
            new Address(tokenAddress).toScVal(),
            nativeToScVal(1, { type: 'u64' }), // pool ID fits u64
            nativeToScVal(amountStroops, { type: 'i128' }),
          )
        )
        .setTimeout(45)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw new Error(`Simulation failed: ${sim.error}`);
      }

      const preparedTx = rpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (response.status === 'ERROR') {
        throw new Error('Transaction submission failed');
      }

      let getResponse = await rpcServer.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);
        await contributeToPool(groupId, poolId, amount);
        return response.hash;
      } else {
        throw new Error('Failed to confirm pool contribution.');
      }
    } catch (err: any) {
      updateTxStatus(txId, 'failed');
      setError(err?.message ?? 'Transaction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromPoolOnChain = async (poolId: string, asset: 'XLM' | 'USDC') => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);

    const txId = `tx_withdraw_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: 'Withdrawing Pool Escrow...' });

    try {
      const contract = new Contract(GROUP_EXPENSE_CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address);

      const tokenAddress = asset === 'USDC' ? USDC_CONTRACT_ADDRESS : XLM_SAC_ADDRESS;

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'withdraw_pool',
            new Address(address).toScVal(),
            new Address(tokenAddress).toScVal(),
            nativeToScVal(1, { type: 'u64' }), // pool ID fits u64
          )
        )
        .setTimeout(45)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw new Error(`Simulation failed: ${sim.error}`);
      }

      const preparedTx = rpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (response.status === 'ERROR') {
        throw new Error('Transaction submission failed');
      }

      let getResponse = await rpcServer.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);
        await withdrawFromPool(groupId, poolId);
        return response.hash;
      } else {
        throw new Error('Failed to confirm pool withdrawal.');
      }
    } catch (err: any) {
      updateTxStatus(txId, 'failed');
      setError(err?.message ?? 'Transaction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading, error,
    addUsdcTrustline,
    createPoolOnChain,
    contributeToPoolOnChain,
    withdrawFromPoolOnChain
  };
}

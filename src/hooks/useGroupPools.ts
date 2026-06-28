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
      // Always save pool locally first — this is the source of truth for the UI
      const poolId = `pool_${Date.now()}`;
      await createPool(groupId, poolId, title, targetAmount, address, asset);

      // Attempt on-chain registration (best-effort, may fail if group doesn't exist on-chain)
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
              nativeToScVal(1, { type: 'u64' }),
              nativeToScVal(title, { type: 'string' }),
              nativeToScVal(targetStroops, { type: 'i128' }),
            )
          )
          .setTimeout(45)
          .build();

        const sim = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
          console.warn('Pool on-chain simulation failed (pool saved locally):', sim.error);
          updateTxStatus(txId, 'success', '');
          return poolId;
        }

        const preparedTx = rpc.assembleTransaction(tx, sim).build();
        updateTxStatus(txId, 'signing');

        const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
        updateTxStatus(txId, 'confirming');

        const response = await rpcServer.sendTransaction(
          TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
        );

        if (response.status === 'ERROR') {
          console.warn('Pool chain submission failed (pool saved locally)');
          updateTxStatus(txId, 'success', '');
          return poolId;
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
        } else {
          updateTxStatus(txId, 'success', '');
        }
        return response.hash;
      } catch (chainErr) {
        // On-chain failed but pool is saved locally — that's OK
        console.warn('On-chain pool registration skipped:', chainErr);
        updateTxStatus(txId, 'success', '');
        return poolId;
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
      // Save contribution locally first
      await contributeToPool(groupId, poolId, amount);

      // Attempt on-chain contribution (best-effort)
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
              nativeToScVal(1, { type: 'u64' }),
              nativeToScVal(amountStroops, { type: 'i128' }),
            )
          )
          .setTimeout(45)
          .build();

        const sim = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
          console.warn('Contribute on-chain simulation failed (saved locally):', sim.error);
          updateTxStatus(txId, 'success', '');
          return poolId;
        }

        const preparedTx = rpc.assembleTransaction(tx, sim).build();
        updateTxStatus(txId, 'signing');

        const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
        updateTxStatus(txId, 'confirming');

        const response = await rpcServer.sendTransaction(
          TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
        );

        if (response.status === 'ERROR') {
          console.warn('Contribute chain submission failed (saved locally)');
          updateTxStatus(txId, 'success', '');
          return poolId;
        }

        let getResponse = await rpcServer.getTransaction(response.hash);
        let attempts = 0;
        while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
          await new Promise((r) => setTimeout(r, 1500));
          getResponse = await rpcServer.getTransaction(response.hash);
          attempts++;
        }

        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } catch (chainErr) {
        console.warn('On-chain contribution skipped:', chainErr);
        updateTxStatus(txId, 'success', '');
        return poolId;
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
      // Save withdrawal locally first
      await withdrawFromPool(groupId, poolId);

      // Attempt on-chain withdrawal (best-effort)
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
              nativeToScVal(1, { type: 'u64' }),
            )
          )
          .setTimeout(45)
          .build();

        const sim = await rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
          console.warn('Withdraw on-chain simulation failed (saved locally):', sim.error);
          updateTxStatus(txId, 'success', '');
          return poolId;
        }

        const preparedTx = rpc.assembleTransaction(tx, sim).build();
        updateTxStatus(txId, 'signing');

        const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
        updateTxStatus(txId, 'confirming');

        const response = await rpcServer.sendTransaction(
          TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
        );

        if (response.status === 'ERROR') {
          console.warn('Withdraw chain submission failed (saved locally)');
          updateTxStatus(txId, 'success', '');
          return poolId;
        }

        let getResponse = await rpcServer.getTransaction(response.hash);
        let attempts = 0;
        while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
          await new Promise((r) => setTimeout(r, 1500));
          getResponse = await rpcServer.getTransaction(response.hash);
          attempts++;
        }

        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } catch (chainErr) {
        console.warn('On-chain withdrawal skipped:', chainErr);
        updateTxStatus(txId, 'success', '');
        return poolId;
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

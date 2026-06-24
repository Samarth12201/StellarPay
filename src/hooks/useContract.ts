import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  rpc,
} from '@stellar/stellar-sdk';
import { useWalletStore, useTxStore } from '../store';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESS, NETWORK } from '../constants/contract';
import { ContractError } from '../errors/ContractError';
import { NetworkError } from '../errors/NetworkError';

const rpcServer = new rpc.Server(NETWORK.rpcUrl);

export function useContract() {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const { setTx, updateTxStatus } = useTxStore();

  // ── READ ──────────────────────────────────────────────────

  const getCount = async (): Promise<number> => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address!);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('get_count'))
        .setTimeout(30)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw ContractError.fromStellarError(sim.error);
      }

      const result = (sim as rpc.Api.SimulateTransactionSuccessResponse).result;
      return result ? Number(scValToNative(result.retval)) : 0;
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw ContractError.fromStellarError(err);
    }
  };

  const getRequest = async (id: number) => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address!);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call('get_request', nativeToScVal(id, { type: 'u64' }))
        )
        .setTimeout(30)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw ContractError.fromStellarError(sim.error);
      }

      const result = (sim as rpc.Api.SimulateTransactionSuccessResponse).result;
      return result ? scValToNative(result.retval) : null;
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw ContractError.fromStellarError(err);
    }
  };

  // ── WRITE ─────────────────────────────────────────────────

  const createRequest = async (
    toAddress: string,
    amountXlm: string,
    memo: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const txId = `tx_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Create request: ${amountXlm} XLM → ${toAddress.slice(0, 6)}...` });

    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address);

      const amountStroops = Math.round(parseFloat(amountXlm) * 10_000_000);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'create_request',
            new Address(address).toScVal(),
            new Address(toAddress).toScVal(),
            nativeToScVal(amountStroops, { type: 'i128' }),
            nativeToScVal(memo, { type: 'string' }),
          )
        )
        .setTimeout(30)
        .build();

      // Simulate first
      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        updateTxStatus(txId, 'failed');
        throw ContractError.fromStellarError(sim.error);
      }

      const preparedTx = rpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      if (response.status === 'ERROR') {
        updateTxStatus(txId, 'failed');
        throw NetworkError.fromHorizonError(response);
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
        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } else {
        updateTxStatus(txId, 'failed');
        throw new NetworkError('TX_FAILED', 'Transaction did not confirm in time.');
      }
    } catch (err) {
      updateTxStatus(txId, 'failed');
      throw err;
    }
  };

  const markPaid = async (requestId: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const txId = `tx_${Date.now()}`;
    setTx({ id: txId, status: 'pending', description: `Mark request #${requestId} as paid` });

    try {
      const contract = new Contract(CONTRACT_ADDRESS);
      const source = await rpcServer.getAccount(address);

      const tx = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'mark_paid',
            new Address(address).toScVal(),
            nativeToScVal(requestId, { type: 'u64' }),
          )
        )
        .setTimeout(30)
        .build();

      const sim = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        updateTxStatus(txId, 'failed');
        throw ContractError.fromStellarError(sim.error);
      }

      const preparedTx = rpc.assembleTransaction(tx, sim).build();
      updateTxStatus(txId, 'signing');

      const signedXdr = await signXdr(preparedTx.toEnvelope().toXDR('base64'));
      updateTxStatus(txId, 'confirming');

      const response = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
      );

      let getResponse = await rpcServer.getTransaction(response.hash);
      let attempts = 0;
      while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await rpcServer.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        updateTxStatus(txId, 'success', response.hash);
        return response.hash;
      } else {
        updateTxStatus(txId, 'failed');
        throw new NetworkError('TX_FAILED', 'Transaction did not confirm.');
      }
    } catch (err) {
      updateTxStatus(txId, 'failed');
      throw err;
    }
  };

  return { getCount, getRequest, createRequest, markPaid };
}

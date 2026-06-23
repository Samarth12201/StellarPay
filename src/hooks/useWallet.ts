import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  allowAllModules,
} from '@creit.tech/stellar-wallets-kit';
import { useWalletStore } from '../store';
import { WalletError } from '../errors/WalletError';

let kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}

export function useWallet() {
  const { setAddress, setWalletType, reset } = useWalletStore();

  const openModal = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const k = getKit();

      k.openModal({
        onWalletSelected: async (option: any) => {
          try {
            k.setWallet(option.id);
            const { address } = await k.getAddress();

            if (!address) {
              throw WalletError.fromCode('NOT_CONNECTED');
            }

            // Validate network
            const network = await k.getNetwork().catch(() => null);
            if (network && network.networkPassphrase !== 'Test SDF Network ; September 2015') {
              throw WalletError.fromCode('WRONG_NETWORK');
            }

            setAddress(address);
            setWalletType(option.id);
            resolve(address);
          } catch (err) {
            if (err instanceof WalletError) {
              reject(err);
            } else {
              const msg = String(err);
              if (msg.includes('User declined') || msg.includes('rejected')) {
                reject(WalletError.fromCode('USER_REJECTED'));
              } else if (msg.includes('locked')) {
                reject(WalletError.fromCode('LOCKED'));
              } else {
                reject(new WalletError('NOT_CONNECTED', msg));
              }
            }
          }
        },
        onClosed: (err: any) => {
          if (err) reject(WalletError.fromCode('USER_REJECTED'));
        },
      });
    });
  };

  const signXdr = async (xdr: string): Promise<string> => {
    const k = getKit();
    try {
      const { signedTxXdr } = await k.signTransaction(xdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      return signedTxXdr;
    } catch (err) {
      const msg = String(err);
      if (msg.includes('rejected') || msg.includes('declined')) {
        throw WalletError.fromCode('USER_REJECTED');
      }
      throw new WalletError('NOT_CONNECTED', 'Signing failed: ' + msg);
    }
  };

  const disconnect = () => {
    kit = null;
    reset();
  };

  return { openModal, signXdr, disconnect };
}

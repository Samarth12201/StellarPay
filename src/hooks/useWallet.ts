import { StellarWalletsKit, KitEventType, KitEventWalletSelected } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana';
import { requestAccess, getAddress, signTransaction as freighterSign } from '@stellar/freighter-api';
import { useWalletStore } from '../store';
import { WalletError } from '../errors/WalletError';

let initialized = false;

function initKit() {
  if (!initialized) {
    StellarWalletsKit.init({
      network: 'Test SDF Network ; September 2015' as any,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
        new LobstrModule(),
        new HanaModule(),
      ],
    });

    StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event: KitEventWalletSelected) => {
      if (event.payload.id) {
        useWalletStore.getState().setWalletType(event.payload.id);
      }
    });

    initialized = true;
  }
}

/**
 * Try connecting directly to Freighter extension via its API.
 * This bypasses SWK's unreliable isAvailable() detection.
 */
async function connectFreighterDirect(): Promise<string | null> {
  try {
    // requestAccess asks the user for permission and returns the public key
    const accessResult = await requestAccess();
    if (accessResult.error) {
      console.warn('Freighter requestAccess error:', accessResult.error);
      return null;
    }

    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) {
      console.warn('Freighter getAddress error:', addrResult.error);
      return null;
    }

    return addrResult.address;
  } catch (e) {
    console.warn('Freighter direct connect failed:', e);
    return null;
  }
}

export function useWallet() {
  const { setAddress, setConnected, reset, walletType } = useWalletStore();

  const connectFreighter = async (): Promise<string> => {
    const address = await connectFreighterDirect();
    if (!address) {
      throw WalletError.fromCode('NOT_CONNECTED');
    }
    setAddress(address);
    setConnected(true);
    useWalletStore.getState().setWalletType('freighter');
    return address;
  };

  const openModal = async (): Promise<string> => {
    initKit();
    try {
      const { address } = await StellarWalletsKit.authModal();
      if (!address) {
        throw WalletError.fromCode('NOT_CONNECTED');
      }

      const activeModule = StellarWalletsKit.selectedModule;
      if (activeModule) {
        useWalletStore.getState().setWalletType(activeModule.productId);
      }

      setAddress(address);
      setConnected(true);
      return address;
    } catch (err: any) {
      console.error('Wallet modal error:', err);
      if (err instanceof WalletError) {
        throw err;
      }
      const msg = err?.message ? String(err.message) : String(err);
      if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('closed') || msg.includes('cancel')) {
        throw WalletError.fromCode('USER_REJECTED');
      } else if (msg.includes('locked')) {
        throw WalletError.fromCode('LOCKED');
      } else {
        throw new WalletError('NOT_CONNECTED', msg);
      }
    }
  };

  const signXdr = async (xdr: string): Promise<string> => {
    initKit();
    
    // If connected via direct Freighter, use Freighter API directly for signing
    if (walletType === 'freighter') {
      try {
        const result = await freighterSign(xdr, {
          networkPassphrase: 'Test SDF Network ; September 2015',
        });
        if (result.error) {
          const errMsg = result.error.message || 'Signing failed';
          if (errMsg.includes('rejected') || errMsg.includes('declined') || errMsg.includes('cancel')) {
            throw WalletError.fromCode('USER_REJECTED');
          }
          throw new WalletError('NOT_CONNECTED', 'Signing failed: ' + errMsg);
        }
        return result.signedTxXdr;
      } catch (err: any) {
        if (err instanceof WalletError) throw err;
        const msg = err?.message ? String(err.message) : String(err);
        if (msg.includes('rejected') || msg.includes('declined') || msg.includes('cancel')) {
          throw WalletError.fromCode('USER_REJECTED');
        }
        throw new WalletError('NOT_CONNECTED', 'Signing failed: ' + msg);
      }
    }

    // For other wallets, use SWK
    if (walletType) {
      try {
        StellarWalletsKit.setWallet(walletType);
      } catch (e) {
        console.warn('Failed to set wallet type', e);
      }
    }

    try {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      return signedTxXdr;
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : String(err);
      if (msg.includes('rejected') || msg.includes('declined') || msg.includes('cancel')) {
        throw WalletError.fromCode('USER_REJECTED');
      }
      throw new WalletError('NOT_CONNECTED', 'Signing failed: ' + msg);
    }
  };

  const disconnect = () => {
    initKit();
    StellarWalletsKit.disconnect().catch(() => {});
    reset();
  };

  return { openModal, connectFreighter, signXdr, disconnect };
}

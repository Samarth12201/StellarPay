import { StellarWalletsKit, KitEventType, KitEventWalletSelected } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana';
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

export function useWallet() {
  const { setAddress, setConnected, reset, walletType } = useWalletStore();

  const openModal = async (): Promise<string> => {
    initKit();
    try {
      const { address } = await StellarWalletsKit.authModal();
      if (!address) {
        throw WalletError.fromCode('NOT_CONNECTED');
      }

      // Check network if getNetwork is supported
      try {
        const networkDetails = await StellarWalletsKit.getNetwork();
        if (networkDetails && networkDetails.networkPassphrase !== 'Test SDF Network ; September 2015') {
          throw WalletError.fromCode('WRONG_NETWORK');
        }
      } catch (e) {
        // Some modules might not support getNetwork
      }

      setAddress(address);
      setConnected(true);
      return address;
    } catch (err: any) {
      console.error('Wallet modal error:', err);
      if (err instanceof WalletError) {
        throw err;
      }
      const msg = String(err);
      if (msg.includes('User declined') || msg.includes('rejected') || msg.includes('closed')) {
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
    
    // Ensure the wallet is correctly set if page reloaded
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
      const msg = String(err);
      if (msg.includes('rejected') || msg.includes('declined')) {
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

  return { openModal, signXdr, disconnect };
}

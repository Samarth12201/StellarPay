export class WalletError extends Error {
  constructor(
    public code:
      | 'NOT_INSTALLED'
      | 'USER_REJECTED'
      | 'NOT_CONNECTED'
      | 'WRONG_NETWORK'
      | 'LOCKED',
    message: string
  ) {
    super(message);
    this.name = 'WalletError';
  }

  static fromCode(code: WalletError['code']): WalletError {
    const messages: Record<WalletError['code'], string> = {
      NOT_INSTALLED: 'Wallet extension not found. Please install Freighter, Lobstr, or xBull.',
      USER_REJECTED: 'You rejected the wallet request. Please try again.',
      NOT_CONNECTED: 'No wallet connected. Please connect first.',
      WRONG_NETWORK: 'Wrong network. Please switch your wallet to Stellar Testnet.',
      LOCKED: 'Wallet is locked. Please unlock it and try again.',
    };
    return new WalletError(code, messages[code]);
  }

  get userMessage(): string {
    return this.message;
  }

  get isFatal(): boolean {
    return this.code === 'NOT_INSTALLED';
  }
}

export class NetworkError extends Error {
  constructor(
    public code:
      | 'HORIZON_UNAVAILABLE'
      | 'TIMEOUT'
      | 'INSUFFICIENT_FEE'
      | 'RATE_LIMITED'
      | 'TX_FAILED',
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }

  static fromHorizonError(err: unknown): NetworkError {
    const response = (err as any)?.response;
    const status = response?.status;
    const resultCode = response?.data?.extras?.result_codes?.transaction;

    if (status === 429) {
      return new NetworkError('RATE_LIMITED', 'Too many requests. Please wait a moment.', 429);
    }
    if (resultCode === 'tx_insufficient_fee') {
      return new NetworkError('INSUFFICIENT_FEE', 'Transaction fee too low. Please try again.', status);
    }
    if (!navigator.onLine) {
      return new NetworkError('HORIZON_UNAVAILABLE', 'No internet connection. Check your network.');
    }
    return new NetworkError('TX_FAILED', 'Transaction failed: ' + (resultCode ?? 'unknown error'), status);
  }

  get userMessage(): string {
    return this.message;
  }

  get isRetryable(): boolean {
    return this.code === 'TIMEOUT' || this.code === 'RATE_LIMITED';
  }
}

export class ContractError extends Error {
  constructor(
    public code:
      | 'INVOKE_FAILED'
      | 'SIMULATION_FAILED'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'INVALID_ARGS'
      | 'CONTRACT_PANIC',
    message: string,
    public raw?: unknown
  ) {
    super(message);
    this.name = 'ContractError';
  }

  static fromStellarError(err: unknown): ContractError {
    const msg = String(err);

    if (msg.includes('not found')) {
      return new ContractError('NOT_FOUND', 'Contract or request not found.', err);
    }
    if (msg.includes('unauthorized') || msg.includes('require_auth')) {
      return new ContractError('UNAUTHORIZED', 'You are not authorized to perform this action.', err);
    }
    if (msg.includes('simulation') || msg.includes('preflight')) {
      return new ContractError('SIMULATION_FAILED', 'Contract simulation failed. Check your inputs.', err);
    }
    if (msg.includes('panic')) {
      return new ContractError('CONTRACT_PANIC', 'Contract rejected this operation: ' + msg, err);
    }
    return new ContractError('INVOKE_FAILED', 'Contract call failed. Please try again.', err);
  }

  get userMessage(): string {
    return this.message;
  }
}

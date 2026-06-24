import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Freighter / StellarWalletsKit
vi.mock('@creit-tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn(),
  WalletNetwork: { TESTNET: 'TESTNET' },
  FREIGHTER_ID: 'freighter',
  allowAllModules: vi.fn(() => []),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

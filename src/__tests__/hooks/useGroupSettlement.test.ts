import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGroupSettlement } from '../../hooks/useGroupSettlement';

// Mock useWallet
vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => ({
    signXdr: vi.fn(),
  }),
}));

// Mock useWalletStore
vi.mock('../../store/walletStore', () => ({
  useWalletStore: () => ({
    address: 'GAJSRG',
  }),
}));

// Mock useGroupStore
vi.mock('../../store/groupStore', () => ({
  useGroupStore: () => ({
    getGroup: (id: string) => {
      if (id !== 'g1') return null;
      return {
        id: 'g1',
        name: 'Goa Trip',
        members: [
          { id: '1', name: 'Alice', address: 'GAJSRG', avatarColor: '#7C3AED' },
          { id: '2', name: 'Bob',   address: 'GBOB',   avatarColor: '#059669' },
        ],
        expenses: [
          {
            id: 'e1', description: 'Hotel', totalAmount: 100,
            paidBy: '1', splitAmong: ['1', '2'], date: new Date(),
            settled: false,
          },
        ],
        createdAt: new Date(),
      };
    },
  }),
}));

// Mock useRequestStore
vi.mock('../../store/requestStore', () => {
  const mockState = {
    requests: [] as any[],
    addRequest: vi.fn(),
    markPaid: vi.fn(),
    markRejected: vi.fn(),
  };
  const store = (selector?: (s: typeof mockState) => any) => {
    return selector ? selector(mockState) : mockState;
  };
  return {
    useRequestStore: Object.assign(store, {
      getState: () => mockState,
    }),
  };
});

describe('useGroupSettlement', () => {
  it('returns settlements for a group', () => {
    const { result } = renderHook(() => useGroupSettlement('g1'));
    expect(result.current.settlements).toHaveLength(1);
    expect(result.current.settlements[0].from).toBe('2'); // Bob owes
    expect(result.current.settlements[0].to).toBe('1'); // Alice is owed
    expect(result.current.settlements[0].amount).toBe(50);
  });

  it('returns empty array for unknown group', () => {
    const { result } = renderHook(() => useGroupSettlement('unknown'));
    expect(result.current.settlements).toHaveLength(0);
  });
});

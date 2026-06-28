import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettlementView } from '../../components/groups/SettlementView';
import { Settlement } from '../../types';

const mockSettlements: Settlement[] = [
  {
    from: '2',
    to: '1',
    fromAddress: 'GBOB',
    toAddress: 'GAJSRG',
    fromName: 'Bob',
    toName: 'Alice',
    amount: 50,
  },
];

describe('SettlementView', () => {
  it('renders settlements correctly when present', () => {
    render(
      <SettlementView
        settlements={mockSettlements}
        myAddress="GBOB"
        onPay={vi.fn()}
        onRequest={vi.fn()}
        paying={null}
      />
    );

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('you owe')).toBeInTheDocument();
  });

  it('renders clean settled state when no settlements are pending', () => {
    render(
      <SettlementView
        settlements={[]}
        myAddress="GBOB"
        onPay={vi.fn()}
        onRequest={vi.fn()}
        paying={null}
      />
    );

    expect(screen.getByText('All settled up!')).toBeInTheDocument();
  });
});

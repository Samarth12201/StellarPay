import { useEffect } from 'react';
import { rpc } from '@stellar/stellar-sdk';
import { useEventStore, ContractEvent } from '../store';
import { CONTRACT_ADDRESS, NETWORK } from '../constants/contract';

const rpcServer = new rpc.Server(NETWORK.rpcUrl);

export function useContractEvents() {
  const { addEvents, lastLedger, setLastLedger } = useEventStore();

  useEffect(() => {
    const poll = async () => {
      try {
        const latest = await rpcServer.getLatestLedger();
        const startLedger = lastLedger === 0
          ? Math.max(1, latest.sequence - 200)
          : lastLedger + 1;

        if (startLedger > latest.sequence) return;

        const response = await rpcServer.getEvents({
          startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [CONTRACT_ADDRESS],
            },
          ],
          limit: 20,
        });

        if (response.events.length > 0) {
          const parsed: ContractEvent[] = response.events.map((e: any) => {
            const topics = e.topic ?? [];
            const eventType = topics[1]?.value ?? 'unknown';
            return {
              id: e.id,
              type: eventType as ContractEvent['type'],
              requestId: Number(e.value?.value?.[0]?.value ?? 0),
              actor: String(e.value?.value?.[1]?.value ?? ''),
              amount: e.value?.value?.[2]?.value
                ? Number(e.value.value[2].value) / 10_000_000
                : undefined,
              ledger: e.ledger,
              timestamp: new Date(e.ledgerClosedAt ?? Date.now()),
            };
          });
          addEvents(parsed);
        }

        setLastLedger(latest.sequence);
      } catch (err) {
        console.warn('Event polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 10_000); // every 10s
    return () => clearInterval(interval);
  }, [lastLedger]);
}

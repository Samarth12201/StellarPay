import { useEffect } from 'react';
import { rpc } from '@stellar/stellar-sdk';
import { useEventStore, ContractEvent } from '../store';
import { CONTRACT_ADDRESS, NETWORK } from '../constants/contract';

const rpcServer = new rpc.Server(NETWORK.rpcUrl);

export function useContractEvents() {

  useEffect(() => {
    let currentLedger = useEventStore.getState().lastLedger;

    const poll = async () => {
      try {
        const latest = await rpcServer.getLatestLedger();
        
        // Fetch current ledger from the store directly so we don't need it in the dependency array
        currentLedger = useEventStore.getState().lastLedger;
        
        const startLedger = currentLedger === 0
          ? Math.max(1, latest.sequence - 2000) // Search 2000 ledgers back for history (~3 hrs)
          : currentLedger + 1;

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
          // Update the global store with the new events
          useEventStore.getState().addEvents(parsed);
        }

        // Update the global store with the latest ledger
        useEventStore.getState().setLastLedger(latest.sequence);
        currentLedger = latest.sequence;

      } catch (err) {
        console.warn('Event polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 10_000); // every 10s
    return () => clearInterval(interval);
  }, []); // Empty dependency array prevents the infinite loop!
}

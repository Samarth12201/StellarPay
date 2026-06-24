import { rpc, Contract, Address, nativeToScVal, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const CONTRACT_ADDRESS = 'CBJJMXJVIXE6ZAK7WBOFX46ATAEJEXRJUNETL5RXR7J6LF35GMN3G742';

async function test() {
  const address = 'GCD43MCI2ZA3KMB67IM6MXO3T63KPRQJ7VBKDCLRGXHT4B5AZZNO37TZ';
  const toAddress = 'GCD43MCI2ZA3KMB67IM6MXO3T63KPRQJ7VBKDCLRGXHT4B5AZZNO37TZ';
  const amountStroops = 100000000;
  const memo = '';

  const contract = new Contract(CONTRACT_ADDRESS);
  const source = await rpcServer.getAccount(address);

  const tx = new TransactionBuilder(source, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'create_request',
        new Address(address).toScVal(),
        new Address(toAddress).toScVal(),
        nativeToScVal(amountStroops, { type: 'i128' }),
        nativeToScVal(memo, { type: 'string' }),
      )
    )
    .setTimeout(30)
    .build();

  const sim = await rpcServer.simulateTransaction(tx);
  console.log(JSON.stringify(sim, null, 2));
}

test().catch(console.error);

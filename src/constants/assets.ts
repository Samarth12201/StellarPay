// USDC on Stellar Testnet (Circle)
export const USDC_TESTNET = {
  code: 'USDC',
  issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

// Supported display currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$',  flag: '🇺🇸', name: 'US Dollar' },
  { code: 'INR', symbol: '₹',  flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$',flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'PHP', symbol: '₱',  flag: '🇵🇭', name: 'Philippine Peso' },
  { code: 'EUR', symbol: '€',  flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£',  flag: '🇬🇧', name: 'British Pound' },
];

export const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,inr,mxn,php,eur,gbp';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useWalletStore } from '../store/walletStore';
import { CURRENCIES } from '../constants/assets';
import { WalletConnect } from '../components/wallet/WalletConnect';

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1, label: 'Wallet' },
  { num: 2, label: 'Profile' },
  { num: 3, label: 'Done' },
] as const;

export function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const { address } = useWalletStore();
  const { saveProfile } = useProfile();
  const navigate = useNavigate();

  const handleSaveProfile = async () => {
    if (!username.trim()) return;
    setSaving(true);
    await saveProfile({ username: username.trim(), preferred_currency: currency });
    setSaving(false);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-violet-600 transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          {STEPS.map((item) => (
            <div key={item.num} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > item.num ? 'bg-green-500 text-white' :
                step === item.num ? 'bg-violet-600 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > item.num ? '✓' : item.num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === item.num ? 'text-violet-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-4">
          {step === 1 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl">🌟</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{address ? 'Wallet Connected!' : 'Connect Your Wallet'}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {address ? "Welcome to StellarPay. Let's set up your profile." : 'Connect your Stellar wallet to get started with onboarding.'}
                </p>
              </div>
              {address ? (
                <>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-500 truncate">
                    {address}
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700"
                  >
                    Set up profile →
                  </button>
                </>
              ) : (
                <div className="pt-2">
                  <WalletConnect />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your profile</h2>
                <p className="text-sm text-gray-400 mt-0.5">Choose a display name and preferred currency</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Display name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. Samarth, Aman, Priya"
                  maxLength={30}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-400 mt-1">This is how group members will see you later</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Preferred currency</label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map((currencyOption) => (
                    <button
                      key={currencyOption.code}
                      onClick={() => setCurrency(currencyOption.code)}
                      type="button"
                      className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                        currency === currencyOption.code
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{currencyOption.flag}</span>
                      <span className="mt-0.5">{currencyOption.code}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Settlement amounts will be displayed in {currency} alongside XLM
                </p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!username.trim() || saving}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save profile →'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profile saved!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  You are ready to use StellarPay. Create or join groups from the dashboard whenever you want.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700"
              >
                Go to dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

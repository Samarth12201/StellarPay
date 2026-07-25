import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWalletStore } from '../store/walletStore';

export interface UserProfile {
  id: string;
  username: string;
  preferred_currency: string;
  avatar_color: string;
}

const onboardingKey = (address: string) => `stellarpay-onboarded-${address}`;

export function hasCompletedOnboarding(address: string | null) {
  return Boolean(address && localStorage.getItem(onboardingKey(address)) === 'true');
}

export function markOnboardingComplete(address: string) {
  localStorage.setItem(onboardingKey(address), 'true');
  window.dispatchEvent(new CustomEvent('stellarpay:onboarding-complete', { detail: { address } }));
}

export function useProfile() {
  const { address } = useWalletStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      setIsNew(false);
      return;
    }

    if (hasCompletedOnboarding(address)) {
      setIsNew(false);
    }

    const supabaseClient = supabase;

    if (!supabaseClient) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .eq('id', address)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[useProfile] Error fetching profile:', error.message);
          setIsNew(!hasCompletedOnboarding(address));
        } else if (data) {
          setProfile(data as UserProfile);
          setIsNew(false);
          markOnboardingComplete(address);
        } else {
          setProfile(null);
          setIsNew(!hasCompletedOnboarding(address));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[useProfile] Unexpected error:', error);
          setIsNew(!hasCompletedOnboarding(address));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    const handleOnboardingComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: string }>).detail;
      if (detail?.address === address) {
        setIsNew(false);
      }
    };

    window.addEventListener('stellarpay:onboarding-complete', handleOnboardingComplete);

    return () => {
      cancelled = true;
      window.removeEventListener('stellarpay:onboarding-complete', handleOnboardingComplete);
    };
  }, [address]);

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!address) return;
    if (!supabase) throw new Error('Supabase not initialized');

    const merged = {
      id: address,
      avatar_color: '#7C3AED',
      preferred_currency: 'USD',
      username: '',
      ...profile,
      ...updates,
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(merged)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) setProfile(data as UserProfile);

    markOnboardingComplete(address);
    setIsNew(false);
  };

  return { profile, loading, isNew, saveProfile };
}

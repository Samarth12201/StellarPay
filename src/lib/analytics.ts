import { track } from '@vercel/analytics';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  try {
    track(name, properties);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug('[analytics] event skipped', name, error);
    }
  }
}

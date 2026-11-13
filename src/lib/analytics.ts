const ANALYTICS_ID = (import.meta.env.VITE_ANALYTICS_ID as string | undefined)?.trim() || '';

export type AnalyticsEventName =
  | 'page_view'
  | 'book_click'
  | 'test_ride_submit'
  | 'inquiry_submit'
  | 'add_to_cart'
  | 'purchase';

export function trackEvent(event: AnalyticsEventName, payload?: Record<string, unknown>) {
  if (!ANALYTICS_ID || typeof window === 'undefined') return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
  if (typeof w.gtag === 'function') {
    w.gtag('event', event, payload ?? {});
  } else if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event, ...payload });
  }
}

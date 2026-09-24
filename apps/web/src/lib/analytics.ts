type AnalyticsEvent = 'hero_cta_click' | 'territory_created' | 'radius_added' | 'radius_moved' | 'sales_uploaded';

declare global {
  interface Window {
    gtag?: (command: 'event', name: AnalyticsEvent, parameters?: Record<string, string | number | boolean>) => void;
  }
}

export function trackEvent(name: AnalyticsEvent, parameters?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  const hostname = window.location.hostname.toLowerCase().replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') ||
      /^127\./.test(hostname) || hostname === '[::1]' || hostname === '::1') return;
  try {
    window.gtag?.('event', name, parameters);
  } catch {
    // Analytics must never interrupt a user action.
  }
}

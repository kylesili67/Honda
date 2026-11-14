import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | null;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ title, description, canonicalPath, image, jsonLd }: PageMetaOptions) {
  useEffect(() => {
    document.title = title;
    const desc =
      description ||
      'Browse motorcycles, compare specs, estimate installments, book a bike or test ride, shop genuine gear, and schedule workshop service.';

    setMetaTag('name', 'description', desc);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', desc);

    const origin = SITE_URL || window.location.origin;
    const path = canonicalPath ?? window.location.pathname;
    const fullUrl = `${origin}${path}`;
    const resolvedImage = image
      ? /^https?:\/\//i.test(image)
        ? image
        : `${origin}${image.startsWith('/') ? image : `/${image}`}`
      : `${origin}/og-default.png`;
    setMetaTag('property', 'og:image', resolvedImage);
    setMetaTag('name', 'twitter:image', resolvedImage);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    const existingScript = document.getElementById('page-json-ld');
    if (existingScript) existingScript.remove();

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'page-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById('page-json-ld');
      if (s) s.remove();
    };
  }, [title, description, canonicalPath, image, jsonLd]);
}

interface Env {
  VITE_SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const origin = context.env.VITE_SITE_URL?.replace(/\/$/, '') || new URL(context.request.url).origin;

  const staticPaths = [
    '/',
    '/bikes',
    '/compare',
    '/emi-calculator',
    '/find-your-perfect-bike',
    '/test-ride',
    '/trade-in',
    '/inquiry',
    '/accessories',
    '/service-booking',
    '/branches',
    '/news',
    '/faq',
    '/about',
    '/contact',
  ];

  const dynamicPaths: string[] = [];

  if (context.env.SUPABASE_URL && context.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const headers = {
        apikey: context.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
      };
      const [bikesRes, accRes, newsRes] = await Promise.all([
        fetch(`${context.env.SUPABASE_URL}/rest/v1/bike_models?select=slug&status=eq.published`, { headers }),
        fetch(`${context.env.SUPABASE_URL}/rest/v1/accessories?select=slug&status=eq.published`, { headers }),
        fetch(`${context.env.SUPABASE_URL}/rest/v1/news_posts?select=slug&is_published=eq.true`, { headers }),
      ]);
      if (bikesRes.ok) {
        const bikes = (await bikesRes.json()) as Array<{ slug: string }>;
        dynamicPaths.push(...bikes.map((b) => `/bikes/${b.slug}`));
      }
      if (accRes.ok) {
        const accs = (await accRes.json()) as Array<{ slug: string }>;
        dynamicPaths.push(...accs.map((a) => `/accessories/${a.slug}`));
      }
      if (newsRes.ok) {
        const posts = (await newsRes.json()) as Array<{ slug: string }>;
        dynamicPaths.push(...posts.map((n) => `/news/${n.slug}`));
      }
    } catch {
      // Fallback to static URLs only
    }
  }

  const urls = [...staticPaths, ...dynamicPaths]
    .map((p) => `<url><loc>${origin}${p}</loc></url>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

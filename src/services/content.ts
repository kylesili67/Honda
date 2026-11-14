import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Banner, Branch, FAQ, NewsPost, Offer, StaticPage } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function listBranches(includeInactive = false): Promise<Branch[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .branches.filter((b) => includeInactive || b.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  let q = supabase.from('branches').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Branch[];
}

export async function saveBranchAdmin(branch: Partial<Branch> & { name: string; slug: string }): Promise<Branch> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (branch.id) {
      const idx = s.branches.findIndex((b) => b.id === branch.id);
      if (idx === -1) throw new Error('Branch not found');
      s.branches[idx] = { ...s.branches[idx], ...branch } as Branch;
      saveDemoState();
      return s.branches[idx];
    }
    const created: Branch = {
      id: uid('br'),
      name: branch.name,
      slug: branch.slug,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
      whatsapp: branch.whatsapp ?? null,
      email: branch.email ?? null,
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
      opening_hours: branch.opening_hours ?? null,
      is_active: branch.is_active ?? true,
      sort_order: branch.sort_order ?? s.branches.length + 1,
    };
    s.branches.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('branches').upsert(branch).select('*').single();
  if (error) throw error;
  return data as Branch;
}

export async function deleteBranchAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.branches = s.branches.filter((b) => b.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw error;
}

export async function listBanners(includeInactive = false): Promise<Banner[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .banners.filter((b) => includeInactive || b.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  let q = supabase.from('banners').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export async function saveBannerAdmin(banner: Partial<Banner> & { title: string; image_url: string }): Promise<Banner> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (banner.id) {
      const idx = s.banners.findIndex((b) => b.id === banner.id);
      if (idx === -1) throw new Error('Banner not found');
      s.banners[idx] = { ...s.banners[idx], ...banner } as Banner;
      saveDemoState();
      return s.banners[idx];
    }
    const created: Banner = {
      id: uid('ban'),
      title: banner.title,
      subtitle: banner.subtitle ?? null,
      image_url: banner.image_url,
      cta_label: banner.cta_label ?? null,
      cta_url: banner.cta_url ?? null,
      placement: banner.placement ?? 'home_hero',
      starts_at: banner.starts_at ?? null,
      ends_at: banner.ends_at ?? null,
      sort_order: banner.sort_order ?? s.banners.length + 1,
      is_active: banner.is_active ?? true,
    };
    s.banners.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('banners').upsert(banner).select('*').single();
  if (error) throw error;
  return data as Banner;
}

export async function deleteBannerAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.banners = s.banners.filter((b) => b.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

export async function listOffers(includeInactive = false): Promise<Offer[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().offers.filter((o) => includeInactive || o.is_active);
  }
  let q = supabase.from('offers').select('*');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Offer[];
}

export async function saveOfferAdmin(offer: Partial<Offer> & { title: string }): Promise<Offer> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (offer.id) {
      const idx = s.offers.findIndex((o) => o.id === offer.id);
      if (idx === -1) throw new Error('Offer not found');
      s.offers[idx] = { ...s.offers[idx], ...offer } as Offer;
      saveDemoState();
      return s.offers[idx];
    }
    const created: Offer = {
      id: uid('off'),
      title: offer.title,
      description: offer.description ?? null,
      image_url: offer.image_url ?? null,
      applies_to: offer.applies_to ?? 'all',
      starts_at: offer.starts_at ?? null,
      ends_at: offer.ends_at ?? null,
      is_active: offer.is_active ?? true,
    };
    s.offers.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('offers').upsert(offer).select('*').single();
  if (error) throw error;
  return data as Offer;
}

export async function deleteOfferAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.offers = s.offers.filter((o) => o.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) throw error;
}

export async function listFaqs(includeInactive = false): Promise<FAQ[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState()
      .faqs.filter((f) => includeInactive || f.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  let q = supabase.from('faqs').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FAQ[];
}

export async function saveFaqAdmin(faq: Partial<FAQ> & { question: string; answer: string }): Promise<FAQ> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (faq.id) {
      const idx = s.faqs.findIndex((f) => f.id === faq.id);
      if (idx === -1) throw new Error('FAQ not found');
      s.faqs[idx] = { ...s.faqs[idx], ...faq } as FAQ;
      saveDemoState();
      return s.faqs[idx];
    }
    const created: FAQ = {
      id: uid('faq'),
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? 'General',
      sort_order: faq.sort_order ?? s.faqs.length + 1,
      is_active: faq.is_active ?? true,
    };
    s.faqs.push(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase.from('faqs').upsert(faq).select('*').single();
  if (error) throw error;
  return data as FAQ;
}

export async function deleteFaqAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.faqs = s.faqs.filter((f) => f.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw error;
}

export async function getStaticPage(slug: string): Promise<StaticPage | null> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().staticPages.find((p) => p.slug === slug) ?? null;
  }
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as StaticPage) ?? null;
}

export async function listStaticPagesAdmin(): Promise<StaticPage[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().staticPages;
  }
  const { data, error } = await supabase.from('static_pages').select('*').order('slug', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StaticPage[];
}

export async function saveStaticPageAdmin(page: StaticPage): Promise<StaticPage> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const idx = s.staticPages.findIndex((p) => p.id === page.id || p.slug === page.slug);
    if (idx >= 0) {
      s.staticPages[idx] = page;
    } else {
      s.staticPages.push(page);
    }
    saveDemoState();
    return page;
  }
  const { data, error } = await supabase.from('static_pages').upsert(page).select('*').single();
  if (error) throw error;
  return data as StaticPage;
}

export async function listNewsPosts(includeUnpublished = false): Promise<NewsPost[]> {
  if (!isSupabaseConfigured || !supabase) {
    return (getDemoState().newsPosts ?? [])
      .filter((n) => includeUnpublished || n.is_published)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }
  let q = supabase.from('news_posts').select('*').order('published_at', { ascending: false });
  if (!includeUnpublished) q = q.eq('is_published', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NewsPost[];
}

export async function getNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  if (!isSupabaseConfigured || !supabase) {
    return (getDemoState().newsPosts ?? []).find((n) => n.slug === slug && n.is_published) ?? null;
  }
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  return (data as NewsPost) ?? null;
}

export async function saveNewsPostAdmin(
  post: Partial<NewsPost> & { title: string; slug: string }
): Promise<NewsPost> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    if (!s.newsPosts) s.newsPosts = [];
    if (post.id) {
      const idx = s.newsPosts.findIndex((n) => n.id === post.id);
      if (idx === -1) throw new Error('News post not found');
      s.newsPosts[idx] = { ...s.newsPosts[idx], ...post } as NewsPost;
      saveDemoState();
      return s.newsPosts[idx];
    }
    const now = new Date().toISOString();
    const created: NewsPost = {
      id: uid('news'),
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? '',
      content_markdown: post.content_markdown ?? '',
      image_url: post.image_url ?? null,
      related_model_id: post.related_model_id ?? null,
      published_at: post.published_at ?? now,
      is_published: post.is_published ?? true,
      created_at: now,
    };
    s.newsPosts.unshift(created);
    saveDemoState();
    return created;
  }
  const { data, error } = await supabase
    .from('news_posts')
    .upsert({
      ...post,
      related_model_id: post.related_model_id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as NewsPost;
}

export async function deleteNewsPostAdmin(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    s.newsPosts = (s.newsPosts ?? []).filter((n) => n.id !== id);
    saveDemoState();
    return;
  }
  const { error } = await supabase.from('news_posts').delete().eq('id', id);
  if (error) throw error;
}

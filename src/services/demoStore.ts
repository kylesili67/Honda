import {
  createInitialDemoState,
  SAMPLE_BIKES,
  SAMPLE_NEWS_POSTS,
  SAMPLE_STATIC_PAGES,
  type DemoStoreState,
} from '../data/sample';

const STORAGE_KEY = 'honda_showroom_demo_state_v1';

let state: DemoStoreState = loadInitial();

function loadInitial(): DemoStoreState {
  if (typeof window === 'undefined') return createInitialDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStoreState;
      if (!parsed.newsPosts) parsed.newsPosts = structuredClone(SAMPLE_NEWS_POSTS);
      if (!parsed.staticPages.some((p) => p.slug === 'disclaimer')) {
        const disc = SAMPLE_STATIC_PAGES.find((p) => p.slug === 'disclaimer');
        if (disc) parsed.staticPages.push(disc);
      }
      // Backfill 4-angle sample views for pre-existing cached demo bikes lacking view_angle metadata
      if (Array.isArray(parsed.bikes)) {
        parsed.bikes = parsed.bikes.map((bike) => {
          const hasAnyAngle = (bike.images ?? []).some((img) => Boolean(img.view_angle));
          if (hasAnyAngle) return bike;
          const sampleMatch = SAMPLE_BIKES.find((sb) => sb.id === bike.id);
          return sampleMatch?.images
            ? { ...bike, images: structuredClone(sampleMatch.images) }
            : bike;
        });
      }
      // Backfill related_model_id for pre-existing cached sample news posts
      if (Array.isArray(parsed.newsPosts)) {
        parsed.newsPosts = parsed.newsPosts.map((post) => {
          if (post.related_model_id !== undefined) return post;
          const samplePost = SAMPLE_NEWS_POSTS.find((sp) => sp.id === post.id);
          return samplePost ? { ...post, related_model_id: samplePost.related_model_id ?? null } : post;
        });
      }
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return createInitialDemoState();
}

export function getDemoState(): DemoStoreState {
  return state;
}

export function saveDemoState(next?: DemoStoreState): void {
  if (next) state = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }
}

export function resetDemoState(): DemoStoreState {
  state = createInitialDemoState();
  saveDemoState();
  return state;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

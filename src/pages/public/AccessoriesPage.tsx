import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { usePageMeta } from '../../lib/seo';
import { listAccessories, listAccessoryCategories } from '../../services/accessories';
import { listBikes } from '../../services/bikes';
import { AccessoryCard } from '../../components/store/AccessoryCard';
import { Breadcrumb, EmptyState, Select, Skeleton } from '../../components/ui/Primitives';

export function AccessoriesPage() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  usePageMeta({
    title: `Accessories, Helmets & Gear Store | ${settings.brand_name}`,
    description: 'Shop helmets, riding jackets, gloves, and genuine parts filtered by compatible motorcycle model.',
  });

  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') || 'all');
  const [compatibleModelId, setCompatibleModelId] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');

  useEffect(() => {
    const paramCat = searchParams.get('category');
    if (paramCat) setCategorySlug(paramCat);
  }, [searchParams]);

  const { data: categories = [] } = useQuery({
    queryKey: ['accessory-categories'],
    queryFn: listAccessoryCategories,
  });
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });
  const { data: accessories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['accessories', { categorySlug, compatibleModelId, search, sort }],
    queryFn: () => listAccessories({ categorySlug, compatibleModelId, search, sort }),
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Accessories Store' }]} />

      <div className="mt-4 pb-6 border-b border-[#E3E4E7] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#111214]">
            Accessories &amp; Riding Gear
          </h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            Order online with showroom pickup or nationwide courier delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="h-4 w-4 text-[#6B7078] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search helmets, gloves..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-lg border border-[#E3E4E7] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920]"
            />
          </div>

          <Select
            aria-label="Filter by compatible bike"
            value={compatibleModelId}
            onChange={(e) => setCompatibleModelId(e.target.value)}
            className="w-52"
          >
            <option value="all">All Compatible Bikes</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                Fits: {b.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Sort accessories"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'featured' | 'price_asc' | 'price_desc')}
            className="w-44"
          >
            <option value="featured">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </Select>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategorySlug('all')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            categorySlug === 'all'
              ? 'bg-[#111214] text-white'
              : 'bg-[#F5F5F6] text-[#26282C] hover:bg-[#E3E4E7]'
          }`}
        >
          All Items
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategorySlug(c.slug)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              categorySlug === c.slug
                ? 'bg-[#111214] text-white'
                : 'bg-[#F5F5F6] text-[#26282C] hover:bg-[#E3E4E7]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-88 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load accessories"
            description="Please retry loading the store catalog."
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : accessories.length === 0 ? (
          <EmptyState
            title="No accessories found"
            description="Reset your category or bike compatibility filter."
            actionLabel="Reset Filters"
            onAction={() => {
              setCategorySlug('all');
              setCompatibleModelId('all');
              setSearch('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessories.map((acc) => (
              <AccessoryCard key={acc.id} item={acc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

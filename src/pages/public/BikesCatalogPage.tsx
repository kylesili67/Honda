import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { usePageMeta } from '../../lib/seo';
import { listBikeCategories, listBikes, type BikeFilterParams } from '../../services/bikes';
import { listMyWishlist, toggleWishlistItem } from '../../services/wishlist';
import { BikeCard } from '../../components/bikes/BikeCard';
import {
  Breadcrumb,
  Button,
  Drawer,
  EmptyState,
  Input,
  Pagination,
  Select,
  Skeleton,
} from '../../components/ui/Primitives';

const PAGE_SIZE = 6;

export function BikesCatalogPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageMeta({
    title: `Motorcycles Catalog | ${settings.brand_name}`,
    description: 'Filter motorcycles by category, engine CC, price in PKR, mileage, color, and live showroom availability.',
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState('');
  const [ccRange, setCcRange] = useState<'all' | '70' | '125' | '150'>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minMileage, setMinMileage] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<BikeFilterParams['sort']>('featured');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const paramCat = searchParams.get('category');
    if (paramCat) setCategorySlug(paramCat);
  }, [searchParams]);

  const filters: BikeFilterParams = {
    categorySlug,
    search,
    minCc: ccRange === '70' ? 50 : ccRange === '125' ? 100 : ccRange === '150' ? 140 : undefined,
    maxCc: ccRange === '70' ? 99 : ccRange === '125' ? 139 : ccRange === '150' ? 250 : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minMileage: minMileage ? Number(minMileage) : undefined,
    inStockOnly,
    sort,
  };

  const { data: categories = [] } = useQuery({ queryKey: ['bike-categories'], queryFn: listBikeCategories });
  const { data: bikes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['bikes-catalog', filters],
    queryFn: () => listBikes(filters),
  });
  const { data: wishlist = [], refetch: refetchWishlist } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => (user ? listMyWishlist(user.id) : Promise.resolve([])),
    enabled: Boolean(user),
  });

  const totalPages = Math.max(1, Math.ceil(bikes.length / PAGE_SIZE));
  const pagedBikes = bikes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setCategorySlug('all');
    setSearch('');
    setCcRange('all');
    setMaxPrice('');
    setMinMileage('');
    setInStockOnly(false);
    setSort('featured');
    setPage(1);
    setSearchParams({});
  };

  const handleWishlist = async (modelId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please log in to save motorcycles.' });
      return;
    }
    const added = await toggleWishlistItem(user.id, { model_id: modelId });
    void refetchWishlist();
    toast({ title: added ? 'Saved to wishlist' : 'Removed from wishlist', variant: 'success' });
  };

  const FilterPanel = (
    <div className="space-y-5">
      <Select
        label="Category"
        value={categorySlug}
        onChange={(e) => {
          setCategorySlug(e.target.value);
          setPage(1);
        }}
      >
        <option value="all">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </Select>

      <Select
        label="Engine Displacement"
        value={ccRange}
        onChange={(e) => {
          setCcRange(e.target.value as 'all' | '70' | '125' | '150');
          setPage(1);
        }}
      >
        <option value="all">All Engine Sizes</option>
        <option value="70">70cc – 99cc</option>
        <option value="125">100cc – 139cc</option>
        <option value="150">140cc+</option>
      </Select>

      <Input
        label="Max Ex-Showroom Price (PKR)"
        type="number"
        placeholder="e.g. 300000"
        value={maxPrice}
        onChange={(e) => {
          setMaxPrice(e.target.value);
          setPage(1);
        }}
      />

      <Input
        label="Min Mileage (km/l)"
        type="number"
        placeholder="e.g. 40"
        value={minMileage}
        onChange={(e) => {
          setMinMileage(e.target.value);
          setPage(1);
        }}
      />

      <label className="flex items-center gap-2.5 text-sm font-medium text-[#111214] cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => {
            setInStockOnly(e.target.checked);
            setPage(1);
          }}
          className="h-4 w-4 rounded border-[#E3E4E7] accent-[#D71920]"
        />
        In-stock models only
      </label>

      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
        Reset Filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Motorcycles' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E3E4E7]">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#111214]">Motorcycles</h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            {bikes.length} model{bikes.length === 1 ? '' : 's'} available · {settings.price_disclaimer_text}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 text-[#6B7078] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search models..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-[#E3E4E7] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920]"
            />
          </div>

          <Select
            aria-label="Sort bikes"
            value={sort}
            onChange={(e) => setSort(e.target.value as BikeFilterParams['sort'])}
            className="w-44"
          >
            <option value="featured">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="cc_asc">CC: Low to High</option>
            <option value="cc_desc">CC: High to Low</option>
          </Select>

          <Button
            variant="outline"
            size="md"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block rounded-xl border border-[#E3E4E7] bg-white p-5 h-fit sticky top-24">
          <h2 className="text-sm font-semibold text-[#111214] mb-4">Filter Lineup</h2>
          {FilterPanel}
        </aside>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Could not load motorcycles"
              description="There was a problem loading the showroom catalog."
              actionLabel="Retry"
              onAction={() => void refetch()}
            />
          ) : pagedBikes.length === 0 ? (
            <EmptyState
              title="No bikes match your filters"
              description="Try adjusting engine CC, price limit, or clearing active filters."
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {pagedBikes.map((bike) => (
                  <BikeCard
                    key={bike.id}
                    bike={bike}
                    isWishlisted={wishlist.some((w) => w.model_id === bike.id)}
                    onToggleWishlist={handleWishlist}
                  />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Drawer open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} title="Filter Bikes">
        {FilterPanel}
      </Drawer>
    </div>
  );
}

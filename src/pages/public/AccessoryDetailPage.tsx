import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Ruler, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { formatPKR } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { getAccessoryBySlug } from '../../services/accessories';
import { listBikes } from '../../services/bikes';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  Modal,
  PriceTag,
  SafeImage,
  Skeleton,
} from '../../components/ui/Primitives';

export function AccessoryDetailPage() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: item, isLoading } = useQuery({
    queryKey: ['accessory-detail', slug],
    queryFn: () => getAccessoryBySlug(slug),
    enabled: Boolean(slug),
  });
  const { data: bikes = [] } = useQuery({ queryKey: ['bikes-published'], queryFn: () => listBikes() });

  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    setSelectedVariantId('');
    setQty(1);
  }, [slug]);

  const activeVariants = useMemo(
    () => (item?.variants ?? []).filter((v) => v.is_active),
    [item]
  );
  const selectedVariant =
    activeVariants.find((v) => v.id === selectedVariantId) ?? activeVariants[0];

  const compatibleBikes = useMemo(
    () => bikes.filter((b) => (item?.compatible_model_ids ?? []).includes(b.id)),
    [bikes, item]
  );

  usePageMeta({
    title: item?.seo_title || (item ? `${item.name} | ${settings.brand_name}` : 'Accessory'),
    description: item?.seo_description || item?.description || undefined,
    image: item?.images?.[0]?.url ?? null,
    jsonLd:
      item && selectedVariant
        ? {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: item.name,
            sku: selectedVariant.sku,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'PKR',
              price: selectedVariant.price,
              availability:
                selectedVariant.stock_quantity > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
            },
          }
        : null,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-10">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-12">
        <EmptyState
          title="Accessory not found"
          description="This item may have been removed or is currently unavailable."
          actionLabel="Back to Store"
          actionTo="/accessories"
        />
      </div>
    );
  }

  const img = item.images?.[0]?.url ?? null;

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock_quantity <= 0) return;
    addItem({
      variantId: selectedVariant.id,
      accessoryId: item.id,
      accessorySlug: item.slug,
      name: item.name,
      variantLabel:
        [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' · ') || 'Standard',
      sku: selectedVariant.sku,
      unitPrice: selectedVariant.price,
      imageUrl: img ?? '',
      quantity: qty,
      maxStock: selectedVariant.stock_quantity,
    });
    toast({
      title: 'Added to cart',
      description: `${qty} × ${item.name}`,
      variant: 'success',
    });
  };

  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Accessories', to: '/accessories' },
          { label: item.name },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 overflow-hidden rounded-xl border border-[#E3E4E7] bg-[#F5F5F6]">
          <SafeImage
            src={img}
            alt={item.images?.[0]?.alt_text || item.name}
            aspectClass="aspect-square"
            className="w-full aspect-square"
          />
        </div>

        <div className="lg:col-span-6">
          <Card className="p-6 space-y-5">
            <div>
              <p className="text-xs text-[#6B7078]">
                {item.category?.name} {item.brand ? `· ${item.brand}` : ''} · SKU{' '}
                {selectedVariant?.sku}
              </p>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#111214]">
                {item.name}
              </h1>
            </div>

            <div className="pt-3 border-t border-[#E3E4E7] flex items-center justify-between">
              <PriceTag
                amount={selectedVariant?.price ?? item.base_price}
                compareAt={item.compare_at_price}
                size="lg"
              />
              <span
                className={`text-xs font-semibold ${
                  (selectedVariant?.stock_quantity ?? 0) > 0
                    ? 'text-[#1E8E4E]'
                    : 'text-[#C0262D]'
                }`}
              >
                {(selectedVariant?.stock_quantity ?? 0) > 0
                  ? `${selectedVariant?.stock_quantity} in stock`
                  : 'Out of stock'}
              </span>
            </div>

            {item.description && (
              <p className="text-sm text-[#26282C] leading-relaxed">{item.description}</p>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7078]">
                  Size / Option
                </span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#D71920] hover:underline cursor-pointer"
                >
                  <Ruler className="h-3.5 w-3.5" />
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v) => {
                  const active = v.id === selectedVariant?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                        active
                          ? 'border-[#111214] bg-[#111214] text-white'
                          : 'border-[#E3E4E7] bg-white text-[#111214] hover:bg-[#F5F5F6]'
                      }`}
                    >
                      {[v.size, v.color].filter(Boolean).join(' · ') || 'Standard'} —{' '}
                      {formatPKR(v.price)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center rounded-lg border border-[#E3E4E7]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-11 w-10 text-base font-semibold hover:bg-[#F5F5F6] cursor-pointer"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQty((q) => Math.min(selectedVariant?.stock_quantity || 10, q + 1))
                  }
                  className="h-11 w-10 text-base font-semibold hover:bg-[#F5F5F6] cursor-pointer"
                >
                  +
                </button>
              </div>

              <Button
                size="lg"
                className="flex-1"
                disabled={!selectedVariant || selectedVariant.stock_quantity <= 0}
                onClick={handleAddToCart}
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>

            {compatibleBikes.length > 0 && (
              <div className="pt-4 border-t border-[#E3E4E7]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7078] mb-2">
                  Compatible Motorcycles
                </p>
                <ul className="space-y-1.5">
                  {compatibleBikes.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-xs text-[#26282C]">
                      <Check className="h-3.5 w-3.5 text-[#1E8E4E]" />
                      <Link to={`/bikes/${b.slug}`} className="hover:underline">
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} title="Helmet & Gear Size Guide">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E3E4E7] text-left text-xs text-[#6B7078]">
              <th className="py-2">Size</th>
              <th className="py-2">Head Circumference</th>
              <th className="py-2">Jacket Chest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7] tabular-nums">
            <tr><td className="py-2 font-medium">M</td><td>57 – 58 cm</td><td>38 – 40 in</td></tr>
            <tr><td className="py-2 font-medium">L</td><td>59 – 60 cm</td><td>41 – 43 in</td></tr>
            <tr><td className="py-2 font-medium">XL</td><td>61 – 62 cm</td><td>44 – 46 in</td></tr>
          </tbody>
        </table>
      </Modal>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Wrench } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { listBikes } from '../../services/bikes';
import type { Accessory } from '../../types/database';
import { Button, PriceTag, SafeImage } from '../ui/Primitives';

export function AccessoryCard({ item }: { item: Accessory }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { data: bikes = [] } = useQuery({
    queryKey: ['bikes-published'],
    queryFn: () => listBikes(),
    staleTime: 120_000,
  });

  const img = item.images?.[0]?.url ?? null;
  const activeVariants = (item.variants ?? []).filter((v) => v.is_active);
  const firstInStock = activeVariants.find((v) => v.stock_quantity > 0) ?? activeVariants[0];
  const totalStock = activeVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

  const compatIds = item.compatible_model_ids ?? [];
  const compatNames = bikes
    .filter((b) => compatIds.includes(b.id))
    .map((b) => b.name.replace(/\s*\(Placeholder\)$/i, ''));

  const fitsLabel =
    compatNames.length > 0
      ? `Fits: ${compatNames.slice(0, 2).join(', ')}${compatNames.length > 2 ? ` +${compatNames.length - 2}` : ''}`
      : 'Fits: Universal Showroom Fit';

  const handleQuickAdd = () => {
    if (!firstInStock || firstInStock.stock_quantity <= 0) return;
    addItem({
      variantId: firstInStock.id,
      accessoryId: item.id,
      accessorySlug: item.slug,
      name: item.name,
      variantLabel: [firstInStock.size, firstInStock.color].filter(Boolean).join(' · ') || 'Standard',
      sku: firstInStock.sku,
      unitPrice: firstInStock.price,
      imageUrl: img ?? '',
      quantity: 1,
      maxStock: firstInStock.stock_quantity,
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} (${firstInStock.size || 'Standard'})`,
      variant: 'success',
    });
  };

  return (
    <article className="group flex flex-col rounded-xl border border-[#E3E4E7] bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/accessories/${item.slug}`} className="block bg-[#F5F5F6] overflow-hidden">
        <SafeImage
          src={img}
          alt={item.images?.[0]?.alt_text || item.name}
          aspectClass="aspect-square"
          className="w-full aspect-square transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#6B7078]">
          <span>
            {item.category?.name ?? 'Accessory'}
            {item.brand ? ` · ${item.brand}` : ''}
          </span>
          <span className={totalStock > 0 ? 'text-[#1E8E4E] font-medium' : 'text-[#C0262D] font-medium'}>
            {totalStock > 0 ? 'In Stock' : 'Sold Out'}
          </span>
        </div>

        <Link to={`/accessories/${item.slug}`} className="mt-2 block">
          <h3 className="text-base font-semibold text-[#111214] group-hover:text-[#D71920] transition-colors line-clamp-2">
            {item.name}
          </h3>
        </Link>

        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#26282C] bg-[#F5F5F6] border border-[#E3E4E7] rounded-md px-2.5 py-1 w-fit max-w-full truncate">
          <Wrench className="h-3 w-3 text-[#D71920] shrink-0" />
          <span className="truncate">{fitsLabel}</span>
        </p>

        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <PriceTag amount={firstInStock?.price ?? item.base_price} compareAt={item.compare_at_price} size="md" />
          <Button
            size="md"
            variant="secondary"
            disabled={!firstInStock || firstInStock.stock_quantity <= 0}
            onClick={handleQuickAdd}
            className="min-h-[44px]"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </article>
  );
}

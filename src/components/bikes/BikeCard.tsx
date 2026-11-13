import { Link } from 'react-router-dom';
import { GitCompareArrows, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getTotalAvailableBikeStock } from '../../services/bikes';
import type { BikeModel } from '../../types/database';
import { Button, PriceTag, SafeImage } from '../ui/Primitives';

export function BikeCard({
  bike,
  isWishlisted = false,
  onToggleWishlist,
}: {
  bike: BikeModel;
  isWishlisted?: boolean;
  onToggleWishlist?: (modelId: string) => void;
}) {
  const { compareIds, toggleCompare } = useCart();
  const { toast } = useToast();

  const primaryImg =
    bike.images?.find((i) => i.is_primary)?.url ?? bike.images?.[0]?.url ?? null;
  const prices = (bike.variants ?? []).map((v) => v.ex_showroom_price);
  const fromPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const topMileage = Math.max(0, ...(bike.variants ?? []).map((v) => v.mileage_kmpl ?? 0));
  const availableStock = getTotalAvailableBikeStock(bike);
  const inCompare = compareIds.includes(bike.id);

  return (
    <article className="group flex flex-col rounded-xl border border-[#E3E4E7] bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/bikes/${bike.slug}`} className="relative block bg-[#F5F5F6] overflow-hidden">
        <SafeImage
          src={primaryImg}
          alt={bike.images?.[0]?.alt_text || bike.name}
          aspectClass="aspect-[4/3]"
          className="w-full aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#6B7078]">
          <span>
            {bike.category?.name ?? 'Motorcycle'} · {bike.engine_cc} cc
            {topMileage > 0 ? ` · ${topMileage} km/l` : ''}
          </span>
          <span
            className={`font-medium ${
              availableStock > 0 ? 'text-[#1E8E4E]' : 'text-[#C0262D]'
            }`}
          >
            {availableStock > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        <Link to={`/bikes/${bike.slug}`} className="mt-2 block">
          <h3 className="text-lg font-bold text-[#111214] group-hover:text-[#D71920] transition-colors">
            {bike.name}
          </h3>
        </Link>

        {bike.tagline && (
          <p className="mt-1 text-sm text-[#6B7078] line-clamp-2">{bike.tagline}</p>
        )}

        <div className="mt-4 pt-4 border-t border-[#E3E4E7] flex items-end justify-between gap-2">
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-[#6B7078]">
              Starting Ex-Showroom
            </span>
            <PriceTag amount={fromPrice} size="md" />
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleWishlist && (
              <button
                type="button"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                onClick={() => onToggleWishlist(bike.id)}
                className={`h-11 w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  isWishlisted
                    ? 'border-[#D71920] bg-[#D71920]/10 text-[#D71920]'
                    : 'border-[#E3E4E7] text-[#6B7078] hover:text-[#111214]'
                }`}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              type="button"
              aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
              onClick={() => {
                const res = toggleCompare(bike.id);
                if (res.message) toast({ title: res.message });
              }}
              className={`h-11 w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                inCompare
                  ? 'border-[#111214] bg-[#111214] text-white'
                  : 'border-[#E3E4E7] text-[#6B7078] hover:text-[#111214]'
              }`}
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={`/bikes/${bike.slug}`}>
            <Button variant="outline" size="md" className="w-full min-h-[44px]">
              Explore More
            </Button>
          </Link>
          {availableStock > 0 ? (
            <Link to={`/book/${bike.slug}`}>
              <Button size="md" className="w-full min-h-[44px]">
                Book Token
              </Button>
            </Link>
          ) : (
            <Link to={`/inquiry?bike=${bike.slug}`}>
              <Button variant="secondary" size="md" className="w-full min-h-[44px]">
                Inquire
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

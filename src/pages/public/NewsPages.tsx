import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { formatDateKarachi } from '../../lib/format';
import { usePageMeta } from '../../lib/seo';
import { listBikes } from '../../services/bikes';
import { getNewsPostBySlug, listNewsPosts } from '../../services/content';
import { BikeAngleImage } from '../../components/bikes/BikeAngleImage';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  MarkdownRenderer,
  SafeImage,
  Skeleton,
} from '../../components/ui/Primitives';

export function NewsListPage() {
  const { settings } = useSettings();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['news-posts'],
    queryFn: () => listNewsPosts(),
  });
  const { data: bikes = [] } = useQuery({
    queryKey: ['bikes-published'],
    queryFn: () => listBikes(),
  });

  usePageMeta({
    title: `News & Updates | ${settings.brand_name}`,
    description: 'Showroom announcements, workshop camps, riding safety tips, and model updates.',
  });

  return (
    <div className="mx-auto max-w-[1140px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'News & Updates' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">Showroom News &amp; Updates</h1>
      <p className="mt-1 text-sm text-[#6B7078]">
        Service camps, riding tips, and showroom announcements across our Pakistan branches.
      </p>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No news updates yet" description="Check back soon for showroom announcements." actionLabel="Back to Home" actionTo="/" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => {
            const linkedBike = post.related_model_id
              ? bikes.find((b) => b.id === post.related_model_id)
              : undefined;

            return (
              <Card key={post.id} className="group overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all">
                {(linkedBike || post.image_url) && (
                  <Link to={`/news/${post.slug}`} className="block bg-[#F5F5F6] overflow-hidden">
                    {linkedBike ? (
                      <BikeAngleImage
                        images={linkedBike.images}
                        fallbackSrc={post.image_url}
                        alt={post.title}
                        aspectRatio="16/10"
                      />
                    ) : (
                      <SafeImage src={post.image_url} alt={post.title} aspectClass="aspect-[16/10]" className="w-full aspect-[16/10] bg-[#F5F5F6]" />
                    )}
                  </Link>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs text-[#6B7078] flex items-center gap-1.5 tabular-nums">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateKarachi(post.published_at)}
                  </p>
                  <Link to={`/news/${post.slug}`} className="mt-2 block">
                    <h2 className="text-lg font-bold text-[#111214] group-hover:text-[#D71920] transition-colors line-clamp-2">{post.title}</h2>
                  </Link>
                  <p className="mt-2 text-sm text-[#6B7078] line-clamp-3 flex-1">{post.excerpt}</p>
                  <Link to={`/news/${post.slug}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#D71920] hover:underline">
                    Read More
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const { data: post, isLoading } = useQuery({
    queryKey: ['news-post', slug],
    queryFn: () => getNewsPostBySlug(slug),
    enabled: Boolean(slug),
  });
  const { data: bikes = [] } = useQuery({
    queryKey: ['bikes-published'],
    queryFn: () => listBikes(),
  });

  usePageMeta({
    title: post ? `${post.title} | ${settings.brand_name}` : `News | ${settings.brand_name}`,
    description: post?.excerpt || undefined,
    image: post?.image_url ?? null,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Article not found" description="This update may have been unpublished." actionLabel="All News" actionTo="/news" />
      </div>
    );
  }

  const linkedBike = post.related_model_id
    ? bikes.find((b) => b.id === post.related_model_id)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: post.title }]} />
      <div>
        <p className="text-xs font-medium text-[#6B7078] tabular-nums">{formatDateKarachi(post.published_at)}</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#111214]">{post.title}</h1>
      </div>
      {(linkedBike || post.image_url) && (
        <div className="overflow-hidden rounded-xl border border-[#E3E4E7]">
          {linkedBike ? (
            <BikeAngleImage
              images={linkedBike.images}
              fallbackSrc={post.image_url}
              alt={post.title}
              aspectRatio="16/9"
              enableGroupZoom={false}
            />
          ) : (
            <SafeImage src={post.image_url} alt={post.title} aspectClass="aspect-[16/9]" className="w-full aspect-[16/9]" />
          )}
        </div>
      )}
      <Card className="p-6 sm:p-8">
        <MarkdownRenderer markdown={post.content_markdown} />
      </Card>
      <Link to="/news">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to News &amp; Updates
        </Button>
      </Link>
    </div>
  );
}

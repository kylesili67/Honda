import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MEDIA } from '../../assets/media';
import { useToast } from '../../context/ToastContext';
import { formatDateKarachi, formatPKR } from '../../lib/format';
import { listCouponsAdmin, saveCouponAdmin, saveDeliveryZoneAdmin } from '../../services/admin';
import {
  listBanners,
  listBranches,
  listFaqs,
  listNewsPosts,
  listOffers,
  listStaticPagesAdmin,
  saveBannerAdmin,
  saveBranchAdmin,
  saveFaqAdmin,
  saveNewsPostAdmin,
  saveOfferAdmin,
  saveStaticPageAdmin,
} from '../../services/content';
import { listDeliveryZones } from '../../services/orders';
import { Button, Card, Input, Select, Textarea } from '../../components/ui/Primitives';

export function AdminBannersPage() {
  const { toast } = useToast();
  const { data: banners = [], refetch } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => listBanners(true),
  });
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Explore Motorcycles');
  const [ctaUrl, setCtaUrl] = useState('/bikes');
  const [placement, setPlacement] = useState<'home_hero' | 'home_secondary' | 'store'>('home_hero');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Banners</h1>
      <div className="space-y-3">
        {banners.map((b) => (
          <Card key={b.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{b.title}</p>
              <p className="text-xs text-[#6B7078]">{b.placement} · {b.cta_url}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveBannerAdmin({ ...b, is_active: !b.is_active });
                toast({ title: 'Banner toggled' });
                void refetch();
              }}
            >
              {b.is_active ? 'Active' : 'Inactive'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <h2 className="text-base font-semibold">Add Banner</h2>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        <Select label="Placement" value={placement} onChange={(e) => setPlacement(e.target.value as typeof placement)}>
          <option value="home_hero">Home Hero</option>
          <option value="home_secondary">Home Secondary Wide Banner</option>
          <option value="store">Store Banner</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA Label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          <Input label="CTA URL" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
        </div>
        <Button
          onClick={async () => {
            if (!title) return;
            await saveBannerAdmin({
              title,
              subtitle,
              image_url: MEDIA.heroShowroomBike,
              cta_label: ctaLabel,
              cta_url: ctaUrl,
              placement,
              is_active: true,
            });
            setTitle('');
            setSubtitle('');
            toast({ title: 'Banner added', variant: 'success' });
            void refetch();
          }}
        >
          Save Banner
        </Button>
      </Card>
    </div>
  );
}

export function AdminOffersPage() {
  const { toast } = useToast();
  const { data: offers = [], refetch } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: () => listOffers(true),
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<'bikes' | 'accessories' | 'service' | 'all'>('all');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Offers &amp; Campaigns</h1>
      <div className="space-y-3">
        {offers.map((o) => (
          <Card key={o.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{o.title}</p>
              <p className="text-xs text-[#6B7078] capitalize">{o.applies_to} · {o.description}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveOfferAdmin({ ...o, is_active: !o.is_active });
                void refetch();
              }}
            >
              {o.is_active ? 'Active' : 'Inactive'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <h2 className="text-base font-semibold">Add Offer</h2>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select label="Applies To" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)}>
          <option value="all">All</option>
          <option value="bikes">Bikes</option>
          <option value="accessories">Accessories</option>
          <option value="service">Service</option>
        </Select>
        <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button
          onClick={async () => {
            if (!title) return;
            await saveOfferAdmin({ title, description, applies_to: appliesTo, is_active: true });
            setTitle('');
            setDescription('');
            toast({ title: 'Offer created', variant: 'success' });
            void refetch();
          }}
        >
          Add Offer
        </Button>
      </Card>
    </div>
  );
}

export function AdminFaqsPage() {
  const { toast } = useToast();
  const { data: faqs = [], refetch } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: () => listFaqs(true),
  });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Bookings & Delivery');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">FAQs</h1>
      <div className="space-y-3">
        {faqs.map((f) => (
          <Card key={f.id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#6B7078]">{f.category}</p>
              <p className="font-semibold text-sm">{f.question}</p>
              <p className="text-xs text-[#26282C] mt-1">{f.answer}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveFaqAdmin({ ...f, is_active: !f.is_active });
                void refetch();
              }}
            >
              {f.is_active ? 'Active' : 'Hidden'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <h2 className="text-base font-semibold">Add FAQ</h2>
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Textarea label="Answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <Button
          onClick={async () => {
            if (!question || !answer) return;
            await saveFaqAdmin({ question, answer, category, is_active: true });
            setQuestion('');
            setAnswer('');
            toast({ title: 'FAQ added', variant: 'success' });
            void refetch();
          }}
        >
          Save FAQ
        </Button>
      </Card>
    </div>
  );
}

export function AdminPagesPage() {
  const { toast } = useToast();
  const { data: pages = [], refetch } = useQuery({
    queryKey: ['admin-static-pages'],
    queryFn: listStaticPagesAdmin,
  });
  const [selectedSlug, setSelectedSlug] = useState('about');
  const active = pages.find((p) => p.slug === selectedSlug) ?? pages[0];
  const [markdown, setMarkdown] = useState('');

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Static Pages (Markdown)</h1>
      <Select
        label="Select Page"
        value={active?.slug || ''}
        onChange={(e) => {
          setSelectedSlug(e.target.value);
          const found = pages.find((p) => p.slug === e.target.value);
          if (found) setMarkdown(found.content_markdown);
        }}
      >
        {pages.map((p) => (
          <option key={p.id} value={p.slug}>{p.title} (/{p.slug})</option>
        ))}
      </Select>
      {active && (
        <Card className="p-6 space-y-4">
          <Textarea
            label="Markdown Content"
            rows={10}
            value={markdown || active.content_markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <Button
            onClick={async () => {
              await saveStaticPageAdmin({
                ...active,
                content_markdown: markdown || active.content_markdown,
              });
              toast({ title: 'Page saved', variant: 'success' });
              void refetch();
            }}
          >
            Publish Page Content
          </Button>
        </Card>
      )}
    </div>
  );
}

export function AdminBranchesPage() {
  const { toast } = useToast();
  const { data: branches = [], refetch } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => listBranches(true),
  });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Showroom Branches</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map((br) => (
          <Card key={br.id} className="p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{br.name}</p>
              <p className="text-xs text-[#6B7078] mt-1">{br.address} · {br.phone}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveBranchAdmin({ ...br, is_active: !br.is_active });
                void refetch();
              }}
            >
              {br.is_active ? 'Active' : 'Inactive'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <h2 className="text-base font-semibold">Add Branch</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Branch Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button
          onClick={async () => {
            if (!name) return;
            await saveBranchAdmin({
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              city,
              address,
              phone,
              is_active: true,
            });
            setName('');
            toast({ title: 'Branch added', variant: 'success' });
            void refetch();
          }}
        >
          Save Branch
        </Button>
      </Card>
    </div>
  );
}

export function AdminCouponsPage() {
  const { toast } = useToast();
  const { data: coupons = [], refetch } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: listCouponsAdmin,
  });
  const [code, setCode] = useState('');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(3000);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Store Coupons</h1>
      <div className="space-y-3">
        {coupons.map((c) => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-mono-tabular font-bold text-sm">{c.code}</p>
              <p className="text-xs text-[#6B7078] tabular-nums">
                {c.discount_type === 'percent' ? `${c.discount_value}% off` : formatPKR(c.discount_value)} · Min{' '}
                {formatPKR(c.min_order_amount)} · Used {c.used_count}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveCouponAdmin({ ...c, is_active: !c.is_active });
                void refetch();
              }}
            >
              {c.is_active ? 'Active' : 'Disabled'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-md space-y-3">
        <h2 className="text-base font-semibold">Create Coupon</h2>
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Discount (%)" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <Input label="Min Order (PKR)" type="number" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} />
        </div>
        <Button
          onClick={async () => {
            if (!code) return;
            await saveCouponAdmin({
              code,
              discount_type: 'percent',
              discount_value: value,
              min_order_amount: minOrder,
              is_active: true,
            });
            setCode('');
            toast({ title: 'Coupon created', variant: 'success' });
            void refetch();
          }}
        >
          Save Coupon
        </Button>
      </Card>
    </div>
  );
}

export function AdminDeliveryZonesPage() {
  const { toast } = useToast();
  const { data: zones = [], refetch } = useQuery({
    queryKey: ['admin-zones'],
    queryFn: listDeliveryZones,
  });
  const [name, setName] = useState('');
  const [charge, setCharge] = useState(500);
  const [cities, setCities] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Delivery Zones</h1>
      <div className="space-y-3">
        {zones.map((z) => (
          <Card key={z.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{z.name}</p>
              <p className="text-xs text-[#6B7078] tabular-nums">
                {formatPKR(z.charge)} · {z.estimated_days} · Cities: {z.cities.join(', ')}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-md space-y-3">
        <h2 className="text-base font-semibold">Add Delivery Zone</h2>
        <Input label="Zone Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Courier Fee (PKR)" type="number" value={charge} onChange={(e) => setCharge(Number(e.target.value))} />
        <Input label="Cities (comma-separated)" value={cities} onChange={(e) => setCities(e.target.value)} />
        <Button
          onClick={async () => {
            if (!name) return;
            await saveDeliveryZoneAdmin({
              name,
              charge,
              cities: cities.split(',').map((s) => s.trim()).filter(Boolean),
              is_active: true,
            });
            setName('');
            setCities('');
            toast({ title: 'Zone added', variant: 'success' });
            void refetch();
          }}
        >
          Save Zone
        </Button>
      </Card>
    </div>
  );
}

export function AdminNewsPage() {
  const { toast } = useToast();
  const { data: posts = [], refetch } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => listNewsPosts(true),
  });
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">News &amp; Updates</h1>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#6B7078] tabular-nums">{formatDateKarachi(post.published_at)}</p>
              <p className="font-semibold text-sm text-[#111214]">{post.title}</p>
              <p className="text-xs text-[#6B7078] mt-0.5 line-clamp-1">{post.excerpt}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await saveNewsPostAdmin({ ...post, is_published: !post.is_published });
                toast({ title: post.is_published ? 'Article hidden' : 'Article published' });
                void refetch();
              }}
            >
              {post.is_published ? 'Published' : 'Draft'}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-2xl space-y-3">
        <h2 className="text-base font-semibold">Publish News Update</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="URL Slug" placeholder="auto-generated if blank" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <Input label="Short Summary" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <Textarea
          label="Article Content (Markdown)"
          rows={5}
          value={contentMarkdown}
          onChange={(e) => setContentMarkdown(e.target.value)}
        />
        <Button
          onClick={async () => {
            if (!title.trim()) return;
            const resolvedSlug =
              slug.trim() ||
              title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            await saveNewsPostAdmin({
              title: title.trim(),
              slug: resolvedSlug,
              excerpt: excerpt.trim(),
              content_markdown: contentMarkdown.trim() || excerpt.trim(),
              image_url: MEDIA.heroShowroomBike,
              is_published: true,
            });
            setTitle('');
            setSlug('');
            setExcerpt('');
            setContentMarkdown('');
            toast({ title: 'News update published', variant: 'success' });
            void refetch();
          }}
        >
          Publish Article
        </Button>
      </Card>
    </div>
  );
}


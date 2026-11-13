import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, MapPin, MessageCircle, Phone, Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { usePageMeta } from '../../lib/seo';
import { getStaticPage, listBranches, listFaqs } from '../../services/content';
import {
  Accordion,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  MarkdownRenderer,
  Skeleton,
} from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

export function StaticContentPage({ slug }: { slug: string }) {
  const { settings } = useSettings();
  const { data: page, isLoading } = useQuery({
    queryKey: ['static-page', slug],
    queryFn: () => getStaticPage(slug),
  });

  usePageMeta({
    title: page?.seo_title || (page ? `${page.title} | ${settings.brand_name}` : settings.brand_name),
    description: page?.seo_description || undefined,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Page not found"
          description="This information page is not published yet."
          actionLabel="Go Home"
          actionTo="/"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: page.title }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">{page.title}</h1>
      <Card className="mt-6 p-6 sm:p-8">
        <MarkdownRenderer markdown={page.content_markdown} />
      </Card>
    </div>
  );
}

export function BranchesPage() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [cityQuery, setCityQuery] = useState(searchParams.get('city') || '');

  useEffect(() => {
    const paramCity = searchParams.get('city');
    if (paramCity) setCityQuery(paramCity);
  }, [searchParams]);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => listBranches(),
  });

  usePageMeta({
    title: `Showroom Branches | ${settings.brand_name}`,
    description: 'Find showroom addresses, opening hours, contact phone numbers, and WhatsApp links.',
  });

  const filteredBranches = branches.filter((b) => {
    if (!cityQuery.trim()) return true;
    const q = cityQuery.trim().toLowerCase();
    return (
      b.city.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Branches & Dealers' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#111214]">
            Showroom &amp; Workshop Branches
          </h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            Visit any branch for test rides, token verification, accessory pickup, or service.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-[#6B7078] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Filter branches by city"
            placeholder="Enter your city (e.g. Islamabad)"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            className="h-11 w-full rounded-lg border border-[#E3E4E7] bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No branches matched your city"
            description="Try clearing the city filter to view all active showroom locations."
            actionLabel="Show All Branches"
            onAction={() => setCityQuery('')}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBranches.map((branch) => (
            <Card key={branch.id} className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-[#D71920]">{branch.city}</span>
                <h2 className="mt-1 text-xl font-bold text-[#111214]">{branch.name}</h2>
              </div>
              <p className="text-sm text-[#26282C] flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#6B7078] shrink-0 mt-0.5" />
                {branch.address}
              </p>
              <div className="text-sm text-[#26282C] space-y-1 tabular-nums">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#6B7078]" />
                  {branch.phone}
                </p>
                {branch.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#6B7078]" />
                    {branch.email}
                  </p>
                )}
              </div>
              {branch.opening_hours && (
                <div className="border-t border-[#E3E4E7] pt-3 text-xs text-[#6B7078] space-y-1">
                  {Object.entries(branch.opening_hours).map(([day, hrs]) => (
                    <div key={day} className="flex justify-between">
                      <span>{day}</span>
                      <span className="font-medium text-[#111214]">{hrs}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 flex flex-wrap gap-2">
                <Link to="/test-ride">
                  <Button size="sm">Book Test Ride</Button>
                </Link>
                <Link to="/service-booking">
                  <Button size="sm" variant="outline">
                    Book Service
                  </Button>
                </Link>
                {branch.whatsapp && (
                  <a
                    href={`https://wa.me/${branch.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="secondary">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function FaqPage() {
  const { settings } = useSettings();
  const { data: faqs = [] } = useQuery({ queryKey: ['faqs'], queryFn: () => listFaqs() });

  usePageMeta({
    title: `Frequently Asked Questions | ${settings.brand_name}`,
    description: 'Answers about bike booking tokens, installments, accessories delivery, returns, and service.',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'FAQs' }]} />
      <h1 className="mt-4 font-display text-4xl font-bold text-[#111214]">
        Frequently Asked Questions
      </h1>
      <div className="mt-8">
        <Accordion
          items={faqs.map((f) => ({
            id: f.id,
            title: f.question,
            content: f.answer,
            category: f.category,
          }))}
        />
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings } = useSettings();
  usePageMeta({
    title: `Contact Showroom | ${settings.brand_name}`,
    description: 'Get in touch with our sales, accessories, or workshop support teams.',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <h1 className="font-display text-4xl font-bold text-[#111214]">Contact Us</h1>
      <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-[#111214]">Showroom Desk</h2>
          <p className="mt-2 text-sm text-[#26282C] tabular-nums">{settings.contact_phone}</p>
          <p className="mt-1 text-sm text-[#26282C]">{settings.contact_email}</p>
          <p className="mt-2 text-xs text-[#6B7078]">{settings.business_hours}</p>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <Link to="/inquiry">
            <Button className="w-full">Send Online Inquiry</Button>
          </Link>
          <a
            href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full">
              WhatsApp Showroom
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <Logo variant="full" height={40} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#D71920]">404</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-[#111214]">Page Not Found</h1>
      <p className="mt-2 text-sm text-[#6B7078]">
        The route you requested does not exist on this showroom site.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/">
          <Button>Back to Home</Button>
        </Link>
        <Link to="/bikes">
          <Button variant="outline">Browse Bikes</Button>
        </Link>
      </div>
    </div>
  );
}

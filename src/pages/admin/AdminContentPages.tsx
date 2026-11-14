import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { MEDIA } from '../../assets/media';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { canWriteAdminModule } from '../../lib/constants';
import { formatDateKarachi, formatPKR } from '../../lib/format';
import {
  deleteCouponAdmin,
  deleteDeliveryZoneAdmin,
  listCouponsAdmin,
  saveCouponAdmin,
  saveDeliveryZoneAdmin,
} from '../../services/admin';
import {
  deleteBannerAdmin,
  deleteBranchAdmin,
  deleteFaqAdmin,
  deleteNewsPostAdmin,
  deleteOfferAdmin,
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
import { listBikes } from '../../services/bikes';
import { listAllDeliveryZonesAdmin } from '../../services/orders';
import { Button, Card, Input, Modal, Select, Textarea } from '../../components/ui/Primitives';

export function AdminBannersPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: banners = [], refetch } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => listBanners(true),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Explore Motorcycles');
  const [ctaUrl, setCtaUrl] = useState('/bikes');
  const [placement, setPlacement] = useState<'home_hero' | 'home_secondary' | 'store'>('home_hero');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setCtaLabel('Explore Motorcycles');
    setCtaUrl('/bikes');
    setPlacement('home_hero');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Banners</h1>
      <div className="space-y-3">
        {banners.map((b) => (
          <Card key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{b.title}</p>
              <p className="text-xs text-[#6B7078]">{b.placement} · {b.cta_url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveBannerAdmin({ ...b, is_active: !b.is_active });
                    toast({ title: 'Banner updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update banner',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {b.is_active ? 'Active' : 'Inactive'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit banner"
                    onClick={() => {
                      setEditingId(b.id);
                      setTitle(b.title);
                      setSubtitle(b.subtitle ?? '');
                      setCtaLabel(b.cta_label ?? 'Explore Motorcycles');
                      setCtaUrl(b.cta_url ?? '/bikes');
                      setPlacement(b.placement);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete banner"
                    onClick={() => setDeleteTargetId(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit Banner' : 'Add Banner'}</h2>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
        <Input label="Title" disabled={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Subtitle" disabled={!canWrite} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        <Select
          label="Placement"
          disabled={!canWrite}
          value={placement}
          onChange={(e) => setPlacement(e.target.value as typeof placement)}
        >
          <option value="home_hero">Home Hero</option>
          <option value="home_secondary">Home Secondary Wide Banner</option>
          <option value="store">Store Banner</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA Label" disabled={!canWrite} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          <Input label="CTA URL" disabled={!canWrite} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
        </div>
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!title.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? banners.find((x) => x.id === editingId) : undefined;
              await saveBannerAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                title: title.trim(),
                subtitle,
                image_url: current?.image_url || MEDIA.heroShowroomBike,
                cta_label: ctaLabel,
                cta_url: ctaUrl,
                placement,
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Banner updated' : 'Banner added', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save banner',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Banner' : 'Save Banner'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Banner">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this banner? This cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteBannerAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Banner deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete banner',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminOffersPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: offers = [], refetch } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: () => listOffers(true),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<'bikes' | 'accessories' | 'service' | 'all'>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setAppliesTo('all');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Offers &amp; Campaigns</h1>
      <div className="space-y-3">
        {offers.map((o) => (
          <Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{o.title}</p>
              <p className="text-xs text-[#6B7078] capitalize">{o.applies_to} · {o.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveOfferAdmin({ ...o, is_active: !o.is_active });
                    toast({ title: 'Offer updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update offer',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {o.is_active ? 'Active' : 'Inactive'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit offer"
                    onClick={() => {
                      setEditingId(o.id);
                      setTitle(o.title);
                      setDescription(o.description ?? '');
                      setAppliesTo(o.applies_to);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete offer"
                    onClick={() => setDeleteTargetId(o.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit Offer' : 'Add Offer'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <Input label="Title" disabled={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select
          label="Applies To"
          disabled={!canWrite}
          value={appliesTo}
          onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)}
        >
          <option value="all">All</option>
          <option value="bikes">Bikes</option>
          <option value="accessories">Accessories</option>
          <option value="service">Service</option>
        </Select>
        <Textarea label="Description" disabled={!canWrite} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!title.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? offers.find((x) => x.id === editingId) : undefined;
              await saveOfferAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                title: title.trim(),
                description,
                applies_to: appliesTo,
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Offer updated' : 'Offer created', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save offer',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Offer' : 'Add Offer'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Offer">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this offer?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteOfferAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Offer deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete offer',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminFaqsPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: faqs = [], refetch } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: () => listFaqs(true),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Bookings & Delivery');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setCategory('Bookings & Delivery');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">FAQs</h1>
      <div className="space-y-3">
        {faqs.map((f) => (
          <Card key={f.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#6B7078]">{f.category}</p>
              <p className="font-semibold text-sm">{f.question}</p>
              <p className="text-xs text-[#26282C] mt-1">{f.answer}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveFaqAdmin({ ...f, is_active: !f.is_active });
                    toast({ title: 'FAQ updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update FAQ',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {f.is_active ? 'Active' : 'Hidden'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit FAQ"
                    onClick={() => {
                      setEditingId(f.id);
                      setCategory(f.category);
                      setQuestion(f.question);
                      setAnswer(f.answer);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete FAQ"
                    onClick={() => setDeleteTargetId(f.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit FAQ' : 'Add FAQ'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <Input label="Category" disabled={!canWrite} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input label="Question" disabled={!canWrite} value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Textarea label="Answer" disabled={!canWrite} rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!question.trim() || !answer.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? faqs.find((x) => x.id === editingId) : undefined;
              await saveFaqAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                question: question.trim(),
                answer: answer.trim(),
                category,
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'FAQ updated' : 'FAQ added', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save FAQ',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update FAQ' : 'Save FAQ'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete FAQ">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this FAQ?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteFaqAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'FAQ deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete FAQ',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminPagesPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: pages = [], refetch } = useQuery({
    queryKey: ['admin-static-pages'],
    queryFn: listStaticPagesAdmin,
  });
  const [selectedSlug, setSelectedSlug] = useState('about');
  const active = pages.find((p) => p.slug === selectedSlug) ?? pages[0];
  const [markdown, setMarkdown] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (active) {
      setMarkdown(active.content_markdown);
    }
  }, [active?.id, active?.content_markdown]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Static Pages (Markdown)</h1>
      <Select
        label="Select Page"
        value={active?.slug || ''}
        onChange={(e) => setSelectedSlug(e.target.value)}
      >
        {pages.map((p) => (
          <option key={p.id} value={p.slug}>{p.title} (/{p.slug})</option>
        ))}
      </Select>
      {active && (
        <Card className="p-6 space-y-4">
          <Textarea
            label="Markdown Content"
            disabled={!canWrite}
            rows={10}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <Button
            disabled={!canWrite || busy}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveStaticPageAdmin({
                  ...active,
                  content_markdown: markdown,
                });
                toast({ title: 'Page saved', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Save failed',
                  description: err instanceof Error ? err.message : 'Unable to save page content',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
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
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: branches = [], refetch } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => listBranches(true),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCity('');
    setAddress('');
    setPhone('');
  };

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
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveBranchAdmin({ ...br, is_active: !br.is_active });
                    toast({ title: 'Branch updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update branch',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {br.is_active ? 'Active' : 'Inactive'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit branch"
                    onClick={() => {
                      setEditingId(br.id);
                      setName(br.name);
                      setCity(br.city);
                      setAddress(br.address);
                      setPhone(br.phone);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete branch"
                    onClick={() => setDeleteTargetId(br.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit Branch' : 'Add Branch'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Branch Name" disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="City" disabled={!canWrite} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Input label="Address" disabled={!canWrite} value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Phone" disabled={!canWrite} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!name.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? branches.find((x) => x.id === editingId) : undefined;
              await saveBranchAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                name: name.trim(),
                slug: current?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                city,
                address,
                phone,
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Branch updated' : 'Branch added', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save branch',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Branch' : 'Save Branch'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Branch">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this branch?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteBranchAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Branch deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete branch',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminCouponsPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: coupons = [], refetch } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: listCouponsAdmin,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(3000);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setValue(10);
    setMinOrder(3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Store Coupons</h1>
      <div className="space-y-3">
        {coupons.map((c) => (
          <Card key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono-tabular font-bold text-sm">{c.code}</p>
              <p className="text-xs text-[#6B7078] tabular-nums">
                {c.discount_type === 'percent' ? `${c.discount_value}% off` : formatPKR(c.discount_value)} · Min{' '}
                {formatPKR(c.min_order_amount)} · Used {c.used_count}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveCouponAdmin({ ...c, is_active: !c.is_active });
                    toast({ title: 'Coupon updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update coupon',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {c.is_active ? 'Active' : 'Disabled'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit coupon"
                    onClick={() => {
                      setEditingId(c.id);
                      setCode(c.code);
                      setValue(c.discount_value);
                      setMinOrder(c.min_order_amount);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete coupon"
                    onClick={() => setDeleteTargetId(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <Input
          label="Code"
          disabled={!canWrite}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Discount"
            type="number"
            disabled={!canWrite}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <Input
            label="Min Order (PKR)"
            type="number"
            disabled={!canWrite}
            value={minOrder}
            onChange={(e) => setMinOrder(Number(e.target.value))}
          />
        </div>
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!code.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? coupons.find((x) => x.id === editingId) : undefined;
              await saveCouponAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                code: code.trim().toUpperCase(),
                discount_type: current?.discount_type ?? 'percent',
                discount_value: value,
                min_order_amount: minOrder,
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Coupon updated' : 'Coupon created', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save coupon',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Coupon' : 'Save Coupon'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Coupon">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this coupon?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteCouponAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Coupon deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete coupon',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminDeliveryZonesPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: zones = [], refetch } = useQuery({
    queryKey: ['admin-zones'],
    queryFn: listAllDeliveryZonesAdmin,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [charge, setCharge] = useState(500);
  const [cities, setCities] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCharge(500);
    setCities('');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Delivery Zones</h1>
      <div className="space-y-3">
        {zones.map((z) => (
          <Card key={z.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">{z.name}</p>
              <p className="text-xs text-[#6B7078] tabular-nums">
                {formatPKR(z.charge)} · {z.estimated_days} · Cities: {z.cities.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await saveDeliveryZoneAdmin({ ...z, is_active: !z.is_active });
                    toast({ title: 'Delivery zone updated', variant: 'success' });
                    await refetch();
                  } catch (err) {
                    toast({
                      title: 'Update failed',
                      description: err instanceof Error ? err.message : 'Unable to update delivery zone',
                      variant: 'error',
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {z.is_active ? 'Active' : 'Inactive'}
              </Button>
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Edit zone"
                    onClick={() => {
                      setEditingId(z.id);
                      setName(z.name);
                      setCharge(z.charge);
                      setCities(z.cities.join(', '));
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete zone"
                    onClick={() => setDeleteTargetId(z.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <Input label="Zone Name" disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Courier Fee (PKR)" type="number" disabled={!canWrite} value={charge} onChange={(e) => setCharge(Number(e.target.value))} />
        <Input label="Cities (comma-separated)" disabled={!canWrite} value={cities} onChange={(e) => setCities(e.target.value)} />
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!name.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? zones.find((x) => x.id === editingId) : undefined;
              await saveDeliveryZoneAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                name: name.trim(),
                charge,
                cities: cities.split(',').map((s) => s.trim()).filter(Boolean),
                is_active: current?.is_active ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Zone updated' : 'Zone added', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save delivery zone',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Zone' : 'Save Zone'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Delivery Zone">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this delivery zone?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteDeliveryZoneAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Zone deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete delivery zone',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminNewsPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'content');
  const { data: posts = [], refetch } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => listNewsPosts(true),
  });
  const { data: bikes = [] } = useQuery({
    queryKey: ['admin-bikes'],
    queryFn: () => listBikes({ includeDrafts: true }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [relatedModelId, setRelatedModelId] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContentMarkdown('');
    setRelatedModelId('');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">News &amp; Updates</h1>

      <div className="space-y-3">
        {posts.map((post) => {
          const linkedBike = post.related_model_id
            ? bikes.find((b) => b.id === post.related_model_id)
            : undefined;
          return (
            <Card key={post.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#6B7078] tabular-nums">
                  {formatDateKarachi(post.published_at)}
                  {linkedBike ? ` · Linked Bike: ${linkedBike.name}` : ''}
                </p>
                <p className="font-semibold text-sm text-[#111214]">{post.title}</p>
                <p className="text-xs text-[#6B7078] mt-0.5 line-clamp-1">{post.excerpt}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canWrite || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await saveNewsPostAdmin({ ...post, is_published: !post.is_published });
                      toast({ title: post.is_published ? 'Article hidden' : 'Article published' });
                      await refetch();
                    } catch (err) {
                      toast({
                        title: 'Update failed',
                        description: err instanceof Error ? err.message : 'Unable to update article',
                        variant: 'error',
                      });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {post.is_published ? 'Published' : 'Draft'}
                </Button>
                {canWrite && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Edit article"
                      onClick={() => {
                        setEditingId(post.id);
                        setTitle(post.title);
                        setSlug(post.slug);
                        setExcerpt(post.excerpt);
                        setContentMarkdown(post.content_markdown);
                        setRelatedModelId(post.related_model_id ?? '');
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete article"
                      onClick={() => setDeleteTargetId(post.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#C0262D]" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 max-w-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editingId ? 'Edit News Update' : 'Publish News Update'}</h2>
          {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Headline" disabled={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="URL Slug" disabled={!canWrite} placeholder="auto-generated if blank" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <Input label="Short Summary" disabled={!canWrite} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <Select
          label="Linked Motorcycle Model (Optional — enables 360° card rotation)"
          disabled={!canWrite}
          value={relatedModelId}
          onChange={(e) => setRelatedModelId(e.target.value)}
        >
          <option value="">None (show article image)</option>
          {bikes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.engine_cc} cc)
            </option>
          ))}
        </Select>
        <Textarea
          label="Article Content (Markdown)"
          disabled={!canWrite}
          rows={5}
          value={contentMarkdown}
          onChange={(e) => setContentMarkdown(e.target.value)}
        />
        <Button
          disabled={!canWrite || busy}
          loading={busy}
          onClick={async () => {
            if (!title.trim()) return;
            setBusy(true);
            try {
              const current = editingId ? posts.find((x) => x.id === editingId) : undefined;
              const resolvedSlug =
                slug.trim() ||
                title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '');
              await saveNewsPostAdmin({
                ...(current ?? {}),
                ...(editingId ? { id: editingId } : {}),
                title: title.trim(),
                slug: resolvedSlug,
                excerpt: excerpt.trim(),
                content_markdown: contentMarkdown.trim() || excerpt.trim(),
                image_url: current?.image_url || MEDIA.heroShowroomBike,
                related_model_id: relatedModelId || null,
                is_published: current?.is_published ?? true,
              });
              resetForm();
              toast({ title: editingId ? 'Article updated' : 'News update published', variant: 'success' });
              await refetch();
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Unable to save article',
                variant: 'error',
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {editingId ? 'Update Article' : 'Publish Article'}
        </Button>
      </Card>

      <Modal open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)} title="Delete Article">
        <p className="text-sm text-[#26282C]">Are you sure you want to delete this news article?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            size="sm"
            loading={busy}
            onClick={async () => {
              if (!deleteTargetId) return;
              setBusy(true);
              try {
                await deleteNewsPostAdmin(deleteTargetId);
                if (editingId === deleteTargetId) resetForm();
                setDeleteTargetId(null);
                toast({ title: 'Article deleted', variant: 'success' });
                await refetch();
              } catch (err) {
                toast({
                  title: 'Delete failed',
                  description: err instanceof Error ? err.message : 'Unable to delete article',
                  variant: 'error',
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

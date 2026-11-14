import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { canWriteAdminModule } from '../../lib/constants';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import {
  deleteAccessory,
  getAccessoryById,
  listAccessories,
  listAccessoryCategories,
  saveAccessory,
} from '../../services/accessories';
import {
  deleteBikeModel,
  getBikeById,
  getTotalAvailableBikeStock,
  listBikeCategories,
  listBikes,
  listPriceHistory,
  saveBikeModel,
  updateBikeStockRow,
} from '../../services/bikes';
import { listBranches } from '../../services/content';
import { uploadFileToBucket } from '../../services/storage';
import type {
  AccessoryImage,
  AccessoryVariant,
  BikeColor,
  BikeImage,
  BikeStock,
  BikeVariant,
  BikeViewAngle,
  PublishStatus,
} from '../../types/database';
import { Button, Card, FileUploader, Input, Modal, SafeImage, Select, StatusChip, Textarea } from '../../components/ui/Primitives';

function formatExtraSpecs(specs: Array<{ label: string; value: string }>): string {
  return (specs ?? []).map((s) => `${s.label}: ${s.value}`).join('\n');
}

function parseExtraSpecs(raw: string): Array<{ label: string; value: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { label: 'Spec', value: line };
      return {
        label: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
      };
    })
    .filter((item) => item.label && item.value);
}

export function AdminBikesPage() {
  const { roles } = useAuth();
  const canWrite = canWriteAdminModule(roles, 'bikes');
  const { data: bikes = [] } = useQuery({
    queryKey: ['admin-bikes'],
    queryFn: () => listBikes({ includeDrafts: true }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Motorcycles</h1>
        {canWrite && (
          <Link to="/admin/bikes/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Bike Model
            </Button>
          </Link>
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Model</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">CC</th>
              <th className="p-3.5">Starting Price</th>
              <th className="p-3.5">Stock</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {bikes.map((b) => {
              const prices = (b.variants ?? []).map((v) => v.ex_showroom_price);
              const price = prices.length > 0 ? Math.min(...prices) : null;
              return (
                <tr key={b.id} className="hover:bg-[#F5F5F6]/50">
                  <td className="p-3.5 font-semibold">{b.name}</td>
                  <td className="p-3.5 text-[#6B7078]">{b.category?.name}</td>
                  <td className="p-3.5 tabular-nums">{b.engine_cc} cc</td>
                  <td className="p-3.5 tabular-nums font-medium">
                    {price !== null ? formatPKR(price) : '—'}
                  </td>
                  <td className="p-3.5 tabular-nums">{getTotalAvailableBikeStock(b)}</td>
                  <td className="p-3.5"><StatusChip status={b.status} /></td>
                  <td className="p-3.5 text-right">
                    <Link to={`/admin/bikes/${b.id}`} className="text-xs font-semibold text-[#D71920] hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminBikeEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'bikes');

  const { data: categories = [] } = useQuery({ queryKey: ['bike-categories'], queryFn: listBikeCategories });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches(true) });
  const { data: existing } = useQuery({
    queryKey: ['admin-bike', id],
    queryFn: () => getBikeById(id!),
    enabled: !isNew && Boolean(id),
  });

  const variantIds = (existing?.variants ?? []).map((v) => v.id);
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['bike-price-history', variantIds],
    queryFn: () => listPriceHistory(variantIds),
    enabled: variantIds.length > 0,
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [engineCc, setEngineCc] = useState(125);
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PublishStatus>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState<Array<Omit<BikeVariant, 'model_id'>>>([]);
  const [colors, setColors] = useState<Array<Omit<BikeColor, 'model_id'>>>([]);
  const [images, setImages] = useState<Array<Omit<BikeImage, 'model_id'>>>([]);
  const [stock, setStock] = useState<BikeStock[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setCategoryId(existing.category_id);
      setEngineCc(existing.engine_cc);
      setTagline(existing.tagline || '');
      setDescription(existing.description || '');
      setStatus(existing.status);
      setIsFeatured(existing.is_featured);
      setVariants(existing.variants ?? []);
      setColors(existing.colors ?? []);
      setImages(existing.images ?? []);
      setStock(existing.stock ?? []);
    } else if (isNew && categories.length > 0 && variants.length === 0) {
      setCategoryId(categories[0].id);
      const varId = crypto.randomUUID();
      const colId = crypto.randomUUID();
      setVariants([
        {
          id: varId,
          name: 'Standard',
          sku: `NEW-${Date.now().toString().slice(-4)}`,
          ex_showroom_price: 200000,
          engine_type: '4-Stroke Air-Cooled',
          displacement_cc: 125,
          max_power: '11 HP',
          max_torque: '10 Nm',
          mileage_kmpl: 45,
          fuel_tank_l: 9,
          kerb_weight_kg: 100,
          seat_height_mm: 780,
          ground_clearance_mm: 140,
          front_brake: 'Drum',
          rear_brake: 'Drum',
          front_tyre: '2.50 - 18',
          rear_tyre: '3.00 - 17',
          starting: 'Kick Start',
          transmission: '4-Speed',
          features: ['Tubular Frame'],
          specs: [],
          warranty_note: '3 Years Engine Warranty',
          is_active: true,
          sort_order: 1,
        },
      ]);
      setColors([{ id: colId, name: 'Crimson Red', hex_code: '#D71920', sort_order: 1 }]);
      if (branches[0]) {
        setStock([{ id: crypto.randomUUID(), variant_id: varId, color_id: colId, branch_id: branches[0].id, quantity: 5, reserved: 0 }]);
      }
    }
  }, [existing, isNew, categories, branches, variants.length]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !user) return;
    if (variants.length === 0) {
      toast({ title: 'At least one variant is required', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveBikeModel(
        {
          id: isNew ? undefined : id,
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category_id: categoryId || categories[0]?.id,
          engine_cc: Number(engineCc),
          tagline: tagline || null,
          description: description || null,
          status,
          is_featured: isFeatured,
          seo_title: `${name} Price & Specs`,
          seo_description: tagline || null,
          variants,
          colors,
          images,
          stock,
        },
        user.id
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-bikes'] });
      await queryClient.invalidateQueries({ queryKey: ['bikes-published'] });
      toast({ title: 'Motorcycle saved', variant: 'success' });
      if (isNew) navigate(`/admin/bikes/${saved.id}`);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save bike',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!canWrite || isNew || !id) return;
    setDeleting(true);
    try {
      await deleteBikeModel(id);
      await queryClient.invalidateQueries({ queryKey: ['admin-bikes'] });
      await queryClient.invalidateQueries({ queryKey: ['bikes-published'] });
      toast({ title: 'Motorcycle deleted', variant: 'success' });
      navigate('/admin/bikes');
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete bike model',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const updateVariantField = <K extends keyof Omit<BikeVariant, 'model_id'>>(
    idx: number,
    key: K,
    value: Omit<BikeVariant, 'model_id'>[K]
  ) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">
          {isNew ? 'New Motorcycle Model' : `Edit: ${existing?.name || 'Bike'}`}
        </h1>
        <div className="flex items-center gap-2">
          <Link to="/admin/bikes">
            <Button type="button" variant="outline">Back</Button>
          </Link>
          {!isNew && canWrite && (
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Model
            </Button>
          )}
          {canWrite && (
            <Button type="submit" loading={saving}>
              Save Model
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">General Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Model Name" required disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="URL Slug" required disabled={!canWrite} value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Select label="Category" disabled={!canWrite} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Engine CC" type="number" disabled={!canWrite} value={engineCc} onChange={(e) => setEngineCc(Number(e.target.value))} />
          <Select label="Publish Status" disabled={!canWrite} value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium cursor-pointer">
            <input type="checkbox" disabled={!canWrite} checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-[#D71920]" />
            Featured on Home Page
          </label>
        </div>
        <Input label="Tagline" disabled={!canWrite} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <Textarea label="Description" rows={3} disabled={!canWrite} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111214]">Variants, Ex-Showroom Pricing &amp; Specs</h2>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    name: 'New Variant',
                    sku: `SKU-${Date.now().toString().slice(-4)}`,
                    ex_showroom_price: 200000,
                    engine_type: null,
                    displacement_cc: engineCc,
                    max_power: null,
                    max_torque: null,
                    mileage_kmpl: null,
                    fuel_tank_l: null,
                    kerb_weight_kg: null,
                    seat_height_mm: null,
                    ground_clearance_mm: null,
                    front_brake: null,
                    rear_brake: null,
                    front_tyre: null,
                    rear_tyre: null,
                    starting: null,
                    transmission: null,
                    features: [],
                    specs: [],
                    warranty_note: null,
                    is_active: true,
                    sort_order: prev.length + 1,
                  },
                ])
              }
            >
              Add Variant
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {variants.map((v, idx) => (
            <div key={v.id} className="rounded-lg border border-[#E3E4E7] p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7078]">
                  Variant #{idx + 1}
                </span>
                {canWrite && variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setVariants((prev) => prev.filter((x) => x.id !== v.id));
                      setStock((prev) => prev.filter((s) => s.variant_id !== v.id));
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C0262D] hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Variant
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input label="Variant Name" disabled={!canWrite} value={v.name} onChange={(e) => updateVariantField(idx, 'name', e.target.value)} />
                <Input label="SKU" disabled={!canWrite} value={v.sku} onChange={(e) => updateVariantField(idx, 'sku', e.target.value)} />
                <Input
                  label="Ex-Showroom Price (PKR)"
                  type="number"
                  disabled={!canWrite}
                  value={v.ex_showroom_price}
                  onChange={(e) => updateVariantField(idx, 'ex_showroom_price', Number(e.target.value))}
                />
                <Input
                  label="Mileage (km/l)"
                  type="number"
                  disabled={!canWrite}
                  value={v.mileage_kmpl ?? ''}
                  onChange={(e) => updateVariantField(idx, 'mileage_kmpl', e.target.value ? Number(e.target.value) : null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Engine Type"
                  disabled={!canWrite}
                  value={v.engine_type ?? ''}
                  onChange={(e) => updateVariantField(idx, 'engine_type', e.target.value || null)}
                />
                <Input
                  label="Displacement (cc)"
                  type="number"
                  disabled={!canWrite}
                  value={v.displacement_cc ?? ''}
                  onChange={(e) => updateVariantField(idx, 'displacement_cc', e.target.value ? Number(e.target.value) : null)}
                />
                <Input
                  label="Max Power"
                  disabled={!canWrite}
                  value={v.max_power ?? ''}
                  onChange={(e) => updateVariantField(idx, 'max_power', e.target.value || null)}
                />
                <Input
                  label="Max Torque"
                  disabled={!canWrite}
                  value={v.max_torque ?? ''}
                  onChange={(e) => updateVariantField(idx, 'max_torque', e.target.value || null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Transmission"
                  disabled={!canWrite}
                  value={v.transmission ?? ''}
                  onChange={(e) => updateVariantField(idx, 'transmission', e.target.value || null)}
                />
                <Input
                  label="Starting System"
                  disabled={!canWrite}
                  value={v.starting ?? ''}
                  onChange={(e) => updateVariantField(idx, 'starting', e.target.value || null)}
                />
                <Input
                  label="Front Brake"
                  disabled={!canWrite}
                  value={v.front_brake ?? ''}
                  onChange={(e) => updateVariantField(idx, 'front_brake', e.target.value || null)}
                />
                <Input
                  label="Rear Brake"
                  disabled={!canWrite}
                  value={v.rear_brake ?? ''}
                  onChange={(e) => updateVariantField(idx, 'rear_brake', e.target.value || null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Front Tyre"
                  disabled={!canWrite}
                  value={v.front_tyre ?? ''}
                  onChange={(e) => updateVariantField(idx, 'front_tyre', e.target.value || null)}
                />
                <Input
                  label="Rear Tyre"
                  disabled={!canWrite}
                  value={v.rear_tyre ?? ''}
                  onChange={(e) => updateVariantField(idx, 'rear_tyre', e.target.value || null)}
                />
                <Input
                  label="Fuel Tank (L)"
                  type="number"
                  step="0.1"
                  disabled={!canWrite}
                  value={v.fuel_tank_l ?? ''}
                  onChange={(e) => updateVariantField(idx, 'fuel_tank_l', e.target.value ? Number(e.target.value) : null)}
                />
                <Input
                  label="Kerb Weight (kg)"
                  type="number"
                  disabled={!canWrite}
                  value={v.kerb_weight_kg ?? ''}
                  onChange={(e) => updateVariantField(idx, 'kerb_weight_kg', e.target.value ? Number(e.target.value) : null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Seat Height (mm)"
                  type="number"
                  disabled={!canWrite}
                  value={v.seat_height_mm ?? ''}
                  onChange={(e) => updateVariantField(idx, 'seat_height_mm', e.target.value ? Number(e.target.value) : null)}
                />
                <Input
                  label="Ground Clearance (mm)"
                  type="number"
                  disabled={!canWrite}
                  value={v.ground_clearance_mm ?? ''}
                  onChange={(e) => updateVariantField(idx, 'ground_clearance_mm', e.target.value ? Number(e.target.value) : null)}
                />
                <Input
                  label="Warranty Note"
                  disabled={!canWrite}
                  value={v.warranty_note ?? ''}
                  onChange={(e) => updateVariantField(idx, 'warranty_note', e.target.value || null)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Highlights / Features (comma-separated)"
                  disabled={!canWrite}
                  value={(v.features ?? []).join(', ')}
                  onChange={(e) =>
                    updateVariantField(
                      idx,
                      'features',
                      e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean)
                    )
                  }
                />
                <Textarea
                  label="Additional Specs (one per line: Label: Value)"
                  rows={2}
                  disabled={!canWrite}
                  value={formatExtraSpecs(v.specs ?? [])}
                  onChange={(e) => updateVariantField(idx, 'specs', parseExtraSpecs(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111214]">Colors</h2>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setColors((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), name: 'Matte Black', hex_code: '#18191B', sort_order: prev.length + 1 },
                ])
              }
            >
              Add Color
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colors.map((c, idx) => (
            <div key={c.id} className="flex items-end gap-2">
              <Input
                label="Color Name"
                disabled={!canWrite}
                value={c.name}
                onChange={(e) => {
                  const next = [...colors];
                  next[idx] = { ...c, name: e.target.value };
                  setColors(next);
                }}
              />
              <Input
                label="Hex"
                disabled={!canWrite}
                value={c.hex_code}
                onChange={(e) => {
                  const next = [...colors];
                  next[idx] = { ...c, hex_code: e.target.value };
                  setColors(next);
                }}
              />
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setColors(colors.filter((x) => x.id !== c.id))}
                  className="h-11 px-2 text-[#6B7078] hover:text-[#C0262D] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#111214]">Bike Gallery Images &amp; 360° Angles</h2>
          <p className="text-xs text-[#6B7078]">
            Recommended: upload identical aspect-ratio photos (e.g. 1200×800 WebP, PNG, or JPG, ≤ 5 MB) with a clean, consistent studio or transparent background for smooth Front → Right → Back → Left rotation. Drag cards or use arrows to reorder.
          </p>
        </div>
        {canWrite && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FileUploader
              label="Upload Photo (JPG, PNG, WebP)"
              multiple
              maxFiles={8}
              uploading={uploadingImage}
              hint="Max 8 files, up to 5 MB each · Identical size & clean background recommended"
              onFilesSelected={async (files) => {
                setUploadingImage(true);
                try {
                  const uploaded = await Promise.all(
                    files.map((file) => uploadFileToBucket('bike-images', slug || 'model', file))
                  );
                  const defaultAngles: BikeViewAngle[] = ['front', 'right', 'back', 'left'];
                  setImages((prev) => [
                    ...prev,
                    ...uploaded.map((u, idx) => ({
                      id: crypto.randomUUID(),
                      color_id: colors[0]?.id ?? null,
                      url: u.url,
                      storage_path: u.path,
                      alt_text: `${name || 'Bike'} view ${prev.length + idx + 1}`,
                      sort_order: prev.length + idx + 1,
                      is_primary: prev.length === 0 && idx === 0,
                      view_angle: prev.length + idx < defaultAngles.length ? defaultAngles[prev.length + idx] : null,
                    })),
                  ]);
                  toast({ title: 'Images added', variant: 'success' });
                } catch (err) {
                  toast({
                    title: 'Upload failed',
                    description: err instanceof Error ? err.message : 'Unable to upload image',
                    variant: 'error',
                  });
                } finally {
                  setUploadingImage(false);
                }
              }}
            />
            <div className="flex gap-2 items-end">
              <Input
                label="Or Add Image URL"
                placeholder="https://..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!imageUrlInput.trim()) return;
                  setImages((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      color_id: colors[0]?.id ?? null,
                      url: imageUrlInput.trim(),
                      storage_path: null,
                      alt_text: `${name || 'Bike'} image`,
                      sort_order: prev.length + 1,
                      is_primary: prev.length === 0,
                      view_angle: prev.length === 0 ? 'front' : null,
                    },
                  ]);
                  setImageUrlInput('');
                }}
              >
                Add URL
              </Button>
            </div>
          </div>
        )}

        {images.length > 0 && (() => {
          const ANGLE_META: Array<{ key: BikeViewAngle; label: string }> = [
            { key: 'front', label: 'Front' },
            { key: 'right', label: 'Right' },
            { key: 'back', label: 'Back' },
            { key: 'left', label: 'Left' },
          ];

          const reorderImages = (fromId: string, toId: string) => {
            if (fromId === toId) return;
            setImages((prev) => {
              const fromIdx = prev.findIndex((x) => x.id === fromId);
              const toIdx = prev.findIndex((x) => x.id === toId);
              if (fromIdx === -1 || toIdx === -1) return prev;
              const copy = [...prev];
              const [moved] = copy.splice(fromIdx, 1);
              copy.splice(toIdx, 0, moved);
              return copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
            });
          };

          const moveImageByOffset = (imageId: string, delta: -1 | 1) => {
            setImages((prev) => {
              const idx = prev.findIndex((x) => x.id === imageId);
              const targetIdx = idx + delta;
              if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
              const copy = [...prev];
              const [moved] = copy.splice(idx, 1);
              copy.splice(targetIdx, 0, moved);
              return copy.map((item, i) => ({ ...item, sort_order: i + 1 }));
            });
          };

          const colorIdsInColors = new Set(colors.map((c) => c.id));
          const groups: Array<{
            key: string;
            label: string;
            hex?: string;
            items: Array<Omit<BikeImage, 'model_id'>>;
          }> = [
            ...colors.map((c) => ({
              key: c.id,
              label: c.name,
              hex: c.hex_code,
              items: images.filter((img) => img.color_id === c.id),
            })),
          ];

          const unassignedOrOther = images.filter((img) => !img.color_id || !colorIdsInColors.has(img.color_id));
          if (unassignedOrOther.length > 0) {
            groups.push({
              key: '__all__',
              label: 'All Colors / General Gallery',
              items: unassignedOrOther,
            });
          }

          return (
            <div className="space-y-6 pt-2">
              {groups.map((group) => {
                if (group.items.length === 0) return null;
                const presentAngles = new Set(
                  group.items.map((i) => i.view_angle).filter((a): a is BikeViewAngle => Boolean(a))
                );
                const missingAngles = ANGLE_META.filter((a) => !presentAngles.has(a.key));

                return (
                  <div key={group.key} className="rounded-xl border border-[#E3E4E7] bg-[#F5F5F6]/50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {group.hex && (
                          <span
                            className="h-4 w-4 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: group.hex }}
                          />
                        )}
                        <h3 className="text-sm font-semibold text-[#111214]">{group.label}</h3>
                        <span className="text-xs text-[#6B7078] tabular-nums">({group.items.length} image{group.items.length === 1 ? '' : 's'})</span>
                      </div>

                      {missingAngles.length === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#1E8E4E]/25 bg-[#1E8E4E]/10 px-2 py-0.5 text-xs font-medium text-[#1E8E4E]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          4/4 Angles Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#B7791F]/30 bg-[#B7791F]/10 px-2 py-0.5 text-xs font-medium text-[#B7791F]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Missing: {missingAngles.map((m) => m.label).join(', ')} (rotation skips missing views)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((img) => {
                        const globalIdx = images.findIndex((x) => x.id === img.id);
                        return (
                          <div
                            key={img.id}
                            draggable={canWrite}
                            onDragStart={() => setDraggedImageId(img.id)}
                            onDragOver={(e) => {
                              if (canWrite) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedImageId && draggedImageId !== img.id) {
                                reorderImages(draggedImageId, img.id);
                              }
                              setDraggedImageId(null);
                            }}
                            onDragEnd={() => setDraggedImageId(null)}
                            className={`rounded-lg border bg-white p-3 space-y-2.5 transition-all ${
                              draggedImageId === img.id ? 'opacity-60 border-[#D71920]' : 'border-[#E3E4E7]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs text-[#6B7078]">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <GripVertical className="h-4 w-4 cursor-grab" />
                                #{globalIdx + 1}
                              </span>
                              {canWrite && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label="Move image up"
                                    disabled={globalIdx <= 0}
                                    onClick={() => moveImageByOffset(img.id, -1)}
                                    className="p-1 rounded hover:bg-[#F5F5F6] disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Move image down"
                                    disabled={globalIdx >= images.length - 1}
                                    onClick={() => moveImageByOffset(img.id, 1)}
                                    className="p-1 rounded hover:bg-[#F5F5F6] disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="relative overflow-hidden rounded-md bg-[#F5F5F6]">
                              <SafeImage src={img.url} alt={img.alt_text} className="h-32 w-full rounded-md bg-[#F5F5F6]" />
                              {img.view_angle && (
                                <span className="absolute top-1.5 left-1.5 rounded bg-[#111214]/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                  {img.view_angle}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                label="Color"
                                disabled={!canWrite}
                                value={img.color_id || ''}
                                onChange={(e) => {
                                  setImages((prev) =>
                                    prev.map((x) => (x.id === img.id ? { ...x, color_id: e.target.value || null } : x))
                                  );
                                }}
                              >
                                <option value="">All Colors</option>
                                {colors.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </Select>

                              <Select
                                label="View Angle"
                                disabled={!canWrite}
                                value={img.view_angle || ''}
                                onChange={(e) => {
                                  const nextAngle = (e.target.value || null) as BikeViewAngle | null;
                                  setImages((prev) =>
                                    prev.map((x) => (x.id === img.id ? { ...x, view_angle: nextAngle } : x))
                                  );
                                }}
                              >
                                <option value="front">Front</option>
                                <option value="right">Right</option>
                                <option value="back">Back</option>
                                <option value="left">Left</option>
                                <option value="">Other / Gallery</option>
                              </Select>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name="primary-bike-img"
                                  disabled={!canWrite}
                                  checked={img.is_primary}
                                  onChange={() =>
                                    setImages((prev) => prev.map((x) => ({ ...x, is_primary: x.id === img.id })))
                                  }
                                  className="accent-[#D71920]"
                                />
                                Primary
                              </label>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setImages((prev) =>
                                      prev
                                        .filter((x) => x.id !== img.id)
                                        .map((item, i) => ({ ...item, sort_order: i + 1 }))
                                    )
                                  }
                                  className="text-xs text-[#C0262D] hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {priceHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-[#111214] mb-3">Price Change History</h2>
          <ul className="divide-y divide-[#E3E4E7] text-sm tabular-nums">
            {priceHistory.map((h) => (
              <li key={h.id} className="py-2 flex justify-between">
                <span>
                  {formatPKR(h.old_price)} → <strong>{formatPKR(h.new_price)}</strong>
                </span>
                <span className="text-xs text-[#6B7078]">{formatDateTimeKarachi(h.changed_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Motorcycle Model">
        <div className="space-y-4">
          <p className="text-sm text-[#26282C]">
            Are you sure you want to delete <strong>{existing?.name || name}</strong>? Variants, colors, and unbooked stock rows will be removed.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" loading={deleting} onClick={() => void handleDeleteModel()}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

export function AdminStockPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'stock');
  const { data: bikes = [], refetch } = useQuery({
    queryKey: ['admin-bikes'],
    queryFn: () => listBikes({ includeDrafts: true }),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => listBranches(true) });

  const [newBikeId, setNewBikeId] = useState('');
  const [newVariantId, setNewVariantId] = useState('');
  const [newColorId, setNewColorId] = useState('');
  const [newBranchId, setNewBranchId] = useState('');
  const [newQty, setNewQty] = useState(5);
  const [addingRow, setAddingRow] = useState(false);

  const selectedBike = bikes.find((b) => b.id === newBikeId) ?? bikes[0];
  const effectiveBikeId = selectedBike?.id || '';
  const effectiveVariantId =
    selectedBike?.variants?.some((v) => v.id === newVariantId)
      ? newVariantId
      : selectedBike?.variants?.[0]?.id || '';
  const effectiveColorId =
    selectedBike?.colors?.some((c) => c.id === newColorId)
      ? newColorId
      : selectedBike?.colors?.[0]?.id || '';
  const effectiveBranchId = newBranchId || branches[0]?.id || '';

  const handleQtyChange = async (row: BikeStock, quantity: number) => {
    try {
      await updateBikeStockRow({ ...row, quantity: Math.max(0, quantity) });
      toast({ title: 'Stock updated', variant: 'success' });
      void refetch();
    } catch (err) {
      toast({
        title: 'Stock update failed',
        description: err instanceof Error ? err.message : 'Unable to update stock',
        variant: 'error',
      });
    }
  };

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !effectiveBikeId || !effectiveVariantId || !effectiveColorId || !effectiveBranchId) {
      toast({ title: 'Select bike variant, color, and branch', variant: 'error' });
      return;
    }
    setAddingRow(true);
    try {
      await updateBikeStockRow({
        variant_id: effectiveVariantId,
        color_id: effectiveColorId,
        branch_id: effectiveBranchId,
        quantity: Math.max(0, newQty),
        reserved: 0,
      });
      toast({ title: 'Stock row saved', variant: 'success' });
      void refetch();
    } catch (err) {
      toast({
        title: 'Could not add stock row',
        description: err instanceof Error ? err.message : 'Unable to save stock row',
        variant: 'error',
      });
    } finally {
      setAddingRow(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Bike Inventory by Branch</h1>

      {canWrite && bikes.length > 0 && branches.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[#111214] mb-3">Add or Update Branch Stock Row</h2>
          <form onSubmit={handleAddRow} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <Select
              label="Model"
              value={effectiveBikeId}
              onChange={(e) => {
                setNewBikeId(e.target.value);
                setNewVariantId('');
                setNewColorId('');
              }}
            >
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <Select label="Variant" value={effectiveVariantId} onChange={(e) => setNewVariantId(e.target.value)}>
              {(selectedBike?.variants ?? []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
            <Select label="Color" value={effectiveColorId} onChange={(e) => setNewColorId(e.target.value)}>
              {(selectedBike?.colors ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label="Branch" value={effectiveBranchId} onChange={(e) => setNewBranchId(e.target.value)}>
              {branches.map((br) => (
                <option key={br.id} value={br.id}>{br.city} — {br.name}</option>
              ))}
            </Select>
            <div className="flex gap-2 items-end">
              <Input
                label="Qty"
                type="number"
                min={0}
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
              />
              <Button type="submit" loading={addingRow}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Bike &amp; Variant</th>
              <th className="p-3.5">Color</th>
              <th className="p-3.5">Branch</th>
              <th className="p-3.5">Quantity</th>
              <th className="p-3.5">Reserved</th>
              <th className="p-3.5">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {bikes.flatMap((b) =>
              (b.stock ?? []).map((st) => {
                const v = b.variants?.find((x) => x.id === st.variant_id);
                const c = b.colors?.find((x) => x.id === st.color_id);
                const br = branches.find((x) => x.id === st.branch_id);
                return (
                  <tr key={st.id}>
                    <td className="p-3.5 font-medium">{b.name} — {v?.name}</td>
                    <td className="p-3.5">{c?.name}</td>
                    <td className="p-3.5 text-[#6B7078]">{br?.city || br?.name}</td>
                    <td className="p-3.5">
                      <input
                        key={`${st.id}-${st.quantity}`}
                        type="number"
                        min={0}
                        disabled={!canWrite}
                        defaultValue={st.quantity}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (!Number.isNaN(next) && next !== st.quantity) {
                            void handleQtyChange(st, next);
                          }
                        }}
                        className="w-20 h-9 rounded border border-[#E3E4E7] px-2 text-sm tabular-nums"
                      />
                    </td>
                    <td className="p-3.5 tabular-nums text-[#B7791F]">{st.reserved}</td>
                    <td className="p-3.5 tabular-nums font-bold">{Math.max(0, st.quantity - st.reserved)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminAccessoriesPage() {
  const { roles } = useAuth();
  const canWrite = canWriteAdminModule(roles, 'accessories');
  const { data: items = [] } = useQuery({
    queryKey: ['admin-accessories'],
    queryFn: () => listAccessories({ includeDrafts: true }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Accessories &amp; Parts</h1>
        {canWrite && (
          <Link to="/admin/accessories/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Accessory
            </Button>
          </Link>
        )}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Product</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Base Price</th>
              <th className="p-3.5">Total Stock</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-[#F5F5F6]/50">
                <td className="p-3.5 font-semibold">{a.name}</td>
                <td className="p-3.5 text-[#6B7078]">{a.category?.name}</td>
                <td className="p-3.5 tabular-nums">{formatPKR(a.base_price)}</td>
                <td className="p-3.5 tabular-nums">
                  {(a.variants ?? []).reduce((s, v) => s + v.stock_quantity, 0)}
                </td>
                <td className="p-3.5"><StatusChip status={a.status} /></td>
                <td className="p-3.5 text-right">
                  <Link to={`/admin/accessories/${a.id}`} className="text-xs font-semibold text-[#D71920] hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminAccessoryEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const { toast } = useToast();
  const canWrite = canWriteAdminModule(roles, 'accessories');

  const { data: categories = [] } = useQuery({ queryKey: ['accessory-categories'], queryFn: listAccessoryCategories });
  const { data: bikes = [] } = useQuery({ queryKey: ['admin-bikes'], queryFn: () => listBikes({ includeDrafts: true }) });
  const { data: existing } = useQuery({
    queryKey: ['admin-acc', id],
    queryFn: () => getAccessoryById(id!),
    enabled: !isNew && Boolean(id),
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('Showroom Pro Gear');
  const [basePrice, setBasePrice] = useState(5000);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PublishStatus>('draft');
  const [compatibleIds, setCompatibleIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<Array<Omit<AccessoryVariant, 'accessory_id'>>>([]);
  const [images, setImages] = useState<Array<Omit<AccessoryImage, 'accessory_id'>>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setCategoryId(existing.category_id);
      setBrand(existing.brand || '');
      setBasePrice(existing.base_price);
      setDescription(existing.description || '');
      setStatus(existing.status);
      setCompatibleIds(existing.compatible_model_ids ?? []);
      setVariants(existing.variants ?? []);
      setImages(existing.images ?? []);
    } else if (isNew && categories.length > 0 && variants.length === 0) {
      setCategoryId(categories[0].id);
      setVariants([
        {
          id: crypto.randomUUID(),
          sku: `ACC-${Date.now().toString().slice(-4)}`,
          size: 'Standard',
          color: 'Black',
          price: 5000,
          stock_quantity: 10,
          is_active: true,
        },
      ]);
    }
  }, [existing, isNew, categories, variants.length]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (variants.length === 0) {
      toast({ title: 'At least one variant is required', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAccessory({
        id: isNew ? undefined : id,
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category_id: categoryId || categories[0]?.id,
        description: description || null,
        brand: brand || null,
        base_price: Number(basePrice),
        compare_at_price: null,
        status,
        is_featured: true,
        seo_title: name,
        seo_description: description || null,
        variants,
        images,
        compatible_model_ids: compatibleIds,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-accessories'] });
      toast({ title: 'Accessory saved', variant: 'success' });
      if (isNew) navigate(`/admin/accessories/${saved.id}`);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save accessory',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canWrite || isNew || !id) return;
    setDeleting(true);
    try {
      await deleteAccessory(id);
      await queryClient.invalidateQueries({ queryKey: ['admin-accessories'] });
      toast({ title: 'Accessory deleted', variant: 'success' });
      navigate('/admin/accessories');
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unable to delete accessory',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">
          {isNew ? 'New Accessory' : `Edit: ${existing?.name || ''}`}
        </h1>
        <div className="flex gap-2">
          <Link to="/admin/accessories"><Button type="button" variant="outline">Back</Button></Link>
          {!isNew && canWrite && (
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Accessory
            </Button>
          )}
          {canWrite && <Button type="submit" loading={saving}>Save Accessory</Button>}
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Product Name" required disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" required disabled={!canWrite} value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Select label="Category" disabled={!canWrite} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Brand" disabled={!canWrite} value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Input label="Base Price (PKR)" type="number" disabled={!canWrite} value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
          <Select label="Status" disabled={!canWrite} value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <Textarea label="Description" rows={3} disabled={!canWrite} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-[#111214]">Compatible Motorcycle Models</h2>
        <div className="flex flex-wrap gap-3">
          {bikes.map((b) => {
            const checked = compatibleIds.includes(b.id);
            return (
              <label key={b.id} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  checked={checked}
                  onChange={(e) =>
                    setCompatibleIds(
                      e.target.checked ? [...compatibleIds, b.id] : compatibleIds.filter((x) => x !== b.id)
                    )
                  }
                  className="h-4 w-4 accent-[#D71920]"
                />
                {b.name}
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111214]">Variants &amp; Stock</h2>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), sku: `ACC-${Date.now().toString().slice(-4)}`, size: 'L', color: 'Black', price: basePrice, stock_quantity: 5, is_active: true },
                ])
              }
            >
              Add Variant
            </Button>
          )}
        </div>
        {variants.map((v, idx) => (
          <div key={v.id} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <Input label="SKU" disabled={!canWrite} value={v.sku} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, sku: e.target.value }; setVariants(n); }} />
            <Input label="Size" disabled={!canWrite} value={v.size || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, size: e.target.value }; setVariants(n); }} />
            <Input label="Color" disabled={!canWrite} value={v.color || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, color: e.target.value }; setVariants(n); }} />
            <Input label="Price (PKR)" type="number" disabled={!canWrite} value={v.price} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, price: Number(e.target.value) }; setVariants(n); }} />
            <Input label="Stock" type="number" disabled={!canWrite} value={v.stock_quantity} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, stock_quantity: Number(e.target.value) }; setVariants(n); }} />
            <div>
              {canWrite && variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((x) => x.id !== v.id))}
                  aria-label="Remove variant"
                  className="h-11 px-2 text-[#6B7078] hover:text-[#C0262D] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Product Images</h2>
        {canWrite && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FileUploader
              label="Upload Photo (JPG, PNG, WebP)"
              multiple
              maxFiles={5}
              uploading={uploadingImage}
              onFilesSelected={async (files) => {
                setUploadingImage(true);
                try {
                  const uploaded = await Promise.all(
                    files.map((file) => uploadFileToBucket('accessory-images', slug || 'accessory', file))
                  );
                  setImages((prev) => [
                    ...prev,
                    ...uploaded.map((u, idx) => ({
                      id: crypto.randomUUID(),
                      url: u.url,
                      storage_path: u.path,
                      alt_text: `${name || 'Accessory'} view ${prev.length + idx + 1}`,
                      sort_order: prev.length + idx + 1,
                    })),
                  ]);
                  toast({ title: 'Images added', variant: 'success' });
                } catch (err) {
                  toast({
                    title: 'Upload failed',
                    description: err instanceof Error ? err.message : 'Unable to upload image',
                    variant: 'error',
                  });
                } finally {
                  setUploadingImage(false);
                }
              }}
            />
            <div className="flex gap-2 items-end">
              <Input
                label="Or Add Image URL"
                placeholder="https://..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!imageUrlInput.trim()) return;
                  setImages((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      url: imageUrlInput.trim(),
                      storage_path: null,
                      alt_text: `${name || 'Accessory'} image`,
                      sort_order: prev.length + 1,
                    },
                  ]);
                  setImageUrlInput('');
                }}
              >
                Add URL
              </Button>
            </div>
          </div>
        )}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {images.map((img) => (
              <div key={img.id} className="rounded-lg border border-[#E3E4E7] p-2 space-y-2">
                <SafeImage src={img.url} alt={img.alt_text} className="h-24 w-full rounded bg-[#F5F5F6]" />
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                    className="text-xs text-[#C0262D] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Accessory">
        <div className="space-y-4">
          <p className="text-sm text-[#26282C]">
            Are you sure you want to delete <strong>{existing?.name || name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" loading={deleting} onClick={() => void handleDelete()}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

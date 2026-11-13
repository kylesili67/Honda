import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { canWriteAdminModule } from '../../lib/constants';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import {
  getAccessoryById,
  listAccessories,
  listAccessoryCategories,
  saveAccessory,
} from '../../services/accessories';
import {
  getBikeById,
  getTotalAvailableBikeStock,
  listBikeCategories,
  listBikes,
  listPriceHistory,
  saveBikeModel,
  updateBikeStockRow,
} from '../../services/bikes';
import { listBranches } from '../../services/content';
import { uid } from '../../services/demoStore';
import { uploadFileToBucket } from '../../services/storage';
import type {
  AccessoryImage,
  AccessoryVariant,
  BikeColor,
  BikeImage,
  BikeStock,
  BikeVariant,
  PublishStatus,
} from '../../types/database';
import { Button, Card, FileUploader, Input, SafeImage, Select, StatusChip, Textarea } from '../../components/ui/Primitives';

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
              const price = Math.min(...(b.variants ?? []).map((v) => v.ex_showroom_price));
              return (
                <tr key={b.id} className="hover:bg-[#F5F5F6]/50">
                  <td className="p-3.5 font-semibold">{b.name}</td>
                  <td className="p-3.5 text-[#6B7078]">{b.category?.name}</td>
                  <td className="p-3.5 tabular-nums">{b.engine_cc} cc</td>
                  <td className="p-3.5 tabular-nums font-medium">{formatPKR(price)}</td>
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
  const [saving, setSaving] = useState(false);

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
      const varId = uid('var');
      const colId = uid('col');
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
        setStock([{ id: uid('stk'), variant_id: varId, color_id: colId, branch_id: branches[0].id, quantity: 5, reserved: 0 }]);
      }
    }
  }, [existing, isNew, categories, branches]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !user) return;
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
          <Input label="Model Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="URL Slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Engine CC" type="number" value={engineCc} onChange={(e) => setEngineCc(Number(e.target.value))} />
          <Select label="Publish Status" value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-[#D71920]" />
            Featured on Home Page
          </label>
        </div>
        <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111214]">Variants &amp; Ex-Showroom Pricing (PKR)</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setVariants((prev) => [
                ...prev,
                {
                  id: uid('var'),
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
        </div>

        <div className="space-y-4">
          {variants.map((v, idx) => (
            <div key={v.id} className="rounded-lg border border-[#E3E4E7] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                label="Variant Name"
                value={v.name}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...v, name: e.target.value };
                  setVariants(next);
                }}
              />
              <Input
                label="SKU"
                value={v.sku}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...v, sku: e.target.value };
                  setVariants(next);
                }}
              />
              <Input
                label="Ex-Showroom Price (PKR)"
                type="number"
                value={v.ex_showroom_price}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...v, ex_showroom_price: Number(e.target.value) };
                  setVariants(next);
                }}
              />
              <Input
                label="Mileage (km/l)"
                type="number"
                value={v.mileage_kmpl ?? ''}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...v, mileage_kmpl: e.target.value ? Number(e.target.value) : null };
                  setVariants(next);
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111214]">Colors</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setColors((prev) => [
                ...prev,
                { id: uid('col'), name: 'Matte Black', hex_code: '#18191B', sort_order: prev.length + 1 },
              ])
            }
          >
            Add Color
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colors.map((c, idx) => (
            <div key={c.id} className="flex items-end gap-2">
              <Input
                label="Color Name"
                value={c.name}
                onChange={(e) => {
                  const next = [...colors];
                  next[idx] = { ...c, name: e.target.value };
                  setColors(next);
                }}
              />
              <Input
                label="Hex"
                value={c.hex_code}
                onChange={(e) => {
                  const next = [...colors];
                  next[idx] = { ...c, hex_code: e.target.value };
                  setColors(next);
                }}
              />
              <button
                type="button"
                onClick={() => setColors(colors.filter((x) => x.id !== c.id))}
                className="h-11 px-2 text-[#6B7078] hover:text-[#C0262D]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Bike Gallery Images</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <FileUploader
            label="Upload Photo (JPG, PNG, WebP)"
            multiple
            maxFiles={6}
            uploading={uploadingImage}
            onFilesSelected={async (files) => {
              setUploadingImage(true);
              try {
                const uploaded = await Promise.all(
                  files.map((file) => uploadFileToBucket('bike-images', slug || 'model', file))
                );
                setImages((prev) => [
                  ...prev,
                  ...uploaded.map((u, idx) => ({
                    id: uid('bimg'),
                    color_id: colors[0]?.id ?? null,
                    url: u.url,
                    storage_path: u.path,
                    alt_text: `${name || 'Bike'} view ${prev.length + idx + 1}`,
                    sort_order: prev.length + idx + 1,
                    is_primary: prev.length === 0 && idx === 0,
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
                    id: uid('bimg'),
                    color_id: colors[0]?.id ?? null,
                    url: imageUrlInput.trim(),
                    storage_path: null,
                    alt_text: `${name || 'Bike'} image`,
                    sort_order: prev.length + 1,
                    is_primary: prev.length === 0,
                  },
                ]);
                setImageUrlInput('');
              }}
            >
              Add URL
            </Button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {images.map((img, idx) => (
              <div key={img.id} className="rounded-lg border border-[#E3E4E7] p-3 space-y-2">
                <SafeImage src={img.url} alt={img.alt_text} className="h-32 w-full rounded-md bg-[#F5F5F6]" />
                <Select
                  label="Color"
                  value={img.color_id || ''}
                  onChange={(e) => {
                    const next = [...images];
                    next[idx] = { ...img, color_id: e.target.value || null };
                    setImages(next);
                  }}
                >
                  <option value="">All Colors</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="primary-bike-img"
                      checked={img.is_primary}
                      onChange={() =>
                        setImages((prev) => prev.map((x) => ({ ...x, is_primary: x.id === img.id })))
                      }
                      className="accent-[#D71920]"
                    />
                    Primary
                  </label>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                    className="text-xs text-[#C0262D] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

  const handleQtyChange = async (row: BikeStock, quantity: number) => {
    await updateBikeStockRow({ ...row, quantity: Math.max(0, quantity) });
    toast({ title: 'Stock updated', variant: 'success' });
    void refetch();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Bike Inventory by Branch</h1>
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
                        type="number"
                        min={0}
                        disabled={!canWrite}
                        defaultValue={st.quantity}
                        onBlur={(e) => void handleQtyChange(st, Number(e.target.value))}
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
          id: uid('avar'),
          sku: `ACC-${Date.now().toString().slice(-4)}`,
          size: 'Standard',
          color: 'Black',
          price: 5000,
          stock_quantity: 10,
          is_active: true,
        },
      ]);
    }
  }, [existing, isNew, categories]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">
          {isNew ? 'New Accessory' : `Edit: ${existing?.name || ''}`}
        </h1>
        <div className="flex gap-2">
          <Link to="/admin/accessories"><Button type="button" variant="outline">Back</Button></Link>
          {canWrite && <Button type="submit" loading={saving}>Save Accessory</Button>}
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Product Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Input label="Base Price (PKR)" type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setVariants((prev) => [
                ...prev,
                { id: uid('avar'), sku: `ACC-${Date.now().toString().slice(-4)}`, size: 'L', color: 'Black', price: basePrice, stock_quantity: 5, is_active: true },
              ])
            }
          >
            Add Variant
          </Button>
        </div>
        {variants.map((v, idx) => (
          <div key={v.id} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Input label="SKU" value={v.sku} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, sku: e.target.value }; setVariants(n); }} />
            <Input label="Size" value={v.size || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, size: e.target.value }; setVariants(n); }} />
            <Input label="Color" value={v.color || ''} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, color: e.target.value }; setVariants(n); }} />
            <Input label="Price (PKR)" type="number" value={v.price} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, price: Number(e.target.value) }; setVariants(n); }} />
            <Input label="Stock" type="number" value={v.stock_quantity} onChange={(e) => { const n = [...variants]; n[idx] = { ...v, stock_quantity: Number(e.target.value) }; setVariants(n); }} />
          </div>
        ))}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Product Images</h2>
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
                    id: uid('aimg'),
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
                    id: uid('aimg'),
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
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {images.map((img) => (
              <div key={img.id} className="rounded-lg border border-[#E3E4E7] p-2 space-y-2">
                <SafeImage src={img.url} alt={img.alt_text} className="h-24 w-full rounded bg-[#F5F5F6]" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                  className="text-xs text-[#C0262D] hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </form>
  );
}

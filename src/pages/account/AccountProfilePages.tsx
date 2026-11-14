import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { usePageMeta } from '../../lib/seo';
import {
  deleteCustomerAddress,
  listCustomerAddresses,
  saveCustomerAddress,
} from '../../services/admin';
import { Button, Card, Input } from '../../components/ui/Primitives';

export function AccountProfilePage() {
  const { settings } = useSettings();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  usePageMeta({ title: `My Profile | ${settings.brand_name}` });

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile?.full_name, profile?.phone]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unable to save',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Account Profile</h1>
      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Email Address" value={profile?.email || ''} disabled />
          <Input label="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function AccountAddressesPage() {
  const { settings } = useSettings();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  usePageMeta({ title: `Saved Addresses | ${settings.brand_name}` });

  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['my-addresses', user?.id],
    queryFn: () => listCustomerAddresses(user!.id),
    enabled: Boolean(user),
  });

  const [label, setLabel] = useState('Home');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Islamabad');
  const [province, setProvince] = useState('ICT');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName((prev) => prev || profile?.full_name || '');
    setPhone((prev) => prev || profile?.phone || '');
  }, [profile?.full_name, profile?.phone]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveCustomerAddress({
        user_id: user.id,
        label,
        full_name: fullName,
        phone,
        address_line: addressLine,
        city,
        province,
        postal_code: null,
        is_default: addresses.length === 0,
      });
      setAddressLine('');
      toast({ title: 'Address saved', variant: 'success' });
      void refetch();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save address',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Saved Addresses</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <Card key={addr.id} className="p-5 flex items-start justify-between gap-4">
            <div className="text-sm space-y-1">
              <p className="font-semibold text-[#111214]">
                {addr.label} {addr.is_default ? '· Default' : ''}
              </p>
              <p className="text-[#26282C]">{addr.full_name}</p>
              <p className="text-[#6B7078]">{addr.address_line}</p>
              <p className="text-xs text-[#6B7078]">
                {addr.city}, {addr.province} · {addr.phone}
              </p>
            </div>
            <button
              type="button"
              aria-label="Delete address"
              onClick={async () => {
                try {
                  await deleteCustomerAddress(addr.id);
                  toast({ title: 'Address removed', variant: 'success' });
                  void refetch();
                } catch (err) {
                  toast({
                    title: 'Delete failed',
                    description: err instanceof Error ? err.message : 'Unable to remove address',
                    variant: 'error',
                  });
                }
              }}
              className="p-2 text-[#6B7078] hover:text-[#C0262D] cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-xl">
        <h2 className="text-base font-semibold text-[#111214] mb-4">Add New Address</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <Input label="Street Address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} required />
          <Input label="Province / Territory" value={province} onChange={(e) => setProvince(e.target.value)} required />
          <Button type="submit" loading={saving}>
            Save Address
          </Button>
        </form>
      </Card>
    </div>
  );
}

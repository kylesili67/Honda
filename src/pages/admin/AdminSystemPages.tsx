import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ALL_ROLES, ROLE_LABELS } from '../../lib/constants';
import { downloadCSV } from '../../lib/csv';
import { formatDateTimeKarachi, formatPKR } from '../../lib/format';
import {
  assignStaffRoleAdmin,
  listAuditLogAdmin,
  listCustomersAdmin,
  saveEmiPlanAdmin,
} from '../../services/admin';
import { listEmiPlans } from '../../services/bikes';
import { listAllBookingsAdmin } from '../../services/bookings';
import { listAllInquiriesAdmin } from '../../services/inquiries';
import { listAllOrdersAdmin } from '../../services/orders';
import { listPaymentsAdmin } from '../../services/payments';
import { listAllServiceAppointmentsAdmin } from '../../services/service';
import { getAllSettingsAdmin, updateSettingsBatch } from '../../services/settings';
import type { SiteSettingsMap, UserRole } from '../../types/database';
import { Button, Card, Input, Select, Textarea } from '../../components/ui/Primitives';

export function AdminReportsPage() {
  const { data: bookings = [] } = useQuery({ queryKey: ['admin-bookings'], queryFn: listAllBookingsAdmin });
  const { data: inquiries = [] } = useQuery({ queryKey: ['admin-inquiries'], queryFn: listAllInquiriesAdmin });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: listAllOrdersAdmin });
  const { data: payments = [] } = useQuery({ queryKey: ['admin-payments'], queryFn: listPaymentsAdmin });
  const { data: services = [] } = useQuery({ queryKey: ['admin-services'], queryFn: listAllServiceAppointmentsAdmin });

  const convertedBookings = bookings.filter((b) => b.status === 'converted_to_sale').length;
  const conversionRate = bookings.length > 0 ? Math.round((convertedBookings / bookings.length) * 100) : 0;
  const storeRevenue = orders.reduce((s, o) => s + o.total, 0);
  const tokenRevenue = payments
    .filter((p) => p.payable_type === 'booking' && p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0);

  const reportSummary = [
    { metric: 'Total Bookings', value: bookings.length },
    { metric: 'Converted to Sale', value: convertedBookings },
    { metric: 'Booking Conversion Rate (%)', value: conversionRate },
    { metric: 'Total Sales Inquiries', value: inquiries.length },
    { metric: 'Store Orders Count', value: orders.length },
    { metric: 'Store Order Revenue (PKR)', value: storeRevenue },
    { metric: 'Verified Token Revenue (PKR)', value: tokenRevenue },
    { metric: 'Service Appointments', value: services.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Showroom Reports</h1>
        <Button size="sm" variant="outline" onClick={() => downloadCSV('showroom-report.csv', reportSummary)}>
          <Download className="h-4 w-4" />
          Export Report CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Booking → Sale Rate</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{conversionRate}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Store Revenue</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatPKR(storeRevenue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Verified Tokens</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatPKR(tokenRevenue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B7078]">Service Load</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{services.length} jobs</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Metric</th>
              <th className="p-3.5 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {reportSummary.map((r) => (
              <tr key={r.metric}>
                <td className="p-3.5 font-medium">{r.metric}</td>
                <td className="p-3.5 text-right font-semibold tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const { refetch: refetchPublicSettings } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: current } = useQuery({ queryKey: ['admin-settings'], queryFn: getAllSettingsAdmin });
  const { data: emiPlans = [], refetch: refetchPlans } = useQuery({ queryKey: ['emi-plans'], queryFn: listEmiPlans });

  const [form, setForm] = useState<SiteSettingsMap | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current && !form) setForm(current);
  }, [current, form]);

  if (!form) return <p className="text-sm text-[#6B7078]">Loading settings...</p>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateSettingsBatch(form, user.id);
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      refetchPublicSettings();
      toast({ title: 'Site settings saved', variant: 'success' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Site &amp; Business Settings</h1>
        <Button type="submit" loading={saving}>Save All Settings</Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Brand &amp; Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Brand Name" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
          <Input
            label="Brand Subtitle (Small Caps)"
            placeholder="SHOWROOM"
            value={form.brand_subtitle ?? 'SHOWROOM'}
            onChange={(e) => setForm({ ...form, brand_subtitle: e.target.value })}
          />
          <Input label="Legal Business Name" value={form.legal_business_name} onChange={(e) => setForm({ ...form, legal_business_name: e.target.value })} />
          <Input label="Logo Image URL (Optional)" placeholder="Leave blank for default SVG emblem" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          <Input label="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          <Input label="Contact Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <Input label="WhatsApp Number" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />
          <Input label="Business Hours" value={form.business_hours} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#E3E4E7]">
          <Input
            label="Facebook URL"
            value={form.social_links?.facebook ?? ''}
            onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, facebook: e.target.value } })}
          />
          <Input
            label="Instagram URL"
            value={form.social_links?.instagram ?? ''}
            onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, instagram: e.target.value } })}
          />
          <Input
            label="YouTube URL"
            value={form.social_links?.youtube ?? ''}
            onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, youtube: e.target.value } })}
          />
          <Input
            label="TikTok URL"
            value={form.social_links?.tiktok ?? ''}
            onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, tiktok: e.target.value } })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Bookings, Store &amp; Loyalty Rules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Booking Token (PKR)"
            type="number"
            value={form.booking_token_amount}
            onChange={(e) => setForm({ ...form, booking_token_amount: Number(e.target.value) })}
          />
          <Input
            label="Hold Duration (Days)"
            type="number"
            value={form.booking_hold_days}
            onChange={(e) => setForm({ ...form, booking_hold_days: Number(e.target.value) })}
          />
          <Input
            label="Refundable Until (Hours)"
            type="number"
            value={form.token_refundable_until_hours}
            onChange={(e) => setForm({ ...form, token_refundable_until_hours: Number(e.target.value) })}
          />
          <Input
            label="COD Max Limit (PKR)"
            type="number"
            value={form.cod_max_amount}
            onChange={(e) => setForm({ ...form, cod_max_amount: Number(e.target.value) })}
          />
          <Input
            label="Return Window (Days)"
            type="number"
            value={form.return_window_days}
            onChange={(e) => setForm({ ...form, return_window_days: Number(e.target.value) })}
          />
          <Input
            label="Point Value (PKR)"
            type="number"
            value={form.loyalty_point_value_pkr}
            onChange={(e) => setForm({ ...form, loyalty_point_value_pkr: Number(e.target.value) })}
          />
        </div>
        <Textarea
          label="Token Refund Policy Text"
          rows={2}
          value={form.token_refund_policy_text}
          onChange={(e) => setForm({ ...form, token_refund_policy_text: e.target.value })}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#111214]">Bank Transfer &amp; Payment Gateways</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={form.bank_details.bank_name}
            onChange={(e) => setForm({ ...form, bank_details: { ...form.bank_details, bank_name: e.target.value } })}
          />
          <Input
            label="Account Title"
            value={form.bank_details.account_title}
            onChange={(e) => setForm({ ...form, bank_details: { ...form.bank_details, account_title: e.target.value } })}
          />
          <Input
            label="Account Number"
            value={form.bank_details.account_number}
            onChange={(e) => setForm({ ...form, bank_details: { ...form.bank_details, account_number: e.target.value } })}
          />
          <Input
            label="IBAN"
            value={form.bank_details.iban}
            onChange={(e) => setForm({ ...form, bank_details: { ...form.bank_details, iban: e.target.value } })}
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-2 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.payment_jazzcash_enabled}
              onChange={(e) => setForm({ ...form, payment_jazzcash_enabled: e.target.checked })}
              className="h-4 w-4 accent-[#D71920]"
            />
            Enable JazzCash
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.payment_easypaisa_enabled}
              onChange={(e) => setForm({ ...form, payment_easypaisa_enabled: e.target.checked })}
              className="h-4 w-4 accent-[#D71920]"
            />
            Enable Easypaisa
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.payment_sandbox_mode}
              onChange={(e) => setForm({ ...form, payment_sandbox_mode: e.target.checked })}
              className="h-4 w-4 accent-[#D71920]"
            />
            Gateway Sandbox Mode
          </label>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-[#111214]">EMI Markup Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {emiPlans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-[#E3E4E7] p-3 text-xs space-y-2">
              <p className="font-semibold text-sm">{plan.name}</p>
              <Input
                label="Markup % / yr"
                type="number"
                defaultValue={plan.markup_rate_percent_per_year}
                onBlur={async (e) => {
                  await saveEmiPlanAdmin({
                    ...plan,
                    markup_rate_percent_per_year: Number(e.target.value),
                  });
                  toast({ title: 'EMI plan updated', variant: 'success' });
                  void refetchPlans();
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </form>
  );
}

export function AdminStaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: accounts = [], refetch } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: listCustomersAdmin,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Staff &amp; Role Permissions</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Assigned Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td className="p-3.5 font-semibold">{acc.full_name}</td>
                <td className="p-3.5 text-[#6B7078]">{acc.email}</td>
                <td className="p-3.5">
                  <select
                    value={acc.roles[0] || 'customer'}
                    onChange={async (e) => {
                      if (!user) return;
                      await assignStaffRoleAdmin(acc.id, e.target.value as UserRole, user.id);
                      toast({ title: 'Role updated & audited', variant: 'success' });
                      void refetch();
                    }}
                    className="h-9 rounded border border-[#E3E4E7] px-2 text-xs"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminAuditLogPage() {
  const { data: logs = [] } = useQuery({ queryKey: ['admin-audit-log'], queryFn: listAuditLogAdmin });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[#111214]">Audit Log</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#E3E4E7] bg-[#F5F5F6] text-left text-xs text-[#6B7078]">
            <tr>
              <th className="p-3.5">Time (PKT)</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Entity</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E4E7]">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="p-3.5 tabular-nums text-xs whitespace-nowrap">
                  {formatDateTimeKarachi(l.created_at)}
                </td>
                <td className="p-3.5 font-mono-tabular text-xs font-semibold">{l.action}</td>
                <td className="p-3.5 text-xs text-[#6B7078]">
                  {l.entity_type} ({l.entity_id})
                </td>
                <td className="p-3.5 font-mono-tabular text-xs text-[#26282C] max-w-md truncate">
                  {JSON.stringify(l.new_data)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

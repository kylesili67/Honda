import { SAMPLE_SETTINGS } from '../data/sample';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { SiteSettingsMap } from '../types/database';
import { getDemoState, saveDemoState, uid } from './demoStore';

export async function getPublicSettings(): Promise<SiteSettingsMap> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().settings;
  }

  const { data, error } = await supabase.from('public_settings').select('key, value');
  if (error || !data) {
    const fallback = await supabase.from('site_settings').select('key, value');
    if (fallback.error || !fallback.data) return SAMPLE_SETTINGS;
    return mapSettingsRows(fallback.data);
  }
  return mapSettingsRows(data);
}

export async function getAllSettingsAdmin(): Promise<SiteSettingsMap> {
  if (!isSupabaseConfigured || !supabase) {
    return getDemoState().settings;
  }
  const { data, error } = await supabase.from('site_settings').select('key, value');
  if (error || !data) throw error ?? new Error('Unable to load settings');
  return mapSettingsRows(data);
}

export async function updateSetting<K extends keyof SiteSettingsMap>(
  key: K,
  value: SiteSettingsMap[K],
  updatedBy: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    const oldVal = s.settings[key];
    s.settings[key] = value;
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: updatedBy,
      action: 'setting_updated',
      entity_type: 'site_settings',
      entity_id: String(key),
      old_data: { value: oldVal },
      new_data: { value },
      ip: null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return;
  }

  const { error } = await supabase.from('site_settings').upsert({
    key: String(key),
    value: value as unknown,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateSettingsBatch(
  partial: Partial<SiteSettingsMap>,
  updatedBy: string
): Promise<void> {
  const entries = Object.entries(partial) as Array<[keyof SiteSettingsMap, SiteSettingsMap[keyof SiteSettingsMap]]>;
  if (!isSupabaseConfigured || !supabase) {
    const s = getDemoState();
    for (const [k, v] of entries) {
      (s.settings as unknown as Record<string, unknown>)[k] = v;
    }
    s.auditLog.unshift({
      id: uid('aud'),
      actor_id: updatedBy,
      action: 'settings_batch_updated',
      entity_type: 'site_settings',
      entity_id: 'batch',
      old_data: null,
      new_data: partial as unknown as Record<string, unknown>,
      ip: null,
      created_at: new Date().toISOString(),
    });
    saveDemoState();
    return;
  }

  const rows = entries.map(([key, value]) => ({
    key: String(key),
    value,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('site_settings').upsert(rows);
  if (error) throw error;
}

function mapSettingsRows(rows: Array<{ key: string; value: unknown }>): SiteSettingsMap {
  const merged: Record<string, unknown> = { ...SAMPLE_SETTINGS };
  for (const row of rows) {
    merged[row.key] = row.value;
  }
  return merged as unknown as SiteSettingsMap;
}

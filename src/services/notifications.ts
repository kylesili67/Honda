export async function sendEmailNotification(payload: {
  to?: string | null;
  template: string;
  subject: string;
  variables?: Record<string, string | number | null | undefined>;
}): Promise<void> {
  if (!payload.to) return;
  try {
    await fetch('/api/notify/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort notification: never block booking/order/admin workflows
  }
}

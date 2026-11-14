interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JAZZCASH_MERCHANT_ID?: string;
  JAZZCASH_PASSWORD?: string;
  JAZZCASH_INTEGRITY_SALT?: string;
  JAZZCASH_API_URL?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.JAZZCASH_MERCHANT_ID || !env.JAZZCASH_INTEGRITY_SALT || !env.JAZZCASH_API_URL) {
    return new Response(
      JSON.stringify({
        status: 'disabled',
        message: 'JazzCash gateway is disabled until merchant credentials are configured.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await context.request.json()) as {
      payableType?: 'booking' | 'order';
      payableId?: string;
      amount?: number;
      referenceNumber?: string;
    };

    if (!body.payableType || !body.payableId || !body.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payment payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Implement server-side JazzCash HMAC-SHA256 pp_SecureHash signing using env.JAZZCASH_INTEGRITY_SALT
    // and return { status: 'redirect', formAction: env.JAZZCASH_API_URL, formFields: { ... } }
    return new Response(
      JSON.stringify({
        status: 'pending_integration',
        gateway: 'jazzcash',
        message: 'Online payment is not available yet, please use bank transfer or COD.',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

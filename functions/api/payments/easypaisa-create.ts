interface Env {
  EASYPAISA_STORE_ID?: string;
  EASYPAISA_HASH_KEY?: string;
  EASYPAISA_API_URL?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.EASYPAISA_STORE_ID || !env.EASYPAISA_HASH_KEY || !env.EASYPAISA_API_URL) {
    return new Response(
      JSON.stringify({
        status: 'disabled',
        message: 'Easypaisa gateway is disabled until merchant credentials are configured.',
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

    // TODO: Implement server-side Easypaisa encrypted hash request signing using env.EASYPAISA_HASH_KEY
    // and return { status: 'redirect', redirectUrl: '...', formAction: '...', formFields: { ... } }
    return new Response(
      JSON.stringify({
        status: 'pending_integration',
        gateway: 'easypaisa',
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

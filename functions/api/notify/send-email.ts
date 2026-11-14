interface Env {
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_PROVIDER_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    return new Response(
      JSON.stringify({
        status: 'not_configured',
        message: 'Transactional email provider not configured.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await context.request.json()) as {
      to?: string;
      template?: string;
      subject?: string;
      variables?: Record<string, string | number | null | undefined>;
    };

    if (!body.to || !body.template) {
      return new Response(JSON.stringify({ error: 'Missing recipient or template' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const endpoint = env.EMAIL_PROVIDER_URL || 'https://api.resend.com/emails';
    const subject = body.subject || `Showroom Notification: ${body.template}`;
    const summaryLines = Object.entries(body.variables ?? {})
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join('\n');

    // TODO: Finalize provider-specific payload & auth header format if not using Resend-compatible REST API
    const providerRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [body.to],
        subject,
        text: summaryLines || subject,
      }),
    });

    if (!providerRes.ok) {
      const detail = await providerRes.text().catch(() => '');
      return new Response(
        JSON.stringify({
          status: 'failed',
          message: `Email provider rejected request (${providerRes.status})`,
          detail: detail.slice(0, 300),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: 'sent', recipient: body.to, template: body.template }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

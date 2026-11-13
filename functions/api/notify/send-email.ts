interface Env {
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    return new Response(
      JSON.stringify({ status: 'disabled', message: 'Transactional email provider not configured.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await context.request.json()) as {
      to?: string;
      template?: string;
      subject?: string;
    };

    if (!body.to || !body.template) {
      return new Response(JSON.stringify({ error: 'Missing recipient or template' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ status: 'queued', recipient: body.to, template: body.template }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

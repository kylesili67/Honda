interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  EASYPAISA_HASH_KEY?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.EASYPAISA_HASH_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ status: 'disabled', message: 'Easypaisa callback not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TODO: Verify Easypaisa callback signature using env.EASYPAISA_HASH_KEY,
  // validate transaction amount/reference, and update Supabase payments via SUPABASE_SERVICE_ROLE_KEY.
  return new Response(
    JSON.stringify({
      status: 'pending_integration',
      message: 'Easypaisa callback signature verification is pending implementation.',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
};

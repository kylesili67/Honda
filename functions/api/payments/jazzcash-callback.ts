interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JAZZCASH_INTEGRITY_SALT?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  if (!env.JAZZCASH_INTEGRITY_SALT || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ status: 'disabled', message: 'JazzCash callback not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify JazzCash pp_SecureHash server-side with JAZZCASH_INTEGRITY_SALT before updating Supabase `payments` via service_role.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

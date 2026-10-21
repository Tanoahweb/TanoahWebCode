import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    // Authorization Guard: Require valid CRON_SECRET or Supabase service_role key
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const cronSecretHeader = req.headers.get('x-cron-secret') || '';

    const isServiceRoleMatch = Boolean(supabaseServiceKey && authHeader === `Bearer ${supabaseServiceKey}`);
    const isCronSecretMatch = Boolean(
      cronSecret && (authHeader === `Bearer ${cronSecret}` || cronSecretHeader === cronSecret)
    );

    if (cronSecret && !isCronSecretMatch && !isServiceRoleMatch) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing cron authorization header.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Settle all eligible pending points (delivered + 24h closed return window)
    const { data: settleResult, error: settleError } = await supabase.rpc('settle_pending_rewards', {
      p_user_id: null,
    });

    if (settleError) {
      console.error('[process-rewards] Error running settle_pending_rewards:', settleError);
    }

    // 2. Expire all past-due point batches
    const { data: expireResult, error: expireError } = await supabase.rpc('expire_past_due_points', {
      p_user_id: null,
    });

    if (expireError) {
      console.error('[process-rewards] Error running expire_past_due_points:', expireError);
    }

    const durationMs = Date.now() - startTime;
    const responsePayload = {
      success: !settleError && !expireError,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
      settle_result: settleResult || { error: settleError?.message },
      expire_result: expireResult || { error: expireError?.message },
      message: 'Rewards reconciliation completed successfully.',
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[process-rewards] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

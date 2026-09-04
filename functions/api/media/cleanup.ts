// Cloudflare Pages Function: POST /api/media/cleanup
// Scans for unreferenced media assets (orphans) and allows batch purging to reclaim R2 storage

interface Env {
  MEDIA_BUCKET?: any;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const { dryRun = true } = body;

    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    let orphans: any[] = [];

    if (supabaseUrl && supabaseKey) {
      try {
        const statsRes = await fetch(
          `${supabaseUrl}/rest/v1/media_usage_stats?is_orphan=eq.true&select=*`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (statsRes.ok) {
          orphans = (await statsRes.json()) as any[];
        }
      } catch (err) {
        console.warn('Orphan query error:', err);
      }
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          orphanCount: orphans.length,
          reclaimableBytes: orphans.reduce((acc, o) => acc + (Number(o.file_size) || 0), 0),
          orphans: orphans.slice(0, 50),
          message: `Found ${orphans.length} unreferenced orphan media asset(s). Set dryRun: false to purge.`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Execute purge
    const purgedKeys: string[] = [];
    const purgeErrors: string[] = [];

    for (const orphan of orphans) {
      try {
        if (context.env.MEDIA_BUCKET && orphan.r2_key) {
          await context.env.MEDIA_BUCKET.delete(orphan.r2_key);
        }

        if (supabaseUrl && supabaseKey) {
          await fetch(`${supabaseUrl}/rest/v1/media?id=eq.${orphan.media_id}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deleted_at: new Date().toISOString() }),
          });
        }

        purgedKeys.push(orphan.r2_key);
      } catch (e: any) {
        purgeErrors.push(`${orphan.r2_key}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        dryRun: false,
        purgedCount: purgedKeys.length,
        purgedKeys,
        errors: purgeErrors,
        message: `Successfully purged ${purgedKeys.length} orphan asset(s) from Cloudflare R2 and media registry.`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Cleanup operation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

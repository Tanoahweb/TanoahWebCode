// Cloudflare Pages Function: POST /api/media/delete
// Safe reference-counted deletion: Checks if media is referenced by products before removing from R2

interface Env {
  MEDIA_BUCKET?: any; // Cloudflare R2 bucket binding
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as any;
    const { mediaId, r2Key, force = false } = body;

    if (!mediaId && !r2Key) {
      return new Response(JSON.stringify({ error: 'mediaId or r2Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    let referenceCount = 0;
    let targetR2Key = r2Key;

    // 1. Check reference count from Supabase
    if (supabaseUrl && supabaseKey) {
      try {
        // If only r2Key was provided, get mediaId
        if (!mediaId && r2Key) {
          const mRes = await fetch(
            `${supabaseUrl}/rest/v1/media?r2_key=eq.${encodeURIComponent(r2Key)}&select=id,r2_key&limit=1`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          if (mRes.ok) {
            const mData = (await mRes.json()) as any[];
            if (mData.length > 0) {
              targetR2Key = mData[0].r2_key;
            }
          }
        }

        // Count active product_images references
        const checkUrl = mediaId
          ? `${supabaseUrl}/rest/v1/product_images?media_id=eq.${mediaId}&select=id`
          : `${supabaseUrl}/rest/v1/product_images?image_url=like.*${encodeURIComponent(targetR2Key)}*&select=id`;

        const refRes = await fetch(checkUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (refRes.ok) {
          const refRows = (await refRes.json()) as any[];
          referenceCount = refRows.length;
        }
      } catch (err) {
        console.warn('Reference checking error:', err);
      }
    }

    // 2. Reject if still referenced and not forced
    if (referenceCount > 0 && !force) {
      return new Response(
        JSON.stringify({
          success: false,
          safeToDelete: false,
          referenceCount,
          message: `Cannot delete R2 master object: this image is still referenced by ${referenceCount} product image(s). Unlink the image from products first.`,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Delete from Cloudflare R2 bucket
    if (context.env.MEDIA_BUCKET && targetR2Key) {
      try {
        await context.env.MEDIA_BUCKET.delete(targetR2Key);
      } catch (r2Err) {
        console.warn('R2 deletion warning:', r2Err);
      }
    }

    // 4. Mark as deleted in Supabase media table
    if (supabaseUrl && supabaseKey) {
      try {
        const updateUrl = mediaId
          ? `${supabaseUrl}/rest/v1/media?id=eq.${mediaId}`
          : `${supabaseUrl}/rest/v1/media?r2_key=eq.${encodeURIComponent(targetR2Key)}`;

        await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        });
      } catch (sbErr) {
        console.warn('Supabase soft delete warning:', sbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        safeToDelete: true,
        deletedR2Key: targetR2Key,
        message: 'Media master removed safely from Cloudflare R2 and registry.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Deletion failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

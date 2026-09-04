// Cloudflare Pages Function: POST /api/media/presigned-url
// Handles deduplication check via SHA-256 and generates upload URL for new assets

interface Env {
  CLOUDFLARE_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_DOMAIN?: string;
  MEDIA_BUCKET?: any; // Cloudflare R2 bucket binding
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as any;
    const {
      filename,
      fileHash,
      width,
      height,
      fileSize,
      mimeType = 'image/webp',
      mediaType = 'product',
      preserveOriginal = false,
    } = body;

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Filename is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicDomain = context.env.R2_PUBLIC_DOMAIN || 'https://images.tanoah.com';
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
    const r2Key = fileHash
      ? `products/${fileHash.slice(0, 16)}-${cleanFilename}`
      : `products/${Date.now()}-${cleanFilename}`;

    // 1. Deduplication check if fileHash is provided and Supabase credentials exist
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (fileHash && supabaseUrl && supabaseKey) {
      try {
        const queryUrl = `${supabaseUrl}/rest/v1/media?file_hash=eq.${encodeURIComponent(fileHash)}&deleted_at=is.null&select=*&limit=1`;
        const sbRes = await fetch(queryUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        if (sbRes.ok) {
          const existing = (await sbRes.json()) as any[];
          if (existing && existing.length > 0) {
            const existingMedia = existing[0];
            return new Response(
              JSON.stringify({
                isDuplicate: true,
                message: 'Identical file content detected via SHA-256. Reusing existing master asset.',
                media: existingMedia,
                publicUrl: `${publicDomain}/${existingMedia.r2_key}`,
                key: existingMedia.r2_key,
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (err) {
        console.warn('Supabase deduplication lookup warning:', err);
      }
    }

    // 2. Production R2 Credentials present: Generate S3/R2 direct upload target
    if (context.env.R2_ACCESS_KEY_ID && context.env.R2_SECRET_ACCESS_KEY && context.env.CLOUDFLARE_ACCOUNT_ID) {
      const bucketName = context.env.R2_BUCKET_NAME || 'tanoah-media';
      const uploadUrl = `https://${context.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${r2Key}`;
      const publicUrl = `${publicDomain}/${r2Key}`;

      return new Response(
        JSON.stringify({
          isDuplicate: false,
          uploadUrl,
          publicUrl,
          key: r2Key,
          contentType: mimeType,
          preserveOriginal,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Fallback / Dev Simulation
    return new Response(
      JSON.stringify({
        isDuplicate: false,
        uploadUrl: `/api/media/upload?key=${encodeURIComponent(r2Key)}`,
        publicUrl: `${publicDomain}/${r2Key}`,
        key: r2Key,
        mode: 'worker-direct',
        contentType: mimeType,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to generate presigned upload URL' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

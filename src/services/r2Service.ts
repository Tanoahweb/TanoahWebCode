import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'tanoah-media';
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const PUBLIC_DOMAIN =
  (import.meta.env.VITE_R2_PUBLIC_DOMAIN || 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev').replace(/\/+$/, '');

class R2Service {
  private client: S3Client | null = null;

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: ACCESS_KEY_ID,
          secretAccessKey: SECRET_ACCESS_KEY,
        },
      });
    }
    return this.client;
  }

  public getPublicDomain(): string {
    return PUBLIC_DOMAIN;
  }

  public getBucketName(): string {
    return BUCKET_NAME;
  }

  public getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${PUBLIC_DOMAIN}/${cleanKey}`;
  }

  /**
   * Upload binary data directly to Cloudflare R2 bucket.
   */
  public async upload(
    fileData: Blob | Uint8Array | ArrayBuffer,
    key: string,
    contentType = 'image/webp'
  ): Promise<{ success: boolean; key: string; publicUrl: string }> {
    const cleanKey = key.replace(/^\/+/, '');
    const client = this.getClient();

    let body: Uint8Array;
    if (fileData instanceof Blob) {
      const buffer = await fileData.arrayBuffer();
      body = new Uint8Array(buffer);
    } else if (fileData instanceof ArrayBuffer) {
      body = new Uint8Array(fileData);
    } else {
      body = fileData;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: cleanKey,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return {
      success: true,
      key: cleanKey,
      publicUrl: this.getPublicUrl(cleanKey),
    };
  }

  /**
   * Check connection and list recent objects.
   */
  public async testConnection(): Promise<{ success: boolean; message: string; objectCount?: number }> {
    try {
      const client = this.getClient();
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          MaxKeys: 5,
        })
      );
      return {
        success: true,
        message: `Connected successfully to bucket "${BUCKET_NAME}"`,
        objectCount: res.KeyCount ?? 0,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to connect to Cloudflare R2',
      };
    }
  }
}

export const r2Service = new R2Service();

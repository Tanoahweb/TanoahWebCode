const { S3Client, ListObjectsV2Command, PutObjectCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const https = require('https');

const fs = require('fs');
const path = require('path');

// Load .env if present
const envPath = path.resolve(__dirname, '../.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = match[2]?.trim().replace(/^['"]|['"]$/g, '') || '';
  });
}

const accountId = process.env.VITE_CLOUDFLARE_ACCOUNT_ID || env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID || env.VITE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY || env.VITE_R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.VITE_R2_BUCKET_NAME || env.VITE_R2_BUCKET_NAME || 'tanoah-media';
const publicDomain = process.env.VITE_R2_PUBLIC_DOMAIN || env.VITE_R2_PUBLIC_DOMAIN || 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log('1. Connecting to Cloudflare R2...');
  
  // Step A: Set CORS Policy so browser can upload directly
  console.log('2. Setting CORS policy for browser uploads...');
  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log('✅ CORS policy applied successfully to bucket:', bucketName);
  } catch (corsErr) {
    console.warn('⚠️ CORS notice:', corsErr.message);
  }

  // Step B: Upload a test file
  console.log('3. Uploading test asset to R2...');
  const testKey = `tests/tanoah-connection-test-${Date.now()}.txt`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: 'TANOAH Cloudflare R2 Connection Test Successful!',
      ContentType: 'text/plain',
    })
  );
  console.log('✅ Test asset uploaded with key:', testKey);

  // Step C: List objects
  console.log('4. Listing objects in bucket...');
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 5 }));
  console.log(`✅ Bucket contains ${list.KeyCount} object(s):`, (list.Contents || []).map(c => c.Key));

  // Step D: Verify public URL access
  const testUrl = `${publicDomain}/${testKey}`;
  console.log('5. Verifying public URL:', testUrl);
  
  https.get(testUrl, (res) => {
    console.log('Public URL HTTP Status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Public URL Response Body:', data);
      if (res.statusCode === 200) {
        console.log('🎉 ALL CLOUDFLARE R2 CHECKS PASSED PERFECTLY!');
      } else {
        console.log('Note: R2 public URL status is', res.statusCode);
      }
    });
  }).on('error', (err) => {
    console.error('Public URL check error:', err.message);
  });
}

main().catch(console.error);

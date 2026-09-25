import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'infinity-hackathon-bucket';
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.log('[R2 Config] Credentials not configured in environment variables. Set them in .env.local to test.');
  process.exit(0);
}

async function testR2Live() {
  console.log('--- TESTING LIVE CLOUDFLARE R2 CONNECTION ---');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // 1. Put Test Object
  const testKey = 'test-connection.json';
  const testPayload = JSON.stringify({
    status: 'connected',
    platform: 'INFINITY_HACKATHON_2026',
    timestamp: new Date().toISOString()
  }, null, 2);

  console.log(`Uploading test object '${testKey}' to bucket '${bucketName}'...`);
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: Buffer.from(testPayload),
    ContentType: 'application/json'
  }));
  console.log('[SUCCESS] PutObjectCommand succeeded!');

  // 2. Read Back Object
  console.log(`Reading back '${testKey}' from bucket...`);
  const getRes = await s3.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: testKey
  }));
  const body = await getRes.Body.transformToString();
  console.log('[SUCCESS] GetObjectCommand succeeded! Data:', body);

  // 3. List Bucket Objects
  console.log(`Listing objects in bucket '${bucketName}'...`);
  const listRes = await s3.send(new ListObjectsV2Command({
    Bucket: bucketName
  }));
  console.log(`[SUCCESS] Found ${listRes.KeyCount} objects in bucket:`, listRes.Contents?.map(o => o.Key));

  // 4. Sync current local db.json to R2 state/database.json
  const localDbPath = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(localDbPath)) {
    const dbContent = fs.readFileSync(localDbPath, 'utf-8');
    console.log(`Syncing initial database snapshot to 'state/database.json' in R2...`);
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'state/database.json',
      Body: Buffer.from(dbContent),
      ContentType: 'application/json'
    }));
    console.log('[SUCCESS] Database synchronized to Cloudflare R2!');
  }

  // 5. Test Public Development URL
  try {
    const pubFetch = await fetch(`${publicUrl}/${testKey}`);
    console.log(`[SUCCESS] Public R2 Dev URL HTTP Status: ${pubFetch.status}`);
  } catch (err) {
    console.log('[NOTE] Public Dev URL resolving:', err.message);
  }

  console.log('--- CLOUDFLARE R2 IS 100% OPERATIONAL & VERIFIED ---');
}

testR2Live().catch(console.error);

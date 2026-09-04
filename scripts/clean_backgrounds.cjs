const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function run() {
  const desktopPath = 'd:/Tanoah/Public/Assets/hero/Tanoah hero image.png';
  const mobilePath = 'd:/Tanoah/Public/Assets/hero/Tanoah hero image mobile.png';
  const desktopOrig = 'd:/Tanoah/Public/Assets/hero/Tanoah hero image original.png';
  const mobileOrig = 'd:/Tanoah/Public/Assets/hero/Tanoah hero image mobile original.png';

  // 1. Process Desktop
  const dImg = sharp(desktopOrig);
  const dMeta = await dImg.metadata();
  console.log('Desktop original dims:', dMeta.width, 'x', dMeta.height);

  const { data: dData, info: dInfo } = await dImg.raw().toBuffer({ resolveWithObject: true });
  
  // Exact region where the doodle is:
  // Desktop is 1774 x 887.
  // The doodle is in the right-center, roughly x in [1000, 1400], y in [150, 600]
  let minX = dInfo.width, maxX = 0, minY = dInfo.height, maxY = 0;
  for (let y = 100; y < 650; y++) {
    for (let x = 900; x < 1500; x++) {
      const idx = (y * dInfo.width + x) * dInfo.channels;
      const r = dData[idx];
      const g = dData[idx + 1];
      const b = dData[idx + 2];

      if (r < 240 || g < 240 || b < 240) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log('Desktop doodle bbox:', { minX, maxX, minY, maxY });

  const dPad = 30;
  for (let y = Math.max(0, minY - dPad); y <= Math.min(dInfo.height - 1, maxY + dPad); y++) {
    for (let x = Math.max(0, minX - dPad); x <= Math.min(dInfo.width - 1, maxX + dPad); x++) {
      const idx = (y * dInfo.width + x) * dInfo.channels;
      dData[idx] = 255;
      dData[idx + 1] = 255;
      dData[idx + 2] = 255;
      if (dInfo.channels === 4) dData[idx + 3] = 255;
    }
  }

  await sharp(dData, { raw: { width: dInfo.width, height: dInfo.height, channels: dInfo.channels } })
    .png()
    .toFile(desktopPath);
  console.log('Desktop background cleaned cleanly.');

  // 2. Process Mobile
  const mImg = sharp(mobileOrig);
  const mMeta = await mImg.metadata();
  console.log('Mobile original dims:', mMeta.width, 'x', mMeta.height);

  const { data: mData, info: mInfo } = await mImg.raw().toBuffer({ resolveWithObject: true });
  
  // Mobile is 1149 x 1369. Doodle is in x in [700, 1100], y in [250, 750]
  let mMinX = mInfo.width, mMaxX = 0, mMinY = mInfo.height, mMaxY = 0;
  for (let y = 200; y < 800; y++) {
    for (let x = 650; x < 1120; x++) {
      const idx = (y * mInfo.width + x) * mInfo.channels;
      const r = mData[idx];
      const g = mData[idx + 1];
      const b = mData[idx + 2];

      if (r < 240 || g < 240 || b < 240) {
        if (x < mMinX) mMinX = x;
        if (x > mMaxX) mMaxX = x;
        if (y < mMinY) mMinY = y;
        if (y > mMaxY) mMaxY = y;
      }
    }
  }
  console.log('Mobile doodle bbox:', { mMinX, mMaxX, mMinY, mMaxY });

  for (let y = Math.max(0, mMinY - dPad); y <= Math.min(mInfo.height - 1, mMaxY + dPad); y++) {
    for (let x = Math.max(0, mMinX - dPad); x <= Math.min(mInfo.width - 1, mMaxX + dPad); x++) {
      const idx = (y * mInfo.width + x) * mInfo.channels;
      mData[idx] = 255;
      mData[idx + 1] = 255;
      mData[idx + 2] = 255;
      if (mInfo.channels === 4) mData[idx + 3] = 255;
    }
  }

  await sharp(mData, { raw: { width: mInfo.width, height: mInfo.height, channels: mInfo.channels } })
    .png()
    .toFile(mobilePath);
  console.log('Mobile background cleaned cleanly.');
}

run().catch(console.error);

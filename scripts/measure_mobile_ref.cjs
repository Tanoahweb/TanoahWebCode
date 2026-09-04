const sharp = require('sharp');

async function measureMobile() {
  const mRef = sharp('C:/Users/user/.gemini/antigravity/brain/5f701a13-7443-4688-bc4c-f6babab124ae/.user_uploaded/media_1788529637489.png');
  const { data, info } = await mRef.raw().toBuffer({ resolveWithObject: true });
  console.log('Mobile ref dimensions:', info.width, 'x', info.height);

  // In mobile (256 x 335), find:
  // 1. Logo
  // 2. Doodle
  // 3. Text (PREMIUM WOMEN'S CLOTHING)
  // 4. Button (SHOP NOW)
  let logoMinX = info.width, logoMaxX = 0, logoMinY = info.height, logoMaxY = 0;
  let doodleMinX = info.width, doodleMaxX = 0, doodleMinY = info.height, doodleMaxY = 0;
  let txtMinX = info.width, txtMaxX = 0, txtMinY = info.height, txtMaxY = 0;
  let btnMinX = info.width, btnMaxX = 0, btnMinY = info.height, btnMaxY = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Logo (blue, in top-middle y < 200, x between 40 and 220)
      if (b > 100 && b > r + 20 && b > g + 20 && y < 190 && x < 210) {
        if (x < logoMinX) logoMinX = x;
        if (x > logoMaxX) logoMaxX = x;
        if (y < logoMinY) logoMinY = y;
        if (y > logoMaxY) logoMaxY = y;
      }

      // Doodle (lines in y < 180, x > 180)
      if (r < 210 && g < 210 && b < 210 && x > 180 && y < 180) {
        if (x < doodleMinX) doodleMinX = x;
        if (x > doodleMaxX) doodleMaxX = x;
        if (y < doodleMinY) doodleMinY = y;
        if (y > doodleMaxY) doodleMaxY = y;
      }

      // Text (around y: 220 to 260)
      if (r < 200 && g < 200 && b < 200 && y >= 230 && y <= 265 && x > 40 && x < 220) {
        if (x < txtMinX) txtMinX = x;
        if (x > txtMaxX) txtMaxX = x;
        if (y < txtMinY) txtMinY = y;
        if (y > txtMaxY) txtMaxY = y;
      }

      // Button (in y: 280 to 330)
      if (b > 100 && b > r + 20 && b > g + 20 && y >= 280) {
        if (x < btnMinX) btnMinX = x;
        if (x > btnMaxX) btnMaxX = x;
        if (y < btnMinY) btnMinY = y;
        if (y > btnMaxY) btnMaxY = y;
      }
    }
  }

  console.log('Mobile Logo:', { logoMinX, logoMaxX, logoMinY, logoMaxY, width: logoMaxX - logoMinX, height: logoMaxY - logoMinY });
  console.log('Mobile Doodle:', { doodleMinX, doodleMaxX, doodleMinY, doodleMaxY, width: doodleMaxX - doodleMinX, height: doodleMaxY - doodleMinY });
  console.log('Mobile Text:', { txtMinX, txtMaxX, txtMinY, txtMaxY });
  console.log('Mobile Button:', { btnMinX, btnMaxX, btnMinY, btnMaxY });
}

measureMobile().catch(console.error);

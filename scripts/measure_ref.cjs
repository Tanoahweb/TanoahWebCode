const sharp = require('sharp');

async function measure() {
  const dRef = sharp('C:/Users/user/.gemini/antigravity/brain/5f701a13-7443-4688-bc4c-f6babab124ae/.user_uploaded/media_1788529562155.png');
  const { data, info } = await dRef.raw().toBuffer({ resolveWithObject: true });

  // Find button bbox: dark purple pixels in y: 250 to 350
  let btnMinX = info.width, btnMaxX = 0, btnMinY = info.height, btnMaxY = 0;
  for (let y = 250; y < 350; y++) {
    for (let x = 300; x < 700; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // button color: purple #3b3a86 -> r ~ 50-70, g ~ 50-70, b ~ 130-150
      if (b > 110 && b > r + 30 && b > g + 30) {
        if (x < btnMinX) btnMinX = x;
        if (x > btnMaxX) btnMaxX = x;
        if (y < btnMinY) btnMinY = y;
        if (y > btnMaxY) btnMaxY = y;
      }
    }
  }

  // Find text bbox: y: 350 to 420
  let txtMinX = info.width, txtMaxX = 0, txtMinY = info.height, txtMaxY = 0;
  for (let y = 350; y < 420; y++) {
    for (let x = 300; x < 700; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r < 200 && g < 200 && b < 200) {
        if (x < txtMinX) txtMinX = x;
        if (x > txtMaxX) txtMaxX = x;
        if (y < txtMinY) txtMinY = y;
        if (y > txtMaxY) txtMaxY = y;
      }
    }
  }

  console.log('Button bbox:', {
    btnMinX, btnMaxX, btnMinY, btnMaxY,
    width: btnMaxX - btnMinX,
    height: btnMaxY - btnMinY
  });
  console.log('Text bbox:', {
    txtMinX, txtMaxX, txtMinY, txtMaxY,
    width: txtMaxX - txtMinX,
    height: txtMaxY - txtMinY
  });
}

measure().catch(console.error);

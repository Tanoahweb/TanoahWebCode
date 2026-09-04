const sharp = require('sharp');

async function inspect() {
  const doodle = sharp('d:/Tanoah/Public/Assets/hero/Doodle art.png');
  const meta = await doodle.metadata();
  console.log('Doodle meta:', meta);

  const { data, info } = await doodle.raw().toBuffer({ resolveWithObject: true });
  console.log('Raw info:', info);

  // Create RGBA buffer: convert light background to transparent, keep crisp dark lines
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Transparent if white
    const alpha = luminance > 248 ? 0 : Math.min(255, Math.round(255 * Math.pow((255 - luminance) / 255, 0.85) * 1.5));

    rgba[i * 4] = 40;     // subtle brand dark slate lines
    rgba[i * 4 + 1] = 42;
    rgba[i * 4 + 2] = 58;
    rgba[i * 4 + 3] = alpha;
  }

  // Save full transparent and trimmed transparent
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toFile('d:/Tanoah/Public/Assets/hero/doodle-transparent.png');

  const trimmedMeta = await sharp('d:/Tanoah/Public/Assets/hero/doodle-transparent.png').metadata();
  console.log('Trimmed transparent doodle meta:', trimmedMeta);
}

inspect().catch(console.error);

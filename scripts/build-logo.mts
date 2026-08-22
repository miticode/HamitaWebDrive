/**
 * Bien logo JPEG nen trang thanh PNG nen trong suot, va tao icon cho trinh duyet.
 *
 *   npx tsx scripts/build-logo.mts <duong-dan-file-logo>
 *
 * Cach lam: lay do dam cua tung diem anh lam do duc (alpha), mau ve giu nguyen den.
 * Nho vay net ve van muot (khong bi rang cua), dat len nen nao cung duoc, va o che
 * do toi chi can dao mau la thanh logo trang.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Thieu duong dan file logo.");
  process.exit(1);
}

/** Duoi nguong nay coi nhu nen — cat bo vet xam do JPEG nen ra quanh net ve. */
const NOISE_FLOOR = 14;

const { data, info } = await sharp(source)
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < data.length; i++) {
  const darkness = 255 - data[i];
  rgba[i * 4 + 3] =
    darkness <= NOISE_FLOOR
      ? 0
      : Math.round(((darkness - NOISE_FLOOR) / (255 - NOISE_FLOOR)) * 255);
  // R,G,B de nguyen 0 = den
}

const raw = { width: info.width, height: info.height, channels: 4 as const };

await mkdir("public", { recursive: true });
await sharp(rgba, { raw }).png({ compressionLevel: 9 }).toFile("public/logo.png");
console.log(`tao public/logo.png (${info.width}x${info.height}, nen trong suot)`);

/*
  Icon trinh duyet phai co nen: logo den tren nen trong suot se tang hinh o tab
  mau toi. Nen mau nga giong nen web, nhin nhu mot tam the nho.
*/
for (const [file, px] of [
  ["src/app/icon.png", 512],
  ["src/app/apple-icon.png", 180],
] as const) {
  const inner = Math.round(px * 0.88);
  const mark = await sharp(rgba, { raw })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: px,
      height: px,
      channels: 4,
      background: { r: 250, g: 247, b: 242, alpha: 1 },
    },
  })
    .composite([{ input: mark, top: (px - inner) >> 1, left: (px - inner) >> 1 }])
    .png()
    .toFile(file);

  console.log(`tao ${file} (${px}x${px})`);
}

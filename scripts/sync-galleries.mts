/**
 * Chup lai so lieu Drive cho MOI album dang co: anh bia, so anh, ten thu muc con.
 *
 *   npm run db:sync
 *
 * Chay mot lan sau khi them cac cot so lieu, va bat cu khi nao muon lam moi hang
 * loat. Binh thuong khong can — moi lan tao link hoac bam "Lam moi" da tu chup.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { listGalleries, updateGalleryMeta } = await import("../src/lib/store");
const { getGalleryTree } = await import("../src/lib/drive");

const galleries = await listGalleries();
console.log(`Co ${galleries.length} album, bat dau doc Drive…\n`);

for (const g of galleries) {
  try {
    const tree = await getGalleryTree(g.driveFolderId);
    await updateGalleryMeta(g.id, {
      coverFileId: tree.albums[0]?.photos[0]?.id ?? null,
      photoCount: tree.totalPhotos,
      albumCount: tree.albums.length,
      subfolders: tree.albums.map((a) => a.name),
    });
    console.log(
      `  ${g.slug.padEnd(24)} ${String(tree.totalPhotos).padStart(5)} anh · ${tree.albums.length} thu muc`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${g.slug.padEnd(24)} LOI: ${message.slice(0, 80)}`);
  }
}

console.log("\nXong.");

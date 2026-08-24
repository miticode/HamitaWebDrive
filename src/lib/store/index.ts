import { databaseIsConfigured } from "@/lib/db";
import { jsonStore } from "./json";
import { prismaStore } from "./prisma";
import type { Store } from "./shared";

export type {
  CreateGalleryInput,
  GalleryMeta,
  ListCount,
  Gallery,
  Selection,
  SelectionList,
  ToggleSelectionInput,
} from "./shared";
export { slugify } from "./shared";

/**
 * Co DATABASE_URL thi dung Postgres, khong thi dung file JSON.
 * Nho vay chay o may khong can dung den database, con len Vercel — noi he thong
 * file chi doc — thi bat buoc phai co DATABASE_URL.
 */
const store: Store = databaseIsConfigured() ? prismaStore : jsonStore;

export function storageKind(): "postgres" | "json" {
  return databaseIsConfigured() ? "postgres" : "json";
}

// Boc lai thay vi gan thang `store.listGalleries` de khong phu thuoc vao
// viec cac ham co dung `this` hay khong.
export const listGalleries: Store["listGalleries"] = () => store.listGalleries();
export const getGalleryBySlug: Store["getGalleryBySlug"] = (slug) =>
  store.getGalleryBySlug(slug);
export const createGallery: Store["createGallery"] = (input) => store.createGallery(input);
export const deleteGallery: Store["deleteGallery"] = (id) => store.deleteGallery(id);
export const getLists: Store["getLists"] = (galleryId) => store.getLists(galleryId);
export const getSelections: Store["getSelections"] = (galleryId) =>
  store.getSelections(galleryId);
export const toggleSelection: Store["toggleSelection"] = (input) =>
  store.toggleSelection(input);
export const updateGalleryMeta: Store["updateGalleryMeta"] = (id, meta) =>
  store.updateGalleryMeta(id, meta);
export const listCounts: Store["listCounts"] = () => store.listCounts();
export const setCover: Store["setCover"] = (id, fileId) => store.setCover(id, fileId);
export const setAccess: Store["setAccess"] = (id, code) => store.setAccess(id, code);
export const setMessage: Store["setMessage"] = (id, message) =>
  store.setMessage(id, message);
export const setFeatured: Store["setFeatured"] = (id, featured) =>
  store.setFeatured(id, featured);
export const setExpiry: Store["setExpiry"] = (id, expiresAt) =>
  store.setExpiry(id, expiresAt);

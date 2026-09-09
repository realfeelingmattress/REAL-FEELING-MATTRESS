import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export function validImageUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return false;
  if (/^\/images\/[\p{L}\p{N}_.-]+$/u.test(value) && !value.includes(".."))
    return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "i.ibb.co" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash
    );
  } catch {
    return false;
  }
}
export function imageName(type, name, id) {
  const slug =
    String(name || type)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 45) || type;
  return `${type}-${slug}-${id}-${randomUUID().slice(0, 6)}`;
}
export async function storeImage(
  buffer,
  name,
  {
    key = process.env.IMGBB_API_KEY,
    cloud = Boolean(process.env.VERCEL),
    fetchImpl = fetch,
  } = {},
) {
  if (!buffer?.length || buffer.length > MAX_IMAGE_BYTES)
    throw new Error("Choose an image smaller than 3 MB.");
  let metadata, output;
  try {
    const image = sharp(buffer, { limitInputPixels: 20000000 });
    metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format))
      throw new Error("format");
    output = await image
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error(
      "Upload a valid JPEG, PNG or WebP image, up to 20 megapixels.",
    );
  }
  if (!key) {
    if (cloud)
      throw new Error(
        "ImgBB is not configured. Set IMGBB_API_KEY in the Vercel environment before uploading.",
      );
    const filename = name + ".webp";
    await fs.mkdir("public/images", { recursive: true });
    await fs.writeFile(path.join("public/images", filename), output.data);
    return {
      provider: "local",
      providerId: filename,
      url: "/images/" + filename,
      deleteUrl: "",
      width: output.info.width,
      height: output.info.height,
      bytes: output.data.length,
    };
  }
  const body = new FormData();
  body.set("key", key);
  body.set("name", name);
  body.set(
    "image",
    new Blob([output.data], { type: "image/webp" }),
    name + ".webp",
  );
  // No expiration parameter: the app does not request timed removal. The hosting
  // provider's retention rules still apply; keep your own original-image backup.
  let response, result;
  try {
    response = await fetchImpl("https://api.imgbb.com/1/upload", {
      method: "POST",
      body,
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });
    result = await response.json();
  } catch {
    throw new Error(
      "ImgBB could not be reached. Your product was not changed. Try the upload again.",
    );
  }
  if (
    !response.ok ||
    !result.success ||
    !result.data?.id ||
    !validImageUrl(result.data.url) ||
    !result.data.url.startsWith("https://")
  )
    throw new Error(
      "ImgBB could not save this image. Check the server API key and provider limits, then retry.",
    );
  let deleteUrl = "";
  try {
    const u = new URL(result.data.delete_url);
    if (
      u.protocol === "https:" &&
      u.hostname === "ibb.co" &&
      !u.username &&
      !u.password
    )
      deleteUrl = u.href;
  } catch {}
  return {
    provider: "imgbb",
    providerId: String(result.data.id).slice(0, 200),
    url: result.data.url,
    deleteUrl,
    width: output.info.width,
    height: output.info.height,
    bytes: output.data.length,
  };
}

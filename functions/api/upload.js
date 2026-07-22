import { handleError, HttpError, jsonResponse, requireAdmin } from "../_lib/http.js";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function onRequestPost(context) {
  try {
    await requireAdmin(context.request, context.env);
    if (!context.env.HM_CMS_ASSETS) throw new HttpError(503, "HM_CMS_ASSETS binding is missing");

    const formData = await context.request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") throw new HttpError(400, "Image file is required");
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Unsupported image type");
    if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Image is too large");

    const key = buildAssetKey(file.name, file.type);
    await context.env.HM_CMS_ASSETS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return jsonResponse({
      key,
      url: `/cms-assets/${key}`,
    });
  } catch (error) {
    return handleError(error);
  }
}

export function buildAssetKey(fileName, fileType, options = {}) {
  const date = new Date(options.now || Date.now()).toISOString().slice(0, 10);
  const uuid = options.uuid || crypto.randomUUID();
  const extension = extensionForType(fileType);
  const baseName = String(fileName || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "image";
  return `cms/${date}/${baseName}-${uuid}${extension}`;
}

function extensionForType(type) {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
}

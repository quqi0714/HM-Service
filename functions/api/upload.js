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

    const extension = extensionForType(file.type);
    const key = `cms/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
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

function extensionForType(type) {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
}

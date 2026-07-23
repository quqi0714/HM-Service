import { getEntryBySlug } from "../../../_lib/content-repository.js";
import { CONTENT_TYPES } from "../../../_lib/cms-core.js";
import { publicApiError, publicJsonResponse, serializePublicEntry } from "../../../_lib/public-api.js";

export async function onRequestGet(context) {
  try {
    const slug = decodeURIComponent(context.params.slug || "").trim();
    if (!slug) return publicApiError("文章不存在", 404);

    const entry = await getEntryBySlug(context.env, CONTENT_TYPES.BLOG, slug);
    if (!entry) return publicApiError("文章不存在", 404);
    return publicJsonResponse({
      apiVersion: "1.0.0",
      data: serializePublicEntry(entry, context.request.url, { includeContent: true }),
    });
  } catch {
    return publicApiError("政策文章公开数据暂时无法加载", 500);
  }
}

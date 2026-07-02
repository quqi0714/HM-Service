import { CONTENT_TYPES, renderEntryPage } from "../_lib/cms-core.js";
import { getEntryBySlug } from "../_lib/content-repository.js";
import { getSiteOptions, htmlErrorResponse, htmlResponse, notFoundResponse } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const entry = await getEntryBySlug(context.env, CONTENT_TYPES.BLOG, context.params.slug);
    if (!entry) return notFoundResponse("文章不存在");

    return htmlResponse(renderEntryPage(entry, getSiteOptions(context.env, context.request)));
  } catch (error) {
    return htmlErrorResponse("文章暂时无法加载", 500);
  }
}

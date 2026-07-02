import { CONTENT_TYPES, renderEntryPage } from "../_lib/cms-core.js";
import { getEntryByApartmentNumber, getEntryBySlug } from "../_lib/content-repository.js";
import { getSiteOptions, htmlErrorResponse, htmlResponse, notFoundResponse } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const slug = String(context.params.slug || "");
    const entry = /^\d+$/.test(slug)
      ? await getEntryByApartmentNumber(context.env, slug)
      : await getEntryBySlug(context.env, CONTENT_TYPES.APARTMENT, slug);

    if (!entry) return notFoundResponse("公寓详情不存在");

    return htmlResponse(renderEntryPage(entry, getSiteOptions(context.env, context.request)));
  } catch (error) {
    return htmlErrorResponse("公寓详情暂时无法加载", 500);
  }
}

import { CONTENT_TYPES, renderListPage } from "../_lib/cms-core.js";
import { countEntries, listEntries } from "../_lib/content-repository.js";
import { getSiteOptions, htmlErrorResponse, htmlResponse } from "../_lib/http.js";

const PAGE_SIZE = 24;

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const filters = {
      type: CONTENT_TYPES.APARTMENT,
      includeDrafts: false,
      query: url.searchParams.get("query") || "",
      region: url.searchParams.get("region") || "",
      ageRequirement: url.searchParams.get("age") || "",
      roomType: url.searchParams.get("room") || "",
    };
    const totalEntries = await countEntries(context.env, filters);
    const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
    const entries = await listEntries(context.env, {
      ...filters,
      limit: PAGE_SIZE,
      offset: (Math.min(page, totalPages) - 1) * PAGE_SIZE,
    });
    const html = renderListPage(entries, CONTENT_TYPES.APARTMENT, {
      ...getSiteOptions(context.env, context.request),
      filters,
      page: Math.min(page, totalPages),
      pageSize: PAGE_SIZE,
      totalEntries,
      totalPages,
    });

    return htmlResponse(html);
  } catch (error) {
    return htmlErrorResponse("公寓清单暂时无法加载", 500);
  }
}

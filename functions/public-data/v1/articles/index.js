import { CONTENT_TYPES } from "../../../_lib/cms-core.js";
import { countEntries, listEntries } from "../../../_lib/content-repository.js";
import {
  buildPublicListEnvelope,
  parsePublicListRequest,
  publicApiError,
  publicJsonResponse,
} from "../../../_lib/public-api.js";

export async function onRequestGet(context) {
  try {
    const requestFilters = parsePublicListRequest(context.request);
    const filters = {
      type: CONTENT_TYPES.BLOG,
      includeDrafts: false,
      query: requestFilters.query,
    };
    const total = await countEntries(context.env, filters);
    const totalPages = Math.max(1, Math.ceil(total / requestFilters.limit));
    const page = Math.min(requestFilters.page, totalPages);
    const entries = await listEntries(context.env, {
      ...filters,
      limit: requestFilters.limit,
      offset: (page - 1) * requestFilters.limit,
    });

    return publicJsonResponse(
      buildPublicListEnvelope({
        request: context.request,
        entries,
        total,
        page,
        limit: requestFilters.limit,
      }),
    );
  } catch {
    return publicApiError("政策文章公开数据暂时无法加载", 500);
  }
}

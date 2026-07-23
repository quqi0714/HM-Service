import { getEntryByApartmentNumber, getEntryBySlug } from "../../../_lib/content-repository.js";
import { CONTENT_TYPES, normalizeApartmentNumber } from "../../../_lib/cms-core.js";
import { publicApiError, publicJsonResponse, serializePublicEntry } from "../../../_lib/public-api.js";

export async function onRequestGet(context) {
  try {
    const identifier = decodeURIComponent(context.params.slug || "").trim();
    if (!identifier) return publicApiError("公寓不存在", 404);

    const apartmentNumber = normalizeApartmentNumber(identifier);
    const entry = apartmentNumber
      ? await getEntryByApartmentNumber(context.env, apartmentNumber)
      : await getEntryBySlug(context.env, CONTENT_TYPES.APARTMENT, identifier);

    if (!entry) return publicApiError("公寓不存在", 404);
    return publicJsonResponse({
      apiVersion: "1.0.0",
      data: serializePublicEntry(entry, context.request.url, { includeContent: true }),
    });
  } catch {
    return publicApiError("公寓公开数据暂时无法加载", 500);
  }
}

import { buildSitemapXml } from "./_lib/cms-core.js";
import { listEntries } from "./_lib/content-repository.js";
import { getSiteOptions, handleError, xmlResponse } from "./_lib/http.js";

export async function onRequestGet(context) {
  try {
    const entries = await listEntries(context.env, {
      includeDrafts: false,
      limit: 5000,
    });
    const xml = buildSitemapXml(entries, getSiteOptions(context.env, context.request).origin);

    return xmlResponse(xml);
  } catch (error) {
    return handleError(error);
  }
}

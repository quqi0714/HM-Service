import { listEntries, upsertEntry } from "../../_lib/content-repository.js";
import { handleError, jsonResponse, parseJsonRequest, requireAdmin } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    await requireAdmin(context.request, context.env);
    const url = new URL(context.request.url);
    const entries = await listEntries(context.env, {
      includeDrafts: true,
      type: url.searchParams.get("type") || "",
      limit: url.searchParams.get("limit") || 100,
      offset: url.searchParams.get("offset") || 0,
    });

    return jsonResponse({ entries });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context) {
  try {
    const admin = await requireAdmin(context.request, context.env);
    const body = await parseJsonRequest(context.request);
    const entry = await upsertEntry(context.env, body, { editorEmail: admin.email });

    return jsonResponse({ entry }, 201);
  } catch (error) {
    return handleError(error);
  }
}

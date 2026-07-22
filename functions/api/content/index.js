import { getEntryById, listEntries, upsertEntry } from "../../_lib/content-repository.js";
import { handleError, HttpError, jsonResponse, parseJsonRequest, requireAdmin } from "../../_lib/http.js";
import { collectIndexNowPaths, queueIndexNowNotification } from "../../_lib/indexnow.js";

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
    if (body?.id) {
      const existing = await getEntryById(context.env, body.id, { includeDrafts: true });
      if (existing) throw new HttpError(409, "内容已存在，请刷新后再编辑");
    }
    const entry = await upsertEntry(context.env, body, { editorEmail: admin.email });
    queueIndexNowNotification(context, collectIndexNowPaths(null, entry));

    return jsonResponse({ entry }, 201);
  } catch (error) {
    return handleError(error);
  }
}

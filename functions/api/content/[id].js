import { archiveEntry, deletePermanentEntry, getEntryById, upsertEntry } from "../../_lib/content-repository.js";
import { handleError, HttpError, jsonResponse, parseJsonRequest, requireAdmin } from "../../_lib/http.js";
import { collectIndexNowPaths, queueIndexNowNotification } from "../../_lib/indexnow.js";

export async function onRequestGet(context) {
  try {
    await requireAdmin(context.request, context.env);
    const entry = await getEntryById(context.env, context.params.id, { includeDrafts: true });
    if (!entry) throw new HttpError(404, "Entry not found");

    return jsonResponse({ entry });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPut(context) {
  try {
    const admin = await requireAdmin(context.request, context.env);
    const body = await parseJsonRequest(context.request);
    const existing = await getEntryById(context.env, context.params.id, { includeDrafts: true });
    const entry = await upsertEntry(
      context.env,
      {
        ...body,
        id: context.params.id,
      },
      { editorEmail: admin.email, requireFreshUpdatedAt: true }
    );
    queueIndexNowNotification(context, collectIndexNowPaths(existing, entry));

    return jsonResponse({ entry });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context) {
  try {
    const admin = await requireAdmin(context.request, context.env);
    const url = new URL(context.request.url);
    const existing = await getEntryById(context.env, context.params.id, { includeDrafts: true });
    if (url.searchParams.get("permanent") === "1") {
      const body = await parseJsonRequest(context.request);
      await deletePermanentEntry(context.env, context.params.id, {
        confirmation: body?.confirmation,
        editorEmail: admin.email,
      });
    } else {
      await archiveEntry(context.env, context.params.id, { editorEmail: admin.email });
    }
    queueIndexNowNotification(context, collectIndexNowPaths(existing, null));

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

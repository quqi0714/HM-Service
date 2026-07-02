import { archiveEntry, getEntryById, upsertEntry } from "../../_lib/content-repository.js";
import { handleError, HttpError, jsonResponse, parseJsonRequest, requireAdmin } from "../../_lib/http.js";

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
    const entry = await upsertEntry(
      context.env,
      {
        ...body,
        id: context.params.id,
      },
      { editorEmail: admin.email, requireFreshUpdatedAt: true }
    );

    return jsonResponse({ entry });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context) {
  try {
    const admin = await requireAdmin(context.request, context.env);
    await archiveEntry(context.env, context.params.id, { editorEmail: admin.email });

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

import "server-only";
import { z } from "zod";
import {
  validResourceUrl,
  type CalendarChoice,
  type ResourceLocator,
  type ResourceProjection,
  type ResourcePage,
  type SearchInput,
} from "@/core/integrations/public";
import { IntegrationError } from "./errors";
import { bearer, providerRequest, providerResponse } from "./http";

export const googleScopes = {
  "google-drive": [
    "openid",
    "email",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ],
  "google-calendar": [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/calendar.events.owned",
  ],
};
const fileFields = "id,name,mimeType,webViewLink,modifiedTime,trashed";
const fileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  webViewLink: z.string().optional(),
  modifiedTime: z.string().optional(),
  trashed: z.boolean().optional(),
});
const eventFields =
  "id,summary,htmlLink,status,start,end,extendedProperties/private";
const timeSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
});
const eventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  htmlLink: z.string().optional(),
  status: z.string().optional(),
  start: timeSchema.optional(),
  end: timeSchema.optional(),
  extendedProperties: z
    .object({ private: z.record(z.string(), z.string()).optional() })
    .optional(),
});
export async function googleRequest(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  return providerRequest(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { ...bearer(token), ...init.headers },
  });
}
function fileProjection(value: unknown): ResourceProjection {
  const file = fileSchema.parse(value);
  if (file.trashed) throw new IntegrationError("denied");
  const names: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/pdf": "PDF",
    "application/vnd.google-apps.folder": "Folder",
  };
  const url =
    file.webViewLink ??
    `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
  if (!validResourceUrl("google-drive", url))
    throw new IntegrationError("unavailable");
  return {
    locator: { provider: "google-drive", kind: "file", id: file.id },
    title: file.name.slice(0, 200),
    url,
    detail: names[file.mimeType] ?? "Drive file",
    checkedAt: new Date().toISOString(),
  };
}
function eventProjection(
  value: unknown,
  calendarId: string,
): ResourceProjection {
  const event = eventSchema.parse(value);
  if (event.status === "cancelled") throw new IntegrationError("denied");
  if (!event.htmlLink || !validResourceUrl("google-calendar", event.htmlLink))
    throw new IntegrationError("unavailable");
  return {
    locator: {
      provider: "google-calendar",
      kind: "event",
      id: event.id,
      calendarId,
    },
    title: (event.summary ?? "Untitled event").slice(0, 200),
    url: event.htmlLink,
    detail: "Calendar event",
    state: event.status,
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    checkedAt: new Date().toISOString(),
  };
}
export async function googleCalendars(
  token: string,
): Promise<CalendarChoice[]> {
  const value = z
    .object({
      items: z
        .array(
          z.object({
            id: z.string(),
            summary: z.string(),
            accessRole: z.string(),
            primary: z.boolean().optional(),
          }),
        )
        .max(25),
    })
    .parse(
      await googleRequest(
        token,
        "/calendar/v3/users/me/calendarList?maxResults=25&fields=items(id,summary,accessRole,primary)",
      ),
    );
  // Writes are limited to owned calendars by the OAuth grant, not frontend flags.
  return value.items.map((c) => ({
    id: c.id,
    title: c.summary.slice(0, 160),
    writable: c.accessRole === "owner",
    primary: c.primary,
  }));
}
export async function googleResolve(
  token: string,
  locator: Exclude<ResourceLocator, { provider: "github" }>,
) {
  if (locator.provider === "google-drive") {
    const projection = fileProjection(
      await googleRequest(
        token,
        `/drive/v3/files/${encodeURIComponent(locator.id)}?fields=${encodeURIComponent(fileFields)}`,
      ),
    );
    if (projection.locator.id !== locator.id)
      throw new IntegrationError("denied");
    return projection;
  }
  const projection = eventProjection(
    await googleRequest(
      token,
      `/calendar/v3/calendars/${encodeURIComponent(locator.calendarId)}/events/${encodeURIComponent(locator.id)}?fields=${encodeURIComponent(eventFields)}`,
    ),
    locator.calendarId,
  );
  if (projection.locator.id !== locator.id)
    throw new IntegrationError("denied");
  return projection;
}
/** One provider batch per Google capability; no metadata request per linked row. */
export async function googleResolveBatch(
  token: string,
  locators: Exclude<ResourceLocator, { provider: "github" }>[],
) {
  const first = locators[0];
  if (
    !first ||
    locators.length > 5 ||
    locators.some((l) => l.provider !== first.provider)
  )
    throw new IntegrationError("invalid");
  const boundary = "stylus_resource_batch";
  const requests =
    locators
      .map((locator, index) => {
        const path =
          locator.provider === "google-drive"
            ? `/drive/v3/files/${encodeURIComponent(locator.id)}?fields=${encodeURIComponent(fileFields)}`
            : `/calendar/v3/calendars/${encodeURIComponent(locator.calendarId)}/events/${encodeURIComponent(locator.id)}?fields=${encodeURIComponent(eventFields)}`;
        return `--${boundary}\r\nContent-Type: application/http\r\nContent-ID: <resource-${index}>\r\n\r\nGET ${path} HTTP/1.1\r\n\r\n`;
      })
      .join("") + `--${boundary}--\r\n`;
  const response = await providerResponse(
    `https://www.googleapis.com/batch/${first.provider === "google-drive" ? "drive" : "calendar"}/v3`,
    {
      method: "POST",
      headers: {
        ...bearer(token),
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      body: requests,
    },
  );
  const responseBoundary = /boundary="?([^";\s]+)/i.exec(
    response.contentType,
  )?.[1];
  if (!responseBoundary || responseBoundary.length > 200)
    throw new IntegrationError("unavailable");
  const results = new Map<number, ResourceProjection | IntegrationError>();
  for (const part of response.body.split(`--${responseBoundary}`)) {
    const index = Number(
      /Content-ID:\s*<?(?:response-)?resource-(\d+)>?/i.exec(part)?.[1],
    );
    if (!Number.isInteger(index) || !locators[index]) continue;
    const status = Number(/HTTP\/1\.[01] (\d{3})/.exec(part)?.[1]);
    if (status !== 200) {
      results.set(
        index,
        new IntegrationError(
          status === 401 || status === 403
            ? "authorization"
            : status === 404 || status === 410
              ? "denied"
              : status === 429
                ? "rate-limit"
                : "unavailable",
        ),
      );
      continue;
    }
    const payload = part
      .slice(part.indexOf("HTTP/1."))
      .split(/\r?\n\r?\n/)
      .slice(1)
      .join("\r\n\r\n")
      .trim();
    try {
      const l = locators[index];
      const value = JSON.parse(payload);
      const projection =
        l.provider === "google-drive"
          ? fileProjection(value)
          : eventProjection(value, l.calendarId);
      if (projection.locator.id !== l.id) throw new IntegrationError("denied");
      results.set(index, projection);
    } catch {
      results.set(index, new IntegrationError("unavailable"));
    }
  }
  return locators.map(
    (_, index) => results.get(index) ?? new IntegrationError("unavailable"),
  );
}
export async function googleSearch(
  provider: "google-drive" | "google-calendar",
  token: string,
  input: SearchInput,
): Promise<ResourcePage> {
  const params = new URLSearchParams();
  if (provider === "google-drive") {
    if (input.cursor) params.set("pageToken", input.cursor);
    // Drive's query syntax uses backslash escaping inside quoted literals.
    const term = input.query.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    params.set(
      "q",
      `trashed = false${term ? ` and name contains '${term}'` : ""}`,
    );
    params.set("pageSize", "25");
    params.set("fields", `nextPageToken,files(${fileFields})`);
    const data = z
      .object({
        files: z.array(fileSchema).max(25),
        nextPageToken: z.string().optional(),
      })
      .parse(await googleRequest(token, `/drive/v3/files?${params}`));
    return {
      items: data.files.filter((f) => !f.trashed).map(fileProjection),
      cursor: data.nextPageToken,
    };
  }
  let calendar = input.calendarId ?? "primary";
  if (calendar === "primary") {
    const primary = (await googleCalendars(token)).find((c) => c.primary);
    if (!primary) throw new IntegrationError("denied");
    calendar = primary.id;
  }
  params.set("maxResults", "25");
  params.set("singleEvents", "true");
  params.set("orderBy", "startTime");
  const started = Date.now();
  let range = {
    timeMin: new Date(started).toISOString(),
    timeMax: new Date(started + 90 * 86400_000).toISOString(),
  };
  if (input.cursor) {
    try {
      const cursor = z
        .object({
          pageToken: z.string().min(1).max(1024),
          calendarId: z.string().max(256),
          query: z.string().max(120),
          timeMin: z.iso.datetime(),
          timeMax: z.iso.datetime(),
        })
        .strict()
        .parse(
          JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8")),
        );
      if (
        cursor.calendarId !== calendar ||
        cursor.query !== input.query ||
        Date.parse(cursor.timeMin) < Date.now() - 3600_000 ||
        Date.parse(cursor.timeMax) - Date.parse(cursor.timeMin) >
          90 * 86400_000 ||
        Date.parse(cursor.timeMax) <= Date.parse(cursor.timeMin)
      )
        throw Error();
      range = { timeMin: cursor.timeMin, timeMax: cursor.timeMax };
      params.set("pageToken", cursor.pageToken);
    } catch {
      throw new IntegrationError("invalid");
    }
  }
  params.set("timeMin", range.timeMin);
  params.set("timeMax", range.timeMax);
  if (input.query) params.set("q", input.query);
  params.set("fields", `nextPageToken,items(${eventFields})`);
  const data = z
    .object({
      items: z.array(eventSchema).max(25).optional(),
      nextPageToken: z.string().optional(),
    })
    .parse(
      await googleRequest(
        token,
        `/calendar/v3/calendars/${encodeURIComponent(calendar)}/events?${params}`,
      ),
    );
  return {
    items: (data.items ?? [])
      .filter((e) => e.status !== "cancelled")
      .map((e) => eventProjection(e, calendar)),
    cursor: data.nextPageToken
      ? Buffer.from(
          JSON.stringify({
            pageToken: data.nextPageToken,
            calendarId: calendar,
            query: input.query,
            ...range,
          }),
        ).toString("base64url")
      : undefined,
  };
}
export const calendarCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    date: z.iso.date(),
    time: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal("")),
    timeZone: z.string().min(1).max(100),
    calendarId: z.string().min(1).max(256),
  })
  .strict();
export type CalendarCreateInput = z.infer<typeof calendarCreateSchema>;
export function calendarEventBody(
  input: CalendarCreateInput,
  intentId: string,
  href: string,
) {
  const id = "s" + intentId.replaceAll("-", "");
  if (!input.time) {
    const end = new Date(`${input.date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return {
      id,
      summary: input.title,
      source: { title: "Stylus", url: href },
      start: { date: input.date },
      end: { date: end.toISOString().slice(0, 10) },
      extendedProperties: { private: { stylusIntent: intentId } },
    };
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone });
  } catch {
    throw new IntegrationError("invalid");
  }
  // Use a 30-minute local slot; the explicit IANA zone resolves the chosen date.
  const start = `${input.date}T${input.time}:00`;
  const end = new Date(`${start}Z`);
  end.setUTCMinutes(end.getUTCMinutes() + 30);
  return {
    id,
    summary: input.title,
    source: { title: "Stylus", url: href },
    start: { dateTime: start, timeZone: input.timeZone },
    end: { dateTime: end.toISOString().slice(0, 19), timeZone: input.timeZone },
    extendedProperties: { private: { stylusIntent: intentId } },
  };
}
export async function createGoogleEvent(
  token: string,
  input: CalendarCreateInput,
  intentId: string,
  href: string,
) {
  const body = calendarEventBody(input, intentId, href);
  const path = `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`;
  let event: unknown;
  try {
    event = await googleRequest(
      token,
      `${path}?sendUpdates=none&fields=${encodeURIComponent(eventFields)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    // A lost response or conflict is recovered using the same deterministic ID.
    if (
      !(error instanceof IntegrationError) ||
      !["conflict", "unavailable"].includes(error.category)
    )
      throw error;
    event = await googleRequest(
      token,
      `${path}/${body.id}?fields=${encodeURIComponent(eventFields)}`,
    );
  }
  const value = eventSchema.parse(event);
  if (
    value.id !== body.id ||
    value.extendedProperties?.private?.stylusIntent !== intentId
  )
    throw new IntegrationError("denied");
  return eventProjection(value, input.calendarId);
}

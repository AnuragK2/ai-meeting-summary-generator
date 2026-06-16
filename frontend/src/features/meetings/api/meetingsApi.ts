import { apiFetch, apiFetchText, apiUrl } from "../../../lib/apiClient";
import type {
  CreateMeetingInput,
  MeetingDetail,
  MeetingListRow,
} from "../../../types/api";

/** Pure REST adapters. React Query hooks wrap these. */
export const meetingsApi = {
  list: () =>
    apiFetch<{ meetings: MeetingListRow[] }>("/meetings").then(
      (r) => r.meetings,
    ),
  get: (id: string) => apiFetch<MeetingDetail>(`/meetings/${id}`),
  create: (input: CreateMeetingInput) =>
    apiFetch<MeetingDetail>("/meetings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/meetings/${id}`, { method: "DELETE" }),
  regenerate: (id: string) =>
    apiFetch<MeetingDetail>(`/meetings/${id}/regenerate`, { method: "POST" }),
  exportMarkdown: (id: string): Promise<string> =>
    apiFetchText(`/meetings/${id}/export.md`),
  exportMarkdownUrl: (id: string): string => apiUrl(`/meetings/${id}/export.md`),
};

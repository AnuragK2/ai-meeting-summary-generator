import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../../../lib/queryKeys";
import { notify } from "../../../lib/toast";
import { meetingsApi } from "./meetingsApi";
import type { CreateMeetingInput, MeetingDetail } from "../../../types/api";

export function useMeetingsList() {
  return useQuery({
    queryKey: queryKeys.meetings.list(),
    queryFn: meetingsApi.list,
  });
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? queryKeys.meetings.detail(id)
      : ["meetings", "detail", "_disabled"],
    queryFn: () => meetingsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Decide which toast to fire after a create/regenerate completes. The
 * backend always returns 2xx (the meeting is saved either way) but flags
 * `extraction_ok: false` when the LLM call failed, in which case we
 * surface the persisted `extraction_error` so the user knows what went
 * wrong and where to fix it.
 */
function reportExtractionOutcome(
  detail: MeetingDetail,
  okMessage: string,
): void {
  if (detail.extraction_ok === false) {
    notify.warning("Meeting saved, but AI extraction failed", {
      description:
        detail.meeting.extraction_error ??
        "Open the meeting and click Regenerate to try again.",
      duration: 8000,
    });
  } else {
    notify.success(okMessage);
  }
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) => meetingsApi.create(input),
    onSuccess: (detail) => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all });
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all });
      reportExtractionOutcome(detail, "Meeting created and extracted");
    },
    onError: (err) => notify.fromError(err, "Could not create the meeting"),
  });
}

export function useRegenerateMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingsApi.regenerate(id),
    onSuccess: (detail) => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all });
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all });
      reportExtractionOutcome(detail, "Meeting regenerated");
    },
    onError: (err) => notify.fromError(err, "Could not regenerate the meeting"),
  });
}

export function useDeleteMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all });
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all });
      notify.success("Meeting deleted");
    },
    onError: (err) => notify.fromError(err, "Could not delete the meeting"),
  });
}

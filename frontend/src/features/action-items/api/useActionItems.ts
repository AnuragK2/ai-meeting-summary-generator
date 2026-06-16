import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../../../lib/queryKeys";
import { notify } from "../../../lib/toast";
import { actionItemsApi } from "./actionItemsApi";
import type {
  ActionItemFilters,
  UpdateActionItemInput,
} from "../../../types/api";

export function useActionItems(filters: ActionItemFilters) {
  return useQuery({
    queryKey: queryKeys.actionItems.list(filters),
    queryFn: () => actionItemsApi.list(filters),
  });
}

/**
 * Inline edits happen often (every blur / dropdown change). We deliberately
 * keep success silent — the value updating in the input is signal enough,
 * and a toast on every keystroke-blur would be noisy. Errors always toast
 * because the visual rollback is not always obvious.
 */
export function useUpdateActionItem(actionItemId: string, meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateActionItemInput) =>
      actionItemsApi.update(actionItemId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings.detail(meetingId) });
      qc.invalidateQueries({ queryKey: queryKeys.meetings.all });
      qc.invalidateQueries({ queryKey: queryKeys.actionItems.all });
    },
    onError: (err) =>
      notify.fromError(err, "Could not save the action item change"),
  });
}

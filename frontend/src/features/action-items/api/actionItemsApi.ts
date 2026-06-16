import { apiFetch, buildQueryString } from "../../../lib/apiClient";
import type {
  ActionItem,
  ActionItemFilters,
  ActionItemWithMeeting,
  UpdateActionItemInput,
} from "../../../types/api";

export const actionItemsApi = {
  update: (id: string, patch: UpdateActionItemInput) =>
    apiFetch<ActionItem>(`/action-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  list: (filters: ActionItemFilters) => {
    const qs = buildQueryString(filters as Record<string, unknown>);
    const path = qs ? `/action-items?${qs}` : "/action-items";
    return apiFetch<{ action_items: ActionItemWithMeeting[] }>(path).then(
      (r) => r.action_items,
    );
  },
};

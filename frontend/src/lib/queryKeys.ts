import type { ActionItemFilters } from "../types/api";

/**
 * Centralised query key factory. Co-locating keys per feature would be a
 * fine alternative; we keep them here so cross-feature invalidations
 * (e.g. an action item PATCH invalidating the meetings list count) only
 * have one source of truth.
 */
export const queryKeys = {
  meetings: {
    all: ["meetings"] as const,
    list: () => ["meetings", "list"] as const,
    detail: (id: string) => ["meetings", "detail", id] as const,
  },
  actionItems: {
    all: ["action-items"] as const,
    list: (filters: ActionItemFilters) =>
      ["action-items", "list", filters] as const,
  },
} as const;

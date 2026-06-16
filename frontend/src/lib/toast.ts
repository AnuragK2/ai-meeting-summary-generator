import { toast } from "sonner";
import { formatApiError } from "./apiClient";

/**
 * Thin wrapper around sonner. Every mutation in the app uses `notify.*`
 * so we have a single place to tune duration, positioning, and error
 * formatting.
 */
export const notify = {
  success(message: string, opts?: { description?: string; duration?: number }) {
    return toast.success(message, {
      duration: opts?.duration ?? 3500,
      description: opts?.description,
    });
  },

  error(message: string, opts?: { description?: string; duration?: number }) {
    return toast.error(message, {
      duration: opts?.duration ?? 6000,
      description: opts?.description,
    });
  },

  warning(message: string, opts?: { description?: string; duration?: number }) {
    return toast.warning(message, {
      duration: opts?.duration ?? 5000,
      description: opts?.description,
    });
  },

  info(message: string, opts?: { description?: string; duration?: number }) {
    return toast(message, {
      duration: opts?.duration ?? 3500,
      description: opts?.description,
    });
  },

  /** Toast an `ApiError` (or any thrown value) using `formatApiError`. */
  fromError(err: unknown, fallback = "Something went wrong") {
    return toast.error(fallback, {
      description: formatApiError(err),
      duration: 6000,
    });
  },

  /**
   * Shows loading → success/error in one call. Useful for fire-and-forget
   * async actions like "Copy markdown" where we don't track state locally.
   * The detailed error reason is shown in the toast description so the
   * headline stays short and doesn't get duplicated when the underlying
   * `formatApiError` output already starts with the same words.
   */
  promise<T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
  ) {
    return toast.promise(promise, {
      loading: msgs.loading,
      success: msgs.success,
      error: (err) => ({
        message: msgs.error,
        description: formatApiError(err),
      }),
    });
  },
};

import { describe, expect, it } from "vitest";
import { ApiError, formatApiError } from "./apiClient";

describe("formatApiError", () => {
  it("maps NETWORK_ERROR to its specific message", () => {
    const err = new ApiError(0, "boom", "NETWORK_ERROR");
    expect(formatApiError(err)).toBe("boom");
  });

  it("maps PAYLOAD_TOO_LARGE to a user-friendly hint", () => {
    const err = new ApiError(413, "raw", "PAYLOAD_TOO_LARGE");
    expect(formatApiError(err)).toMatch(/transcript is too large/i);
  });

  it("flattens Zod field errors into 'field: msg'", () => {
    const err = new ApiError(400, "Validation failed", "BAD_REQUEST", {
      formErrors: [],
      fieldErrors: { title: ["title is required"] },
    });
    expect(formatApiError(err)).toBe("title: title is required");
  });

  it("prefers formErrors when present", () => {
    const err = new ApiError(400, "Validation failed", "BAD_REQUEST", {
      formErrors: ["at least one field must be provided"],
      fieldErrors: {},
    });
    expect(formatApiError(err)).toBe("at least one field must be provided");
  });

  it("falls back to message when details are missing", () => {
    const err = new ApiError(400, "Validation failed", "BAD_REQUEST");
    expect(formatApiError(err)).toBe("Validation failed");
  });

  it("prefixes 5xx errors with 'Server error:'", () => {
    const err = new ApiError(500, "boom", "INTERNAL_ERROR");
    expect(formatApiError(err)).toBe("Server error: boom");
  });

  it("falls back gracefully for non-Error throwables", () => {
    expect(formatApiError("oops")).toBe("Something went wrong. Please try again.");
    expect(formatApiError(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("returns the message for generic Error instances", () => {
    expect(formatApiError(new Error("nope"))).toBe("nope");
  });
});

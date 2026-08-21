import "server-only";

import { resolveUser } from "./identity";
import type { UserProfile } from "../creation";

// ── Error type ────────────────────────────────────────────────────────────────

/**
 * Structured API error that can be serialised into a Response.
 * Route handlers catch this and call `.toResponse()`.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.message } },
      { status: this.status },
    );
  }
}

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Resolves the current session to an internal UserProfile.
 * Throws a 401 ApiError when there is no active session.
 */
export async function requireUser(): Promise<UserProfile> {
  const user = await resolveUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  return user;
}

/**
 * Like `requireUser()` but also requires the user to have claimed a nickname.
 * Throws a 409 ApiError when the nickname is missing.
 */
export async function requireNickname(): Promise<UserProfile> {
  const user = await requireUser();
  if (!user.nickname) {
    throw new ApiError(
      409,
      "nickname_required",
      "A nickname is required to publish content. Please visit /onboarding to set one.",
    );
  }
  return user;
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

/**
 * Wraps a route handler to automatically convert ApiError throws into
 * structured JSON responses. Rethrows unexpected errors.
 *
 * Usage:
 *   export const GET = withApi(async () => {
 *     const user = await requireUser();
 *     return Response.json(user);
 *   });
 */
export function withApi(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof ApiError) return err.toResponse();

      // Validation errors from the domain layer have a human-readable message.
      if (err instanceof Error && err.name === "ValidationError") {
        return new ApiError(400, "validation_error", err.message).toResponse();
      }

      console.error("[api]", err);
      return new ApiError(500, "internal", "An unexpected error occurred.").toResponse();
    }
  };
}

// ── Body parsing ──────────────────────────────────────────────────────────────

/** Parses and returns the JSON body, or throws a 400 ApiError. */
export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

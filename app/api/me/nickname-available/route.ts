import { withApi, ApiError } from "@/app/_lib/server/auth";
import { isNicknameAvailable, validateNickname } from "@/app/_lib/server/nicknames";

// GET /api/me/nickname-available?value=<candidate>
export const GET = withApi(async (req) => {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get("value");

  if (!value) {
    throw new ApiError(400, "missing_param", "Query parameter 'value' is required.");
  }

  const normalized = value.toLowerCase().trim();
  const formatCheck = validateNickname(normalized);

  if (!formatCheck.ok) {
    return Response.json({ available: false, reason: formatCheck.reason });
  }

  const available = await isNicknameAvailable(normalized);
  return Response.json({ available });
});

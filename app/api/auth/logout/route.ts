import { cookies } from "next/headers";
import { deleteSession, getCurrentUser, logActivity } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (token) {
      const user = await getCurrentUser();
      
      // Delete session
      await deleteSession(token);

      // Log activity
      if (user) {
        await logActivity(
          user.id,
          "LOGOUT",
          "auth",
          user.id,
          "User",
          null,
          null,
          request.headers.get("x-forwarded-for") || undefined,
          request.headers.get("user-agent") || undefined
        );
      }
    }

    // Clear cookie
    cookieStore.delete("auth-token");

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("An error occurred during logout", 500);
  }
}

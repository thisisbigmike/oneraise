/**
 * Cloudflare Turnstile Server-Side Verification Helper
 */

const DEMO_SECRET_KEY = "1x0000000000000000000000000000000AA";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || DEMO_SECRET_KEY;

  // In development without Turnstile configured, if no token was sent, allow pass-through if explicitly allowed
  if (!token) {
    if (process.env.NODE_ENV === "development" && !process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      return { success: true };
    }
    return { success: false, error: "Security verification token is missing." };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data["error-codes"] || [];
    console.warn("Turnstile verification failed:", errorCodes);
    return {
      success: false,
      error: "Cloudflare Turnstile verification failed. Please try again.",
    };
  } catch (error) {
    console.error("Cloudflare Turnstile verification error:", error);
    return {
      success: false,
      error: "Unable to verify security check. Please try again.",
    };
  }
}

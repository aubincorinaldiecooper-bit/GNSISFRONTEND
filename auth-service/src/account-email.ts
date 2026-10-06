import { Resend } from "resend";
import { APIError } from "better-auth/api";
import type { Env } from "./env.js";

export function createSignInMailer(env: Pick<Env, "resendApiKey" | "authEmailFrom">) {
  const resend = new Resend(env.resendApiKey);
  return async ({ email, url }: { email: string; url: string }): Promise<void> => {
    const safeUrl = url.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    try {
      const { data, error } = await resend.emails.send({
        from: env.authEmailFrom,
        to: email,
        subject: "Sign in to Panoptic",
        text: `Use this link to sign in to Panoptic:\n\n${url}\n\nThis link expires in 10 minutes and can only be used once. If you didn’t request it, you can ignore this email.`,
        html: `<p>Use this link to sign in to Panoptic:</p><p><a href="${safeUrl}">Sign in to Panoptic</a></p><p>This link expires in 10 minutes and can only be used once. If you didn’t request it, you can ignore this email.</p>`,
      });
      if (error || !data?.id) throw new Error("Sign-in email delivery failed");
    } catch {
      // Keep both provider errors and network exceptions out of auth logs.
      throw new APIError("SERVICE_UNAVAILABLE", { message: "Sign-in email delivery failed" });
    }
  };
}

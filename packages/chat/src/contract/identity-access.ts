import { z } from "zod";

/**
 * The user's access to a system an agent's tool calls with the user's account
 * at an identity provider of the tenant: the chat opens the provider's login
 * in a window of the installation, whose last page hands the chat that opened
 * it this message. The result is sealed for the user who opened the window,
 * and the chat gives it back to the installation with the user's session.
 */

export const IDENTITY_ACCESS_MESSAGE = "gubernet-identity-access";

// Why the window gave no account: the user said no, it took too long, or it went wrong
export const ACCESS_WINDOW_ERRORS = ["refused", "expired", "failed"] as const;

export const identityAccessMessageSchema = z.union([
	z.object({ type: z.literal(IDENTITY_ACCESS_MESSAGE), result: z.string().min(1) }),
	z.object({ type: z.literal(IDENTITY_ACCESS_MESSAGE), error: z.enum(ACCESS_WINDOW_ERRORS) }),
]);

export type IdentityAccessMessage = z.infer<typeof identityAccessMessageSchema>;

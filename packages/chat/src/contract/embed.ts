import { z } from "zod";

/**
 * The chat on a site other than the installation's: its requests carry a
 * session of the chat alone, which the installation gives from the app's own
 * token (`getToken`) or from its "Accedi" window. The window hands the session
 * to the site that opened it with this message.
 */

export const EMBED_SESSION_MESSAGE = "gubernet-chat-session";

export const embedSessionSchema = z.object({
	token: z.string().min(1),
	// ISO date: the session ends then
	expiresAt: z.string(),
});

export type EmbedSession = z.infer<typeof embedSessionSchema>;

export const embedSessionMessageSchema = embedSessionSchema.extend({
	type: z.literal(EMBED_SESSION_MESSAGE),
	agentId: z.string(),
});

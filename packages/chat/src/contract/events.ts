import { z } from "zod";

import { formPartSchema } from "./form";

// "agent" is a sub-agent: a copy of the agent working on a part of the answer
export const CHAT_STEP_KINDS = ["file", "tool", "skill", "web", "agent"] as const;

export const CHAT_ERROR_CODES = [
	"engine_unavailable",
	"internal",
	// The pod fell again after the answer started over on a new one
	"interrupted",
	"too_many_running",
] as const;

// What the chat tells about an answer above it: it started over on a new pod
// Above an answer: it started over on a new pod, or on the model the user changed to
export const CHAT_NOTICE_CODES = ["restarted", "modelChanged"] as const;

// The answers a user can have running at once, across their conversations
export const MAX_RUNNING_ANSWERS = 3;

// Something the agent does: read a file, call a tool, open a skill, search
// the web, start a sub-agent. The same id comes back when the step changes status
const stepEventSchema = z.object({
	type: z.literal("step"),
	id: z.string(),
	kind: z.enum(CHAT_STEP_KINDS),
	label: z.string(),
	status: z.enum(["running", "done", "error"]),
	// The step of the sub-agent that does this one
	parentId: z.string().optional(),
});

// The agent's plan for the answer, whole at each change: what it will do and how far it is
const planEventSchema = z.object({
	type: z.literal("plan"),
	items: z
		.array(
			z.object({
				text: z.string(),
				status: z.enum(["pending", "running", "done"]),
			}),
		)
		.max(100),
});

const fileEventSchema = z.object({
	type: z.literal("file"),
	id: z.string(),
	name: z.string(),
	mimeType: z.string(),
	size: z.number().int().nonnegative(),
	url: z.string(),
	// A PDF to show Word documents and presentations in the chat
	previewUrl: z.string().optional(),
});

// Input tokens exclude the cached ones; no cost when the model runs with the
// tenant's own key, since the producer bills it
const usageEventSchema = z.object({
	type: z.literal("usage"),
	inputTokens: z.number().int().nonnegative(),
	cachedInputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	webSearches: z.number().int().nonnegative(),
	// The web pages the agent read; the pods before the page reader send none
	webPages: z.number().int().nonnegative().default(0),
	costEur: z.number().nonnegative().nullable(),
});

/**
 * The events of a chat turn, the same for the test panel, our chat and the
 * client apps: the raw stream of the engine never reaches them.
 */
export const chatEventSchema = z.discriminatedUnion("type", [
	// A piece of the answer, in Markdown
	z.object({ type: z.literal("text"), delta: z.string() }),
	stepEventSchema,
	planEventSchema,
	// A write tool waits for the user: the turn ends and goes on with the answer
	z.object({
		type: z.literal("confirmation"),
		stepId: z.string(),
		input: z.record(z.string(), z.unknown()),
	}),
	fileEventSchema,
	usageEventSchema,
	z.object({ type: z.literal("error"), code: z.enum(CHAT_ERROR_CODES) }),
	z.object({
		type: z.literal("end"),
		reason: z.enum(["completed", "confirmation", "stopped"]),
	}),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

// A part of a message as the events build it
export const chatPartSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), text: z.string() }),
	stepEventSchema.extend({
		// A write tool waiting for the user, or answered
		confirmation: z
			.object({
				input: z.record(z.string(), z.unknown()),
				approved: z.boolean().optional(),
			})
			.optional(),
	}),
	planEventSchema,
	fileEventSchema,
	z.object({ type: z.literal("notice"), code: z.enum(CHAT_NOTICE_CODES) }),
	// A user's message that is a filled-in form
	formPartSchema,
]);

/**
 * What a page that follows an answer of a saved conversation receives: the
 * answer as it stands when the page joins, or when it starts over, and then
 * the events of its turn. The pod never sends the reset.
 */
export const answerEventSchema = z.union([
	chatEventSchema,
	z.object({
		type: z.literal("reset"),
		parts: z.array(chatPartSchema),
		usage: usageEventSchema.omit({ type: true }).nullable(),
	}),
]);

export type AnswerEvent = z.infer<typeof answerEventSchema>;

// Attachments are described only by name for now: they reach the storage
// together with the engine
export const chatAttachmentSchema = z.object({
	name: z.string().trim().min(1).max(255),
	mimeType: z.string().max(255),
	size: z.number().int().nonnegative(),
});

export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;

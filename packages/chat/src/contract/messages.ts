/**
 * A chat message as the events of its turn build it: the same for the chat in
 * the browser and for the conversations the API keeps.
 */
import type { z } from "zod";

import type { AnswerEvent, ChatAttachment, ChatEvent, chatPartSchema } from "./events";
import { type FormPart, formPrompt, formSummary, publicFormElements } from "./form";

export type ChatErrorCode = Extract<ChatEvent, { type: "error" }>["code"];

export type ChatPart = z.infer<typeof chatPartSchema>;

export type ChatStep = Omit<Extract<ChatPart, { type: "step" }>, "type">;

export type ChatFile = Omit<Extract<ChatEvent, { type: "file" }>, "type">;

export type ChatNotice = Omit<Extract<ChatPart, { type: "notice" }>, "type">;

export type ChatPlan = Omit<Extract<ChatPart, { type: "plan" }>, "type">;

export type ChatUsage = Omit<Extract<ChatEvent, { type: "usage" }>, "type">;

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	parts: ChatPart[];
	attachments: ChatAttachment[];
	status: "running" | "complete" | "awaiting-confirmation" | "stopped" | "error";
	errorCode: ChatErrorCode | null;
	// Summed over the turn, which goes on after a confirmation
	usage: ChatUsage | null;
}

// A message of the user: what they wrote, or the form they filled in
export function createUserMessage(
	id: string,
	text: string,
	attachments: ChatAttachment[],
	form?: FormPart,
): ChatMessage {
	return {
		id,
		role: "user",
		parts: form ? [form] : text ? [{ type: "text", text }] : [],
		attachments,
		status: "complete",
		errorCode: null,
		usage: null,
	};
}

// A message as the agent reads it: its text, or its form with what to do with each field
export function messageText(parts: ChatPart[]) {
	return parts
		.flatMap((part) =>
			part.type === "text" ? [part.text] : part.type === "form" ? [formPrompt(part)] : [],
		)
		.join("");
}

// A user's message as they wrote it, for the conversation's title: its text, or its form's values
export function userText(parts: ChatPart[]) {
	return parts
		.flatMap((part) =>
			part.type === "text" ? [part.text] : part.type === "form" ? [formSummary(part)] : [],
		)
		.join("");
}

// The parts as the browser gets them: a form without the agent's notes on its fields
export const publicParts = (parts: ChatPart[]): ChatPart[] =>
	parts.map((part) =>
		part.type === "form" ? { ...part, elements: publicFormElements(part.elements) } : part,
	);

// The form a user's message is, if any
export const formOf = (parts: ChatPart[]) =>
	parts.find((part): part is FormPart => part.type === "form") ?? null;

export function createAssistantMessage(id: string): ChatMessage {
	return {
		id,
		role: "assistant",
		parts: [],
		attachments: [],
		status: "running",
		errorCode: null,
		usage: null,
	};
}

const addUsage = (current: ChatUsage | null, usage: ChatUsage): ChatUsage =>
	current
		? {
				inputTokens: current.inputTokens + usage.inputTokens,
				cachedInputTokens: current.cachedInputTokens + usage.cachedInputTokens,
				outputTokens: current.outputTokens + usage.outputTokens,
				webSearches: current.webSearches + usage.webSearches,
				webPages: current.webPages + usage.webPages,
				costEur:
					current.costEur === null || usage.costEur === null
						? null
						: current.costEur + usage.costEur,
			}
		: usage;

const END_STATUSES = {
	completed: "complete",
	confirmation: "awaiting-confirmation",
	stopped: "stopped",
} as const satisfies Record<Extract<ChatEvent, { type: "end" }>["reason"], ChatMessage["status"]>;

/**
 * Applies an event of the turn to the assistant message that answers it.
 */
export function applyChatEvent(message: ChatMessage, event: ChatEvent): ChatMessage {
	switch (event.type) {
		case "text": {
			const last = message.parts[message.parts.length - 1];

			return {
				...message,
				parts:
					last?.type === "text"
						? [
								...message.parts.slice(0, -1),
								{ ...last, text: last.text + event.delta },
							]
						: [...message.parts, { type: "text", text: event.delta }],
			};
		}
		case "step": {
			const step = {
				id: event.id,
				kind: event.kind,
				label: event.label,
				status: event.status,
				...(event.parentId !== undefined && { parentId: event.parentId }),
			};
			const exists = message.parts.some(
				(part) => part.type === "step" && part.id === event.id,
			);

			return {
				...message,
				parts: exists
					? message.parts.map((part) =>
							part.type === "step" && part.id === event.id
								? { ...part, ...step }
								: part,
						)
					: [...message.parts, { type: "step", ...step }],
			};
		}
		// The plan comes whole at each change, and stays where it first appeared
		case "plan": {
			const plan = { type: "plan" as const, items: event.items };

			return {
				...message,
				parts: message.parts.some((part) => part.type === "plan")
					? message.parts.map((part) => (part.type === "plan" ? plan : part))
					: [...message.parts, plan],
			};
		}
		case "confirmation":
			return {
				...message,
				parts: message.parts.map((part) =>
					part.type === "step" && part.id === event.stepId
						? { ...part, confirmation: { input: event.input } }
						: part,
				),
			};
		case "file":
			return {
				...message,
				parts: [
					...message.parts,
					{
						type: "file",
						id: event.id,
						name: event.name,
						mimeType: event.mimeType,
						size: event.size,
						url: event.url,
					},
				],
			};
		case "usage":
			return {
				...message,
				usage: addUsage(message.usage, {
					inputTokens: event.inputTokens,
					cachedInputTokens: event.cachedInputTokens,
					outputTokens: event.outputTokens,
					webSearches: event.webSearches,
					webPages: event.webPages,
					costEur: event.costEur,
				}),
			};
		case "error":
			return { ...message, status: "error", errorCode: event.code };
		case "end":
			return message.status === "error"
				? message
				: { ...message, status: END_STATUSES[event.reason] };
	}
}

/**
 * Applies what a page following an answer receives: an event of the turn, or
 * the answer as it stands, from which the turn goes on.
 */
export function applyAnswerEvent(message: ChatMessage, event: AnswerEvent): ChatMessage {
	return event.type === "reset"
		? { ...message, parts: event.parts, usage: event.usage, status: "running", errorCode: null }
		: applyChatEvent(message, event);
}

// The events that bring a page to an answer as it was saved
export function closingEvents(message: ChatMessage): AnswerEvent[] {
	const reset: AnswerEvent = { type: "reset", parts: message.parts, usage: message.usage };

	switch (message.status) {
		case "running":
			return [reset];
		case "complete":
			return [reset, { type: "end", reason: "completed" }];
		case "awaiting-confirmation":
			return [reset, { type: "end", reason: "confirmation" }];
		case "stopped":
			return [reset, { type: "end", reason: "stopped" }];
		case "error":
			return [reset, { type: "error", code: message.errorCode ?? "internal" }];
	}
}

export function answerConfirmation(
	message: ChatMessage,
	stepId: string,
	approved: boolean,
): ChatMessage {
	return {
		...message,
		status: "running",
		parts: message.parts.map((part) =>
			part.type === "step" && part.id === stepId && part.confirmation
				? { ...part, confirmation: { ...part.confirmation, approved } }
				: part,
		),
	};
}

export function failMessage(message: ChatMessage, code: ChatErrorCode): ChatMessage {
	return { ...message, status: "error", errorCode: code };
}

/**
 * Closes a turn whose stream ended without its end event: stopped by the user,
 * or cut off.
 */
export function settleMessage(message: ChatMessage, stopped: boolean): ChatMessage {
	if (message.status !== "running") {
		return message;
	}

	return stopped ? { ...message, status: "stopped" } : failMessage(message, "internal");
}

export function hasPendingConfirmation(message: ChatMessage) {
	return message.parts.some(
		(part) =>
			part.type === "step" && part.confirmation && part.confirmation.approved === undefined,
	);
}

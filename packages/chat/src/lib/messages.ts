import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ChatMessage, ChatStep } from "../contract/messages";
import { splitQuote } from "./references";

// The message model is the API's, which keeps the conversations in the same shape
export {
	answerConfirmation,
	applyAnswerEvent,
	applyChatEvent,
	type ChatErrorCode,
	type ChatFile,
	type ChatMessage,
	type ChatNotice,
	type ChatPart,
	type ChatPlan,
	type ChatStep,
	type ChatUsage,
	createAssistantMessage,
	createUserMessage,
	failMessage,
	hasPendingConfirmation,
	settleMessage,
} from "../contract/messages";

const THREAD_STATUSES = {
	running: { type: "running" },
	complete: { type: "complete", reason: "stop" },
	"awaiting-confirmation": { type: "requires-action", reason: "tool-calls" },
	stopped: { type: "incomplete", reason: "cancelled" },
	error: { type: "incomplete", reason: "error" },
} as const satisfies Record<ChatMessage["status"], ThreadMessageLike["status"]>;

// The reference at the top of a user's message, shown and edited apart from its text
function quoteOf(message: ChatMessage) {
	const first = message.parts[0];

	if (message.role !== "user" || first?.type !== "text") {
		return null;
	}

	const { quote, text } = splitQuote(first.text);

	return quote === null ? null : { quote: { text: quote, messageId: message.id }, text };
}

// A step as its row shows it: a sub-agent carries its own steps
export type ChatStepView = ChatStep & { steps?: ChatStep[] };

type StepPart = Extract<ChatMessage["parts"][number], { type: "step" }>;

/**
 * The message as assistant-ui renders it: steps become tool calls that carry
 * the step, with the confirmation as an approval, and the steps of a
 * sub-agent go inside its own; the plan, files, notices and the agent's
 * questions become data parts.
 */
export function toThreadMessage(message: ChatMessage): ThreadMessageLike {
	const quoted = quoteOf(message);
	const parts = quoted
		? message.parts.flatMap((part, index) =>
				index > 0 || part.type !== "text"
					? [part]
					: quoted.text
						? [{ ...part, text: quoted.text }]
						: [],
			)
		: message.parts;

	// A form shows as the form itself, not among the parts
	const form = parts.find((part) => part.type === "form");
	// Answers to the agent's questions show as their own short message
	const answers = parts.find((part) => part.type === "answers");
	const subagents = new Set(
		parts.flatMap((part) => (part.type === "step" && part.kind === "agent" ? [part.id] : [])),
	);
	const stepsOf = (subagentId: string) =>
		parts.filter(
			(part): part is StepPart => part.type === "step" && part.parentId === subagentId,
		);

	return {
		id: message.id,
		role: message.role,
		content: parts.flatMap((part): Exclude<ThreadMessageLike["content"], string>[number][] => {
			switch (part.type) {
				case "text":
					return [{ type: "text", text: part.text }];
				case "step":
					// Inside its sub-agent's row
					if (part.parentId !== undefined && subagents.has(part.parentId)) {
						return [];
					}

					return [
						{
							type: "tool-call",
							toolCallId: part.id,
							toolName: part.kind,
							args: {},
							artifact:
								part.kind === "agent" ? { ...part, steps: stepsOf(part.id) } : part,
							...(part.status !== "running" && { result: part.status }),
							isError: part.status === "error",
							...(part.confirmation && {
								approval: {
									id: part.id,
									...(part.confirmation.approved !== undefined && {
										approved: part.confirmation.approved,
									}),
								},
							}),
						},
					];
				case "plan":
					return [{ type: "data-plan", data: part }];
				case "file":
					return [{ type: "data-file", data: part }];
				case "notice":
					return [{ type: "data-notice", data: part }];
				case "question":
					return [{ type: "data-question", data: part }];
				case "form":
				case "answers":
					return [];
			}
		}),
		attachments: message.attachments.map((attachment, index) => ({
			id: `${message.id}-${index}`,
			type: "document",
			name: attachment.name,
			contentType: attachment.mimeType,
			status: { type: "complete" },
			content: [],
		})),
		status: message.role === "assistant" ? THREAD_STATUSES[message.status] : undefined,
		metadata: {
			custom: {
				usage: message.usage,
				errorCode: message.errorCode,
				...(quoted && { quote: quoted.quote }),
				...(form && { form }),
				...(answers && { answers }),
			},
		},
	};
}

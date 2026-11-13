import type { ChatMessage } from "../contract/messages";
import {
	type ChatOutgoingAttachment,
	type ChatTransport,
	ChatTransportError,
	type ChatTreeMessage,
} from "../lib/use-chat-runtime";
import { type GubernetClient, GubernetApiError, type SavedMessage } from "./client";

const toChatError = (error: unknown) =>
	error instanceof GubernetApiError && error.code === "SERVICE_UNAVAILABLE"
		? new ChatTransportError("engine_unavailable")
		: error;

// A saved message as the chat holds it, with the one it follows; the user never sees its cost
export function toChatTreeMessage(message: SavedMessage): ChatTreeMessage {
	return {
		id: message.id,
		parentId: message.parentId,
		role: message.role,
		parts: message.parts as ChatMessage["parts"],
		attachments: message.attachments as ChatMessage["attachments"],
		status: message.status as ChatMessage["status"],
		errorCode: message.errorCode as ChatMessage["errorCode"],
		usage: null,
	};
}

export interface NewConversation {
	organizationId: string;
	agentId: string;
	modelCode: string;
}

/**
 * A saved conversation of an installation. A new chat creates it at the first
 * message, with the agent and the model chosen until then (`choose`), and
 * tells its identifier and what it started with.
 */
export function createConversationTransport(
	client: GubernetClient,
	{
		conversationId,
		onCreated,
	}: {
		conversationId: string | null;
		onCreated?: (id: string, started: NewConversation) => void;
	},
) {
	let id = conversationId;
	let newConversation: NewConversation | null = null;

	const getId = async (signal: AbortSignal) => {
		if (!id) {
			const started = newConversation;

			if (!started) {
				throw new ChatTransportError("internal");
			}

			id = (await client.createConversation(started, signal)).id;
			onCreated?.(id, started);
		}

		return id;
	};

	// Only a conversation already started can answer, go back or be read again
	const requireId = () => {
		if (!id) {
			throw new ChatTransportError("internal");
		}

		return id;
	};

	// A form's files kept from the message sent before have no upload: the server keeps them
	const upload = async (
		conversation: string,
		{ file, ...attachment }: ChatOutgoingAttachment,
		signal: AbortSignal,
	) =>
		file
			? {
					...attachment,
					fileId: await client.uploadAttachment(conversation, attachment, file, signal),
				}
			: attachment;

	return {
		// A new chat's agent and model until the first message; then nothing changes
		choose(next: NewConversation) {
			newConversation = next;
		},

		async send({ text, attachments, parentId, form, keepFrom, answers }, signal) {
			try {
				const conversation = await getId(signal);
				const uploaded = await Promise.all(
					attachments.map((attachment) => upload(conversation, attachment, signal)),
				);

				return await client.sendMessage(
					conversation,
					{ text, attachments: uploaded, parentId, form, keepFrom, answers },
					signal,
				);
			} catch (error) {
				throw toChatError(error);
			}
		},

		async respond(answer, signal) {
			try {
				return await client.respondToConfirmation(requireId(), answer, signal);
			} catch (error) {
				throw toChatError(error);
			}
		},

		async regenerate(messageId, signal) {
			try {
				return await client.regenerateAnswer(messageId, signal);
			} catch (error) {
				throw toChatError(error);
			}
		},

		async load() {
			const { messages } = await client.findConversation(requireId());

			return messages.map(toChatTreeMessage);
		},

		async follow(messageId, signal) {
			try {
				return await client.followAnswer(messageId, signal);
			} catch (error) {
				throw toChatError(error);
			}
		},

		async stop() {
			if (id) {
				await client.stopConversation(id);
			}
		},
	} satisfies ChatTransport & { choose: (next: NewConversation) => void };
}

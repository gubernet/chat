/**
 * The API of a Gubernet installation, as the chat uses it: the agent, its
 * conversations and the turns of a conversation. The user is the one signed in
 * to the installation: the requests carry its session.
 */
import type { AnswerEvent, ChatAttachment } from "../contract/events";
import type { FormElement, FormResult, FormValues } from "../contract/form";
import type { ChatMessage } from "../contract/messages";
import type { Answer } from "../contract/questions";
import { readEventIterator } from "./sse";

export interface ChatAgentModel {
	code: string;
	name: string;
	// The family the model belongs to, as "claude" or "mistral", which gives it its
	// logo; an installation before this one doesn't say it
	family?: string;
	// How expensive the model is next to the others, from 0 to 1
	costLevel: number | null;
	// Whether the budgets leave it for now
	available: boolean;
}

export interface ChatAgent {
	id: string;
	version: number;
	name: string;
	logoUrl: string | null;
	description: string | null;
	conversationStarters: string[];
	// The form the chat starts from, or null for the text box
	form: { elements: FormElement[]; result: FormResult } | null;
	// The first is the one proposed
	models: ChatAgentModel[];
}

// The user's own budget of the month: the chat warns at 80% and stops at 100%
export interface ChatBudget {
	percent: number | null;
	exhausted: boolean;
	canRequestIncrease: boolean;
	hasPendingRequest: boolean;
}

export interface AgentChat {
	organizationId: string;
	agent: ChatAgent;
	budget: ChatBudget;
}

export interface ListedConversation {
	id: string;
	title: string | null;
	pinnedAt: string | null;
	lastMessageAt: string;
}

export interface SavedMessage {
	id: string;
	parentId: string | null;
	role: "user" | "assistant";
	parts: ChatMessage["parts"];
	attachments: ChatMessage["attachments"];
	status: ChatMessage["status"];
	errorCode: ChatMessage["errorCode"];
}

export interface SavedConversation {
	id: string;
	organizationId: string;
	title: string | null;
	modelCode: string;
	agent: { id: string; name: string; logoUrl: string | null } | null;
	// Without access to the agent any more, the conversation stays readable
	canContinue: boolean;
	messages: SavedMessage[];
}

export interface MessageInput {
	text: string;
	attachments: Array<ChatAttachment & { fileId?: string }>;
	parentId: string | null;
	form?: { values: FormValues };
	keepFrom?: string;
	answers?: Answer[];
}

// An error the API answered with: its HTTP status and its code, as NOT_FOUND
export class GubernetApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "GubernetApiError";
	}
}

const toApiError = (status: number, body: unknown) => {
	const error = (body ?? {}) as { code?: unknown; message?: unknown };

	return new GubernetApiError(
		status,
		typeof error.code === "string" ? error.code : "UNKNOWN",
		typeof error.message === "string" ? error.message : `Request failed with status ${status}`,
	);
};

interface RequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	query?: Record<string, string | number | undefined>;
	body?: unknown;
	signal?: AbortSignal;
}

export interface GubernetClientOptions {
	// The address of the installation, as https://app.example.com
	url: string;
	// Another fetch, for a test or a server
	fetch?: typeof fetch;
}

export type GubernetClient = ReturnType<typeof createGubernetClient>;

export function createGubernetClient({ url, fetch: customFetch }: GubernetClientOptions) {
	const base = url.replace(/\/+$/, "");
	const send: typeof fetch = (input, init) => (customFetch ?? fetch)(input, init);

	// An address the installation gives without its own, as a logo's
	const absolute = <T extends string | null>(address: T) =>
		address?.startsWith("/") ? (`${base}${address}` as T) : address;

	const request = async (
		path: string,
		{ method = "GET", query, body, signal }: RequestOptions,
	) => {
		const params = new URLSearchParams();

		for (const [name, value] of Object.entries(query ?? {})) {
			if (value !== undefined) {
				params.set(name, String(value));
			}
		}

		const search = params.size ? `?${params}` : "";
		const isForm = body instanceof FormData;
		const response = await send(`${base}/api${path}${search}`, {
			method,
			credentials: "include",
			headers: {
				accept: "application/json, text/event-stream",
				...(body !== undefined && !isForm && { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
			signal,
		});

		if (!response.ok) {
			throw toApiError(response.status, await response.json().catch(() => null));
		}

		return response;
	};

	const json = async <T>(path: string, options: RequestOptions = {}) => {
		const text = await (await request(path, options)).text();

		return (text ? JSON.parse(text) : undefined) as T;
	};

	// A turn: its events as they come, until it ends or the signal stops it
	const events = async (path: string, options: RequestOptions) => {
		const response = await request(path, options);

		if (!response.body) {
			throw new GubernetApiError(response.status, "UNKNOWN", "The answer has no stream");
		}

		return readEventIterator<AnswerEvent>(response.body, (data) => toApiError(500, data));
	};

	const id = encodeURIComponent;

	return {
		// The agent as the user may chat with it now, with their budget
		async getAgentChat(agentId: string, signal?: AbortSignal): Promise<AgentChat> {
			const chat = await json<AgentChat>(`/agents/${id(agentId)}/chat`, { signal });

			return { ...chat, agent: { ...chat.agent, logoUrl: absolute(chat.agent.logoUrl) } };
		},

		// The user's conversations with the agent, the pinned ones first, then the most recent
		async listConversations(
			input: { organizationId: string; agentId: string; query?: string; limit?: number },
			signal?: AbortSignal,
		) {
			const { conversations } = await json<{ conversations: ListedConversation[] }>(
				`/organizations/${id(input.organizationId)}/conversations`,
				{
					query: { agentId: input.agentId, query: input.query, limit: input.limit },
					signal,
				},
			);

			return conversations;
		},

		createConversation(
			input: { organizationId: string; agentId: string; modelCode: string },
			signal?: AbortSignal,
		) {
			return json<{ id: string }>(
				`/organizations/${id(input.organizationId)}/conversations`,
				{
					method: "POST",
					body: { agentId: input.agentId, modelCode: input.modelCode },
					signal,
				},
			);
		},

		findConversation(conversationId: string, signal?: AbortSignal) {
			return json<SavedConversation>(`/conversations/${id(conversationId)}`, { signal });
		},

		async renameConversation(conversationId: string, title: string) {
			await json(`/conversations/${id(conversationId)}/title`, {
				method: "PUT",
				body: { title },
			});
		},

		async pinConversation(conversationId: string, pinned: boolean) {
			await json(`/conversations/${id(conversationId)}/pinned`, {
				method: "PUT",
				body: { pinned },
			});
		},

		async deleteConversation(conversationId: string) {
			await json(`/conversations/${id(conversationId)}`, { method: "DELETE" });
		},

		// The conversation goes on with another of the agent's models, from the next answer
		async setConversationModel(conversationId: string, modelCode: string) {
			await json(`/conversations/${id(conversationId)}/model`, {
				method: "PUT",
				body: { modelCode },
			});
		},

		sendMessage(conversationId: string, message: MessageInput, signal: AbortSignal) {
			return events(`/conversations/${id(conversationId)}/messages`, {
				method: "POST",
				body: message,
				signal,
			});
		},

		regenerateAnswer(messageId: string, signal: AbortSignal) {
			return events(`/conversation-messages/${id(messageId)}/regenerate`, {
				method: "POST",
				body: {},
				signal,
			});
		},

		respondToConfirmation(
			conversationId: string,
			answer: { stepId: string; approved: boolean },
			signal: AbortSignal,
		) {
			return events(`/conversations/${id(conversationId)}/confirmations`, {
				method: "POST",
				body: answer,
				signal,
			});
		},

		// An answer from its start, then live: for a conversation opened while the agent answers
		followAnswer(messageId: string, signal: AbortSignal) {
			return events(`/conversation-messages/${id(messageId)}/events`, { signal });
		},

		async stopConversation(conversationId: string) {
			await json(`/conversations/${id(conversationId)}/stop`, { method: "POST", body: {} });
		},

		// The file reaches the storage first; the message then names it
		async uploadAttachment(
			conversationId: string,
			attachment: ChatAttachment,
			file: File,
			signal?: AbortSignal,
		) {
			const { fileId, signedUploadUrl } = await json<{
				fileId: string;
				signedUploadUrl: string;
			}>(`/conversations/${id(conversationId)}/attachments`, {
				method: "POST",
				body: attachment,
				signal,
			});
			// To the storage, which knows nothing of the installation's session
			const response = await send(signedUploadUrl, {
				method: "PUT",
				body: file,
				headers: { "content-type": attachment.mimeType },
				signal,
			});

			if (!response.ok) {
				throw new GubernetApiError(response.status, "UPLOAD_FAILED", "The upload failed");
			}

			return fileId;
		},

		// Whether the organization has the chat's microphone on
		async getDictationEnabled(organizationId: string, signal?: AbortSignal) {
			const { enabled } = await json<{ enabled: boolean }>(
				`/organizations/${id(organizationId)}/dictation`,
				{ signal },
			);

			return enabled;
		},

		// The text of a dictation, a 16 kHz mono WAV
		async transcribe(organizationId: string, audio: Blob, signal?: AbortSignal) {
			const body = new FormData();

			body.set("audio", new File([audio], "dictation.wav", { type: "audio/wav" }));

			const { text } = await json<{ text: string }>(
				`/organizations/${id(organizationId)}/dictation/transcriptions`,
				{ method: "POST", body, signal },
			);

			return text;
		},

		// Asks the organization's admins for more budget
		async requestBudgetIncrease(organizationId: string, note: string | null) {
			await json(`/organizations/${id(organizationId)}/budget-requests`, {
				method: "POST",
				body: { note },
			});
		},
	};
}

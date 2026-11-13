import { describe, expect, it } from "vitest";

import { createGubernetClient, GubernetApiError } from "./client";
import { createConversationTransport } from "./transport";

interface Call {
	url: string;
	method: string;
	body: unknown;
	credentials: RequestCredentials | undefined;
}

// A fetch that answers from a list, in order, and keeps what it was asked
function fakeFetch(responses: Response[]) {
	const calls: Call[] = [];
	const fetch: typeof globalThis.fetch = async (input, init) => {
		const body = init?.body;

		calls.push({
			url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
			method: init?.method ?? "GET",
			body: typeof body === "string" ? JSON.parse(body) : body,
			credentials: init?.credentials,
		});

		const response = responses.shift();

		if (!response) {
			throw new Error("No answer left");
		}

		return response;
	};

	return { fetch, calls };
}

const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), {
		status,
		headers: { "content-type": "application/json" },
	});

const events = (...values: unknown[]) =>
	new Response(
		[
			...values.map((value) => `event: message\ndata: ${JSON.stringify(value)}\n\n`),
			"event: done\n\n",
		].join(""),
		{ headers: { "content-type": "text/event-stream" } },
	);

const agentChat = {
	organizationId: "org-1",
	agent: {
		id: "agent-1",
		version: 3,
		name: "Assistente",
		logoUrl: "/image-proxy/avatars/org-1/agents/agent-1/logo",
		description: null,
		conversationStarters: [],
		form: null,
		models: [{ code: "model-a", name: "Model A", costLevel: 0.2, available: true }],
	},
	budget: {
		percent: null,
		exhausted: false,
		canRequestIncrease: false,
		hasPendingRequest: false,
	},
};

describe("the client of an installation", () => {
	it("reads the agent with the user's session and its logo at the installation's address", async () => {
		const { fetch, calls } = fakeFetch([json(agentChat)]);
		const client = createGubernetClient({ url: "https://app.example.com/", fetch });

		const chat = await client.getAgentChat("agent-1");

		expect(calls).toEqual([
			{
				url: "https://app.example.com/api/agents/agent-1/chat",
				method: "GET",
				body: undefined,
				credentials: "include",
			},
		]);
		expect(chat.agent.logoUrl).toBe(
			"https://app.example.com/image-proxy/avatars/org-1/agents/agent-1/logo",
		);
	});

	it("lists the conversations of the agent, with the search only when there is one", async () => {
		const { fetch, calls } = fakeFetch([json({ conversations: [] })]);
		const client = createGubernetClient({ url: "https://app.example.com", fetch });

		await client.listConversations({ organizationId: "org-1", agentId: "agent-1", limit: 30 });

		expect(calls[0]?.url).toBe(
			"https://app.example.com/api/organizations/org-1/conversations?agentId=agent-1&limit=30",
		);
	});

	it("gives the API's error with its status and code", async () => {
		const { fetch } = fakeFetch([
			json({ code: "NOT_FOUND", status: 404, message: "Not found" }, 404),
		]);
		const client = createGubernetClient({ url: "https://app.example.com", fetch });

		await expect(client.getAgentChat("missing")).rejects.toMatchObject({
			name: "GubernetApiError",
			status: 404,
			code: "NOT_FOUND",
		});
		expect(new GubernetApiError(404, "NOT_FOUND", "Not found")).toBeInstanceOf(Error);
	});
});

describe("the transport of a conversation", () => {
	it("creates the conversation at the first message, uploads its files and streams the answer", async () => {
		const { fetch, calls } = fakeFetch([
			json({ id: "conversation-1" }),
			json({ fileId: "file-1", signedUploadUrl: "https://storage.example.com/upload" }),
			new Response(null, { status: 200 }),
			events({ type: "text", delta: "Ciao" }, { type: "end", reason: "completed" }),
		]);
		const client = createGubernetClient({ url: "https://app.example.com", fetch });
		const created: string[] = [];
		const transport = createConversationTransport(client, {
			conversationId: null,
			onCreated: (id) => created.push(id),
		});
		const file = new File(["contenuto"], "nota.txt", { type: "text/plain" });

		transport.choose({ organizationId: "org-1", agentId: "agent-1", modelCode: "model-a" });

		const received: unknown[] = [];
		const stream = await transport.send(
			{
				text: "Leggi la nota",
				attachments: [{ name: "nota.txt", mimeType: "text/plain", size: 9, file }],
				parentId: null,
			},
			new AbortController().signal,
		);

		for await (const event of stream) {
			received.push(event);
		}

		expect(created).toEqual(["conversation-1"]);
		expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
			"POST https://app.example.com/api/organizations/org-1/conversations",
			"POST https://app.example.com/api/conversations/conversation-1/attachments",
			"PUT https://storage.example.com/upload",
			"POST https://app.example.com/api/conversations/conversation-1/messages",
		]);
		expect(calls[0]?.body).toEqual({ agentId: "agent-1", modelCode: "model-a" });
		// The message names the uploaded file, without the file itself
		expect(calls[3]?.body).toEqual({
			text: "Leggi la nota",
			attachments: [{ name: "nota.txt", mimeType: "text/plain", size: 9, fileId: "file-1" }],
			parentId: null,
		});
		expect(received).toEqual([
			{ type: "text", delta: "Ciao" },
			{ type: "end", reason: "completed" },
		]);
	});

	it("shows an engine that is not active as the chat's own error", async () => {
		const { fetch } = fakeFetch([
			json({ code: "SERVICE_UNAVAILABLE", status: 503, message: "Unavailable" }, 503),
		]);
		const client = createGubernetClient({ url: "https://app.example.com", fetch });
		const transport = createConversationTransport(client, { conversationId: "conversation-1" });

		await expect(
			transport.send(
				{ text: "Ciao", attachments: [], parentId: null },
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: "engine_unavailable" });
	});
});

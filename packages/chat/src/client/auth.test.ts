import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppTokenAuth, createWindowAuth, sessionFromMessage } from "./auth";
import { createLayeralClient, LayeralApiError } from "./client";

interface Call {
	url: string;
	method: string;
	body: unknown;
	credentials: RequestCredentials | undefined;
	authorization: string | null;
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
			authorization: new Headers(init?.headers).get("authorization"),
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

const base = "https://app.example.com";
const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe("the chat on another site, with the app's token", () => {
	it("exchanges the app's token for a session of the chat, and never sends the cookie", async () => {
		const { fetch, calls } = fakeFetch([
			json({ token: "gbe_1", expiresAt: inOneHour(), organizationId: "org-1" }),
			json({ conversations: [] }),
		]);
		const auth = createAppTokenAuth({
			base,
			agentId: "agent-1",
			send: fetch,
			getToken: async () => "app-token",
		});
		const client = createLayeralClient({ url: base, fetch, auth });

		await client.listConversations({ organizationId: "org-1", agentId: "agent-1" });

		expect(calls[0]).toMatchObject({
			url: `${base}/api/embed/sessions`,
			method: "POST",
			body: { agentId: "agent-1", token: "app-token" },
			credentials: "omit",
		});
		expect(calls[1]).toMatchObject({ credentials: "omit", authorization: "Bearer gbe_1" });
	});

	it("starts a new session once when the installation refuses it", async () => {
		const { fetch, calls } = fakeFetch([
			json({ token: "gbe_1", expiresAt: inOneHour() }),
			json({ code: "UNAUTHORIZED" }, 401),
			json({ token: "gbe_2", expiresAt: inOneHour() }),
			json({ conversations: [] }),
		]);
		const auth = createAppTokenAuth({
			base,
			agentId: "agent-1",
			send: fetch,
			getToken: async () => "app-token",
		});
		const client = createLayeralClient({ url: base, fetch, auth });

		await client.listConversations({ organizationId: "org-1", agentId: "agent-1" });

		expect(calls.map(({ authorization }) => authorization)).toEqual([
			null,
			"Bearer gbe_1",
			null,
			"Bearer gbe_2",
		]);
	});

	it("gives the session the app's new token before a turn, only when it changed", async () => {
		let appToken = "app-token-1";
		const { fetch, calls } = fakeFetch([
			json({ token: "gbe_1", expiresAt: inOneHour() }),
			json({ conversations: [] }),
			json({ expiresAt: inOneHour() }),
		]);
		const auth = createAppTokenAuth({
			base,
			agentId: "agent-1",
			send: fetch,
			getToken: async () => appToken,
		});
		const client = createLayeralClient({ url: base, fetch, auth });

		await client.listConversations({ organizationId: "org-1", agentId: "agent-1" });
		// The same token: nothing to give
		await auth.beforeTurn();
		expect(calls).toHaveLength(2);

		appToken = "app-token-2";
		await auth.beforeTurn();
		expect(calls[2]).toMatchObject({
			url: `${base}/api/embed/sessions/current`,
			method: "PUT",
			body: { token: "app-token-2" },
			authorization: "Bearer gbe_1",
		});
	});

	it("is signed out without a token from the app", async () => {
		const { fetch } = fakeFetch([]);
		const auth = createAppTokenAuth({
			base,
			agentId: "agent-1",
			send: fetch,
			getToken: async () => null,
		});
		const client = createLayeralClient({ url: base, fetch, auth });

		await expect(client.getAgentChat("agent-1")).rejects.toMatchObject({
			status: 401,
			code: "SIGNED_OUT",
		});
	});

	it("opens the files through signed links, asking the installation alone", async () => {
		const { fetch, calls } = fakeFetch([
			json({ token: "gbe_1", expiresAt: inOneHour() }),
			json({ url: "https://storage.example.com/signed" }),
		]);
		const auth = createAppTokenAuth({
			base,
			agentId: "agent-1",
			send: fetch,
			getToken: async () => "app-token",
		});
		const client = createLayeralClient({ url: base, fetch, auth });

		await expect(
			client.fileLink(`${base}/api/conversations/conversation-1/files/file-1`),
		).resolves.toBe("https://storage.example.com/signed");
		expect(calls[1]).toMatchObject({
			url: `${base}/api/conversations/conversation-1/files/file-1?link=true`,
			authorization: "Bearer gbe_1",
		});
		// Another site's address gets no token
		await expect(client.fileLink("https://other.example.com/file")).resolves.toBe(
			"https://other.example.com/file",
		);
		expect(calls).toHaveLength(2);
	});
});

describe("the chat on another site, with the Accedi window", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const storage = () => {
		const items = new Map<string, string>();

		vi.stubGlobal("sessionStorage", {
			getItem: (key: string) => items.get(key) ?? null,
			setItem: (key: string, value: string) => items.set(key, value),
			removeItem: (key: string) => items.delete(key),
		});

		return items;
	};

	it("is signed out until the window gives a session, then keeps it in the page", async () => {
		const items = storage();
		const { fetch, calls } = fakeFetch([json({ conversations: [] })]);
		const client = createLayeralClient({
			url: base,
			fetch,
			auth: createWindowAuth({ base, agentId: "agent-1" }),
		});

		await expect(client.getAgentChat("agent-1")).rejects.toBeInstanceOf(LayeralApiError);

		items.set(
			"layeral-chat-session:https://app.example.com",
			JSON.stringify({ token: "gbe_w", expiresAt: inOneHour() }),
		);
		await client.listConversations({ organizationId: "org-1", agentId: "agent-1" });

		expect(calls[0]).toMatchObject({ credentials: "omit", authorization: "Bearer gbe_w" });
	});

	it("forgets an ended session", async () => {
		const items = storage();

		items.set(
			"layeral-chat-session:https://app.example.com",
			JSON.stringify({
				token: "gbe_w",
				expiresAt: new Date(Date.now() - 1000).toISOString(),
			}),
		);

		await expect(
			createWindowAuth({ base, agentId: "agent-1" }).request(),
		).rejects.toMatchObject({ name: "ChatSignedOutError" });
	});

	it("takes the window's message only from the installation, for the same agent", () => {
		const data = {
			type: "layeral-chat-session",
			agentId: "agent-1",
			token: "gbe_w",
			expiresAt: inOneHour(),
			organizationId: "org-1",
		};

		expect(sessionFromMessage({ origin: base, data }, base, "agent-1")).toMatchObject({
			token: "gbe_w",
		});
		expect(sessionFromMessage({ origin: "https://evil.example", data }, base, "agent-1")).toBe(
			null,
		);
		expect(sessionFromMessage({ origin: base, data }, base, "agent-2")).toBe(null);
		expect(
			sessionFromMessage({ origin: base, data: { ...data, type: "other" } }, base, "agent-1"),
		).toBe(null);
	});
});

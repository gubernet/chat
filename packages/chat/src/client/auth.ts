/**
 * How the chat's requests carry the user's session. On the installation's own
 * address, its cookie. On another site the browser does not send that cookie:
 * the requests carry the token of a session of the chat alone, which the
 * installation gives from the app's own token (`getToken`), or from its
 * "Accedi" window, which goes through the tenant's identity provider.
 */
import {
	type EmbedSession,
	embedSessionMessageSchema,
	embedSessionSchema,
} from "../contract/embed";

export type ChatAuthMode = "cookie" | "app" | "window";

export interface ChatAuth {
	readonly mode: ChatAuthMode;
	// What a request adds: the session's token, or the cookie
	request: () => Promise<{ headers: Record<string, string>; credentials: RequestCredentials }>;
	// The installation refused the session: whether a new one is worth asking at once
	renew: () => Promise<boolean>;
	// Before a turn: the app's new token reaches the session, for the systems
	// the agent calls with the user's identity
	beforeTurn: () => Promise<void>;
	// The "Accedi" window, for a visitor without a session: true once signed in
	signIn?: () => Promise<boolean>;
}

// Without a session the chat on another site cannot ask anything
export class ChatSignedOutError extends Error {
	constructor() {
		super("No session of the chat");
		this.name = "ChatSignedOutError";
	}
}

// A session this close to its end is taken as ended
const EXPIRY_MARGIN_MS = 30_000;

const lasts = (session: EmbedSession) =>
	Date.parse(session.expiresAt) - Date.now() > EXPIRY_MARGIN_MS;

const bearer = (session: EmbedSession) => ({
	headers: { authorization: `Bearer ${session.token}` },
	credentials: "omit" as const,
});

export const cookieAuth: ChatAuth = {
	mode: "cookie",
	request: async () => ({ headers: {}, credentials: "include" }),
	renew: async () => false,
	beforeTurn: async () => undefined,
};

interface TokenAuthOptions {
	// The installation's address, without the final slash
	base: string;
	agentId: string;
	send: typeof fetch;
}

/**
 * The app's own token, from `getToken`, exchanged for a session of the chat:
 * a new one when the session ends or is refused, and before each turn the
 * app's latest token, when it changed.
 */
export function createAppTokenAuth({
	base,
	agentId,
	send,
	getToken,
}: TokenAuthOptions & { getToken: () => Promise<string | null | undefined> }): ChatAuth {
	let session: EmbedSession | null = null;
	let appToken: string | null = null;
	let starting: Promise<EmbedSession> | null = null;

	const start = async () => {
		const token = await getToken();

		if (!token) {
			throw new ChatSignedOutError();
		}

		const response = await send(`${base}/api/embed/sessions`, {
			method: "POST",
			credentials: "omit",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ agentId, token }),
		});
		const started = embedSessionSchema.safeParse(response.ok ? await response.json() : null);

		if (!started.success) {
			throw new ChatSignedOutError();
		}

		session = started.data;
		appToken = token;

		return started.data;
	};

	// One start at a time, for the requests that come together
	const current = async () => {
		if (session && lasts(session)) {
			return session;
		}

		starting ??= start().finally(() => {
			starting = null;
		});

		return starting;
	};

	return {
		mode: "app",
		request: async () => bearer(await current()),
		renew: async () => {
			session = null;
			return true;
		},
		beforeTurn: async () => {
			const active = session;
			const token = await getToken();

			if (!active || !token || token === appToken) {
				return;
			}

			const response = await send(`${base}/api/embed/sessions/current`, {
				method: "PUT",
				credentials: "omit",
				headers: {
					authorization: `Bearer ${active.token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ token }),
			});
			const renewed = response.ok
				? embedSessionSchema.pick({ expiresAt: true }).safeParse(await response.json())
				: null;

			// Refused: the next request starts a new session from the app's token
			session = renewed?.success ? { ...active, expiresAt: renewed.data.expiresAt } : null;
			appToken = renewed?.success ? token : appToken;
		},
	};
}

const storageKey = (installation: string) => `layeral-chat-session:${installation}`;

function readStored(key: string) {
	try {
		const stored = embedSessionSchema.safeParse(
			JSON.parse(sessionStorage.getItem(key) ?? "null"),
		);

		return stored.success && lasts(stored.data) ? stored.data : null;
	} catch {
		return null;
	}
}

function writeStored(key: string, session: EmbedSession | null) {
	try {
		if (session) {
			sessionStorage.setItem(key, JSON.stringify(session));
		} else {
			sessionStorage.removeItem(key);
		}
	} catch {
		// The page keeps no session: the next visit signs in again
	}
}

// What the installation's window sent, if it is the session of this agent's chat
export function sessionFromMessage(
	event: { origin: string; data: unknown },
	installation: string,
	agentId: string,
): EmbedSession | null {
	if (event.origin !== installation) {
		return null;
	}

	const message = embedSessionMessageSchema.safeParse(event.data);

	return message.success && message.data.agentId === agentId
		? { token: message.data.token, expiresAt: message.data.expiresAt }
		: null;
}

// How long a window closed without a message is still awaited: the message may follow it
const CLOSED_GRACE_MS = 1000;

// The installation's window: the session it sends, or null when it closes without one
function openSignInWindow(installation: string, agentId: string) {
	const address = `${installation}/embed-sign-in/${encodeURIComponent(agentId)}?${new URLSearchParams({ origin: window.location.origin })}`;
	const popup = window.open(address, "layeral-chat-sign-in", "popup,width=480,height=640");

	if (!popup) {
		return Promise.resolve(null);
	}

	return new Promise<EmbedSession | null>((resolve) => {
		let closedAt: number | null = null;

		const done = (session: EmbedSession | null) => {
			window.removeEventListener("message", onMessage);
			clearInterval(timer);
			resolve(session);
		};

		const onMessage = (event: MessageEvent) => {
			const session =
				event.source === popup ? sessionFromMessage(event, installation, agentId) : null;

			if (session) {
				done(session);
			}
		};

		const timer = setInterval(() => {
			if (!popup.closed) {
				return;
			}

			closedAt ??= Date.now();

			if (Date.now() - closedAt > CLOSED_GRACE_MS) {
				done(null);
			}
		}, 250);

		window.addEventListener("message", onMessage);
	});
}

/**
 * The session the "Accedi" window gave, kept in the page's sessionStorage: it
 * lasts across reloads and ends with the tab, or after its 12 hours.
 */
export function createWindowAuth({ base, agentId }: Omit<TokenAuthOptions, "send">): ChatAuth {
	const installation = new URL(base).origin;
	const key = storageKey(installation);

	return {
		mode: "window",
		request: async () => {
			const session = readStored(key);

			if (!session) {
				throw new ChatSignedOutError();
			}

			return bearer(session);
		},
		renew: async () => {
			writeStored(key, null);
			return false;
		},
		beforeTurn: async () => undefined,
		signIn: async () => {
			const session = await openSignInWindow(installation, agentId);

			if (session) {
				writeStored(key, session);
			}

			return session !== null;
		},
	};
}

/**
 * The chat's auth for an installation: its cookie on its own address, or
 * with no address at all; elsewhere the app's token when the app gives one,
 * otherwise the "Accedi" window.
 */
export function chatAuthFor({
	url,
	agentId,
	send = fetch,
	getToken,
}: {
	url: string;
	agentId: string;
	send?: typeof fetch;
	getToken?: () => Promise<string | null | undefined>;
}): ChatAuth {
	if (typeof window === "undefined" || !url) {
		return cookieAuth;
	}

	const base = url.replace(/\/+$/, "");

	if (new URL(base, window.location.href).origin === window.location.origin) {
		return cookieAuth;
	}

	return getToken
		? createAppTokenAuth({ base, agentId, send, getToken })
		: createWindowAuth({ base, agentId });
}

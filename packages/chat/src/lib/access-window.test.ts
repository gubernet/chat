import { afterEach, describe, expect, it, vi } from "vitest";

import { IDENTITY_ACCESS_MESSAGE } from "../contract/identity-access";
import { createAccessLink } from "./access-window";

const installation = "https://app.example.com";
const page = "https://intranet.acme.example";
const login = "https://login.example.com/acme/authorize?prompt=select_account";

// The chat's page, with the window it opens
function fakePage({ blocked = false } = {}) {
	const listeners = new Set<(event: MessageEvent) => void>();
	const popup = {
		closed: false,
		location: { href: "" },
		close() {
			this.closed = true;
		},
	};
	const open = vi.fn(() => (blocked ? null : popup));

	vi.stubGlobal("window", {
		location: { origin: page },
		open,
		addEventListener: (_type: string, listener: (event: MessageEvent) => void) =>
			listeners.add(listener),
		removeEventListener: (_type: string, listener: (event: MessageEvent) => void) =>
			listeners.delete(listener),
	});

	const post = (data: unknown, { origin = installation, source = popup as unknown } = {}) => {
		for (const listener of [...listeners]) {
			listener({ data, origin, source } as MessageEvent);
		}
	};

	return { popup, open, post, listeners };
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("the window of an access", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("opens at the click, goes to the provider's login and links the account it gives", async () => {
		const { popup, open, post, listeners } = fakePage();
		const start = vi.fn(async () => login);
		const complete = vi.fn(async () => undefined);
		const linked = createAccessLink({ start, complete, installation })("provider-1");

		// Before anything is awaited, or the browser blocks it
		expect(open).toHaveBeenCalledTimes(1);

		await settle();

		expect(start).toHaveBeenCalledWith("provider-1", page);
		expect(popup.location.href).toBe(login);

		post({ type: IDENTITY_ACCESS_MESSAGE, result: "sealed" });

		await expect(linked).resolves.toBe(true);
		expect(complete).toHaveBeenCalledWith("sealed");
		expect(listeners.size).toBe(0);
	});

	it("takes the result only from its window on the installation, and waits while the window shows an error", async () => {
		vi.useFakeTimers();

		const { popup, post } = fakePage();
		const complete = vi.fn(async () => undefined);
		const linked = createAccessLink({ start: async () => login, complete, installation })(
			"provider-1",
		);

		post(
			{ type: IDENTITY_ACCESS_MESSAGE, result: "forged" },
			{ origin: "https://evil.example" },
		);
		post({ type: IDENTITY_ACCESS_MESSAGE, result: "forged" }, { source: {} });
		post({ type: IDENTITY_ACCESS_MESSAGE, error: "refused" });
		await vi.advanceTimersByTimeAsync(5000);

		expect(complete).not.toHaveBeenCalled();

		// The user closes it: the card's button comes back
		popup.closed = true;
		await vi.advanceTimersByTimeAsync(1500);

		await expect(linked).resolves.toBe(false);
	});

	it("links nothing when the browser blocks the window or the installation refuses it", async () => {
		fakePage({ blocked: true });

		const start = vi.fn(async () => login);

		await expect(
			createAccessLink({ start, complete: async () => undefined, installation })(
				"provider-1",
			),
		).resolves.toBe(false);
		expect(start).not.toHaveBeenCalled();

		vi.unstubAllGlobals();

		const { popup } = fakePage();

		await expect(
			createAccessLink({
				start: async () => {
					throw new Error("site_not_allowed");
				},
				complete: async () => undefined,
				installation,
			})("provider-1"),
		).resolves.toBe(false);
		expect(popup.closed).toBe(true);
	});
});

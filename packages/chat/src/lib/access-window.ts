import { identityAccessMessageSchema } from "../contract/identity-access";

/**
 * Opens the window where the user gives an agent's tool access to a system
 * with their account at the tenant's identity provider: whether the account
 * was linked. The chat calls it at the click on the card.
 */
export type LinkAccess = (providerId: string) => Promise<boolean>;

export interface AccessLinkOptions {
	// The address of the provider's login, from the installation, for the chat's page at `origin`
	start: (providerId: string, origin: string) => Promise<string>;
	// Hands the installation the result the window gave, with the user's session
	complete: (result: string) => Promise<void>;
	// The installation's own origin, where the window ends
	installation: string;
}

// How long a window closed without a message is still awaited: the message may follow it
const CLOSED_GRACE_MS = 1000;

/**
 * The window of the installation where the user signs in at the provider. It
 * opens at once, empty, or the browser would block it, and goes to the
 * provider's login once the installation gives its address. A window that
 * ends in an error shows it; the chat waits until the user closes it.
 */
export function createAccessLink({ start, complete, installation }: AccessLinkOptions): LinkAccess {
	return (providerId) => {
		const popup = window.open("", "gubernet-identity-access", "popup,width=480,height=640");

		if (!popup) {
			return Promise.resolve(false);
		}

		return new Promise<boolean>((resolve) => {
			let closedAt: number | null = null;
			let completing = false;

			const done = (linked: boolean) => {
				window.removeEventListener("message", onMessage);
				clearInterval(timer);
				resolve(linked);
			};

			const onMessage = (event: MessageEvent) => {
				if (event.source !== popup || event.origin !== installation || completing) {
					return;
				}

				const message = identityAccessMessageSchema.safeParse(event.data);

				if (message.success && "result" in message.data) {
					completing = true;
					complete(message.data.result).then(
						() => done(true),
						() => done(false),
					);
				}
			};

			const timer = setInterval(() => {
				if (completing || !popup.closed) {
					return;
				}

				closedAt ??= Date.now();

				if (Date.now() - closedAt > CLOSED_GRACE_MS) {
					done(false);
				}
			}, 250);

			window.addEventListener("message", onMessage);

			start(providerId, window.location.origin).then(
				(address) => {
					if (!popup.closed) {
						popup.location.href = address;
					}
				},
				() => {
					popup.close();
					done(false);
				},
			);
		});
	};
}

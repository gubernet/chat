import { LayeralChat } from "@layeral/chat";
import { useLayoutEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ATTRIBUTES, fromAttribute, isAttributeName } from "./attributes";
import type {
	ChatColor,
	ChatHistoryPlacement,
	ChatTheme,
	ConversationChangeDetail,
	GetToken,
	Notify,
} from "./types";

const TAG = "layeral-chat";

interface ChatOptions {
	url: string;
	agentId: string;
	conversationId: string | null | undefined;
	history: ChatHistoryPlacement | undefined;
	locale: string | undefined;
	theme: ChatTheme | undefined;
	color: ChatColor | undefined;
	hideTitle: boolean;
	hideModel: boolean;
	getToken: GetToken | undefined;
	notify: Notify | undefined;
}

type OptionName = keyof ChatOptions;

const OPTION_NAMES: OptionName[] = [
	"url",
	"agentId",
	"conversationId",
	"history",
	"locale",
	"theme",
	"color",
	"hideTitle",
	"hideModel",
	"getToken",
	"notify",
];

// An element of the element's own that takes no room of its own
function contentsElement() {
	const element = document.createElement("div");

	element.style.display = "contents";

	return element;
}

// What the page puts at the end of the bar, wherever the chat draws the bar
function BarEnd({ container }: { container: HTMLElement }) {
	const ref = useRef<HTMLSpanElement>(null);

	useLayoutEffect(() => {
		ref.current?.append(container);
	}, [container]);

	return <span ref={ref} style={{ display: "contents" }} />;
}

function createElementClass() {
	/**
	 * The chat drawn by React inside the element, in the page's own DOM, so it
	 * takes the page's font and the stylesheet the page loads.
	 */
	return class extends HTMLElement {
		static observedAttributes = Object.keys(ATTRIBUTES);

		readonly barEndContainer = contentsElement();

		#options: ChatOptions = {
			url: "",
			agentId: "",
			conversationId: undefined,
			history: undefined,
			locale: undefined,
			theme: undefined,
			color: undefined,
			hideTitle: false,
			hideModel: false,
			getToken: undefined,
			notify: undefined,
		};
		#root: Root | null = null;
		#mount: HTMLElement | null = null;
		#renderQueued = false;
		#barEndShown = false;
		// The children with slot="bar-end" the page adds later
		#children = new MutationObserver(() => this.#adoptBarEnd());

		constructor() {
			super();

			// The bar has an end only with something in it
			new MutationObserver(() => {
				if (this.barEndContainer.hasChildNodes() !== this.#barEndShown) {
					this.#queueRender();
				}
			}).observe(this.barEndContainer, { childList: true });
		}

		get url() {
			return this.#options.url;
		}

		set url(value: string) {
			this.#set("url", value ?? "");
		}

		get agentId() {
			return this.#options.agentId;
		}

		set agentId(value: string) {
			this.#set("agentId", value ?? "");
		}

		get conversationId() {
			return this.#options.conversationId;
		}

		set conversationId(value: string | null | undefined) {
			this.#set("conversationId", value);
		}

		get history() {
			return this.#options.history;
		}

		set history(value: ChatHistoryPlacement | undefined) {
			this.#set("history", fromAttribute("history", value ?? null));
		}

		get locale() {
			return this.#options.locale;
		}

		set locale(value: string | undefined) {
			this.#set("locale", value || undefined);
		}

		get theme() {
			return this.#options.theme;
		}

		set theme(value: ChatTheme | undefined) {
			this.#set("theme", fromAttribute("theme", value ?? null));
		}

		get color() {
			return this.#options.color;
		}

		set color(value: ChatColor | undefined) {
			this.#set("color", fromAttribute("color", value ?? null));
		}

		get hideTitle() {
			return this.#options.hideTitle;
		}

		set hideTitle(value: boolean) {
			this.#set("hideTitle", Boolean(value));
		}

		get hideModel() {
			return this.#options.hideModel;
		}

		set hideModel(value: boolean) {
			this.#set("hideModel", Boolean(value));
		}

		get getToken() {
			return this.#options.getToken;
		}

		set getToken(value: GetToken | undefined) {
			this.#set("getToken", typeof value === "function" ? value : undefined);
		}

		get notify() {
			return this.#options.notify;
		}

		set notify(value: Notify | undefined) {
			this.#set("notify", typeof value === "function" ? value : undefined);
		}

		connectedCallback() {
			this.#takeEarlyProperties();

			// Moved within the page: the chat goes on as it was
			if (this.#root) {
				return;
			}

			this.#adoptBarEnd();
			this.#children.observe(this, { childList: true });
			this.#mount = contentsElement();
			this.append(this.#mount);
			this.#root = createRoot(this.#mount);
			this.#render();
		}

		disconnectedCallback() {
			// An element moved within the page is back before this runs
			queueMicrotask(() => {
				if (this.isConnected || !this.#root) {
					return;
				}

				this.#children.disconnect();
				this.#root.unmount();
				this.#root = null;
				this.#mount?.remove();
				this.#mount = null;
			});
		}

		attributeChangedCallback(name: string, _previous: string | null, value: string | null) {
			if (isAttributeName(name)) {
				this.#set(ATTRIBUTES[name], fromAttribute(name, value));
			}
		}

		// Set on the element before the package defined it: through the properties now
		#takeEarlyProperties() {
			const element = this as unknown as Record<string, unknown>;

			for (const name of OPTION_NAMES) {
				if (Object.hasOwn(element, name)) {
					const value = element[name];

					delete element[name];
					element[name] = value;
				}
			}
		}

		#adoptBarEnd() {
			for (const child of Array.from(this.children)) {
				if (child.getAttribute("slot") === "bar-end") {
					this.barEndContainer.append(child);
				}
			}
		}

		#set(name: OptionName, value: unknown) {
			if (Object.is(this.#options[name], value)) {
				return;
			}

			this.#options = { ...this.#options, [name]: value };
			this.#queueRender();
		}

		// Several values set at once draw the chat once
		#queueRender() {
			if (!this.#root || this.#renderQueued) {
				return;
			}

			this.#renderQueued = true;
			queueMicrotask(() => this.#render());
		}

		// The chat is on another conversation: the element keeps it, the page hears it
		#conversationChanged = (conversationId: string | null) => {
			this.#options = { ...this.#options, conversationId };
			this.dispatchEvent(
				new CustomEvent<ConversationChangeDetail>("conversation-change", {
					detail: { conversationId },
					bubbles: true,
				}),
			);
		};

		#render() {
			this.#renderQueued = false;

			if (!this.#root) {
				return;
			}

			const { url, agentId, ...options } = this.#options;

			this.#barEndShown = this.barEndContainer.hasChildNodes();
			// Without the installation or the agent there is no chat yet
			this.#root.render(
				url && agentId ? (
					<LayeralChat
						{...options}
						url={url}
						agentId={agentId}
						onConversationChange={this.#conversationChanged}
						barEnd={
							this.#barEndShown ? (
								<BarEnd container={this.barEndContainer} />
							) : undefined
						}
					/>
				) : null,
			);
		}
	};
}

// Once in the browser, never on a server: the page's own definition wins
export function defineLayeralChat() {
	if (typeof customElements === "undefined" || customElements.get(TAG)) {
		return;
	}

	customElements.define(TAG, createElementClass());
}

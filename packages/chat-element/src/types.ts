/**
 * The element's types, the same as the chat's (the tests check it), written
 * here so that its declarations need no React.
 */

// The colours a chat can take without writing any
export const CHAT_COLORS = [
	"blue",
	"indigo",
	"violet",
	"pink",
	"red",
	"orange",
	"green",
	"teal",
] as const;

export type ChatColor = (typeof CHAT_COLORS)[number];

export const CHAT_THEMES = ["auto", "light", "dark"] as const;

// "auto" follows the page: dark when its <html> has the class "dark" or data-theme="dark"
export type ChatTheme = (typeof CHAT_THEMES)[number];

export const CHAT_HISTORY_PLACEMENTS = ["menu", "panel", "hidden"] as const;

// Where the user's conversations with the agent are: a menu in the bar, a panel beside the chat, or nowhere
export type ChatHistoryPlacement = (typeof CHAT_HISTORY_PLACEMENTS)[number];

export type ChatNotification = { title: string; type: "error" | "info" };

export type Notify = (notification: ChatNotification) => void;

// The user's token in the page's app, asked for again before each message
export type GetToken = () => Promise<string | null | undefined>;

export interface ConversationChangeDetail {
	// The conversation the chat is on now, null for a new chat
	conversationId: string | null;
}

export type ConversationChangeEvent = CustomEvent<ConversationChangeDetail>;

/**
 * `<layeral-chat>`: the whole chat of an agent of a Layeral installation.
 * The attributes set the values that are text; the functions are properties.
 */
export interface LayeralChatElement extends HTMLElement {
	// The address of the Layeral installation (attribute `url`)
	url: string;
	// The agent to chat with (attribute `agent-id`)
	agentId: string;
	// The conversation to open, null for a new chat (attribute `conversation-id`)
	conversationId: string | null | undefined;
	history: ChatHistoryPlacement | undefined;
	// A language tag, as "it" or "it-IT"; without it, the browser's language
	locale: string | undefined;
	theme: ChatTheme | undefined;
	color: ChatColor | undefined;
	// Without the agent's name in the bar (attribute `hide-title`)
	hideTitle: boolean;
	// Without the choice of the model (attribute `hide-model`)
	hideModel: boolean;
	// Without the choice of the reasoning level (attribute `hide-effort`)
	hideEffort: boolean;
	// On a site other than the installation's: the user's token in the page's app
	getToken: GetToken | undefined;
	// Shows the chat's notices with the page's own toasts, in place of the chat's
	notify: Notify | undefined;
	// Where what goes at the end of the bar is: the children with slot="bar-end" end up here
	readonly barEndContainer: HTMLElement;
	addEventListener<K extends keyof LayeralChatElementEventMap>(
		type: K,
		listener: (this: LayeralChatElement, event: LayeralChatElementEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void;
	removeEventListener<K extends keyof LayeralChatElementEventMap>(
		type: K,
		listener: (this: LayeralChatElement, event: LayeralChatElementEventMap[K]) => void,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void;
}

export interface LayeralChatElementEventMap extends HTMLElementEventMap {
	"conversation-change": ConversationChangeEvent;
}

declare global {
	interface HTMLElementTagNameMap {
		"layeral-chat": LayeralChatElement;
	}
}

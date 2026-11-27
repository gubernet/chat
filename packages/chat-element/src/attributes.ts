import {
	CHAT_COLORS,
	CHAT_HISTORY_PLACEMENTS,
	CHAT_THEMES,
	type LayeralChatElement,
} from "./types";

// The element's attributes and the properties they set
export const ATTRIBUTES = {
	url: "url",
	"agent-id": "agentId",
	"conversation-id": "conversationId",
	history: "history",
	locale: "locale",
	theme: "theme",
	color: "color",
	"hide-title": "hideTitle",
	"hide-model": "hideModel",
} as const satisfies Record<string, keyof LayeralChatElement>;

export type AttributeName = keyof typeof ATTRIBUTES;

export const isAttributeName = (name: string): name is AttributeName => name in ATTRIBUTES;

const oneOf = <T extends string>(values: readonly T[], value: string | null) =>
	values.find((known) => known === value);

/**
 * An attribute's value as its property takes it; null when the attribute is
 * gone. A value the chat does not know is left out, as if not set.
 */
export function fromAttribute(name: AttributeName, value: string | null) {
	switch (name) {
		case "hide-title":
		case "hide-model":
			return value !== null && value !== "false";
		// Without it, a new chat
		case "conversation-id":
			return value;
		case "history":
			return oneOf(CHAT_HISTORY_PLACEMENTS, value);
		case "theme":
			return oneOf(CHAT_THEMES, value);
		case "color":
			return oneOf(CHAT_COLORS, value);
		case "url":
		case "agent-id":
			return value ?? "";
		case "locale":
			return value ?? undefined;
	}
}

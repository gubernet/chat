import type * as Chat from "@gubernet/chat";
import { describe, expect, expectTypeOf, it } from "vitest";

import { fromAttribute } from "./attributes";
import type * as Element from "./types";

describe("attributes", () => {
	it("reads the switches as on unless removed or false", () => {
		expect(fromAttribute("hide-title", "")).toBe(true);
		expect(fromAttribute("hide-model", "true")).toBe(true);
		expect(fromAttribute("hide-title", "false")).toBe(false);
		expect(fromAttribute("hide-model", null)).toBe(false);
	});

	it("opens a new chat when the conversation is removed", () => {
		expect(fromAttribute("conversation-id", "c-1")).toBe("c-1");
		expect(fromAttribute("conversation-id", null)).toBeNull();
	});

	it("leaves out a value the chat does not know", () => {
		expect(fromAttribute("history", "panel")).toBe("panel");
		expect(fromAttribute("history", "sidebar")).toBeUndefined();
		expect(fromAttribute("theme", "dark")).toBe("dark");
		expect(fromAttribute("theme", "blue")).toBeUndefined();
		expect(fromAttribute("color", "teal")).toBe("teal");
		expect(fromAttribute("color", "#ff0000")).toBeUndefined();
	});

	it("keeps the installation, the agent and the language as written", () => {
		expect(fromAttribute("url", "https://app.example.com")).toBe("https://app.example.com");
		expect(fromAttribute("agent-id", null)).toBe("");
		expect(fromAttribute("locale", "it-IT")).toBe("it-IT");
		expect(fromAttribute("locale", null)).toBeUndefined();
	});
});

describe("types", () => {
	it("are the chat's own", () => {
		expectTypeOf<Element.ChatColor>().toEqualTypeOf<Chat.ChatColor>();
		expectTypeOf<Element.ChatTheme>().toEqualTypeOf<Chat.ChatTheme>();
		expectTypeOf<Element.ChatHistoryPlacement>().toEqualTypeOf<Chat.ChatHistoryPlacement>();
		expectTypeOf<Element.ChatNotification>().toEqualTypeOf<Chat.ChatNotification>();
		expectTypeOf<Element.Notify>().toEqualTypeOf<Chat.Notify>();
		expectTypeOf<Element.GetToken>().toEqualTypeOf<
			NonNullable<Chat.GubernetChatProps["getToken"]>
		>();
	});
});

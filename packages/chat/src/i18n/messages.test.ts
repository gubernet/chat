import { describe, expect, it } from "vitest";

import { CHAT_LOCALES, messagesFor, resolveChatLocale } from "./index";

// Every key of the messages, as chat.form.send
const keysOf = (value: unknown, prefix = ""): string[] =>
	typeof value === "object" && value !== null
		? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
		: [prefix.slice(0, -1)];

describe("the chat's languages", () => {
	it("have the same messages as English", () => {
		const english = keysOf(messagesFor("en")).sort();

		for (const locale of CHAT_LOCALES) {
			expect(keysOf(messagesFor(locale)).sort(), locale).toEqual(english);
		}
	});

	it("resolve a language tag to a language of the chat, or English", () => {
		expect(resolveChatLocale("it-IT")).toBe("it");
		expect(resolveChatLocale("de")).toBe("de");
		expect(resolveChatLocale("pt-BR")).toBe("en");
		expect(resolveChatLocale(null)).toBe("en");
	});
});

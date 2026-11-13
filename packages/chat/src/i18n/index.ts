import type { AbstractIntlMessages } from "use-intl/core";

import de from "./messages/de.json";
import en from "./messages/en.json";
import es from "./messages/es.json";
import fr from "./messages/fr.json";
import it from "./messages/it.json";

export const CHAT_LOCALES = ["en", "de", "es", "fr", "it"] as const;

export type ChatLocale = (typeof CHAT_LOCALES)[number];

export const DEFAULT_CHAT_LOCALE: ChatLocale = "en";

// Every language has the keys of the English one: messages.test.ts checks it
const MESSAGES: Record<ChatLocale, AbstractIntlMessages> = { en, de, es, fr, it };

// The chat's language for a language tag, as it-IT: its own, or English
export function resolveChatLocale(tag: string | null | undefined): ChatLocale {
	const language = tag?.toLowerCase().split(/[-_]/)[0];

	return CHAT_LOCALES.find((locale) => locale === language) ?? DEFAULT_CHAT_LOCALE;
}

export const messagesFor = (locale: ChatLocale) => MESSAGES[locale];

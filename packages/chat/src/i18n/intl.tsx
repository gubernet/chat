"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type AbstractIntlMessages, createFormatter, createTranslator } from "use-intl/core";

/**
 * The chat's own texts and formats, apart from the page's: an application
 * that keeps its translations the same way goes on reading them, also in what
 * it draws inside the chat.
 */
interface ChatIntl {
	locale: string;
	messages: AbstractIntlMessages;
	timeZone: string;
}

const ChatIntlContext = createContext<ChatIntl | null>(null);

export function ChatIntlProvider({
	locale,
	messages,
	timeZone,
	children,
}: ChatIntl & { children: ReactNode }) {
	const value = useMemo(() => ({ locale, messages, timeZone }), [locale, messages, timeZone]);

	return <ChatIntlContext.Provider value={value}>{children}</ChatIntlContext.Provider>;
}

function useChatIntl() {
	const intl = useContext(ChatIntlContext);

	if (!intl) {
		throw new Error("The chat needs ChatProvider around it");
	}

	return intl;
}

export type ChatTranslator = (
	key: string,
	values?: Record<string, string | number | Date>,
) => string;

// The texts of a part of the chat, as "chat.form"
export function useTranslations(namespace: string): ChatTranslator {
	const intl = useChatIntl();

	return useMemo(() => {
		const translate = createTranslator({ ...intl, namespace } as Parameters<
			typeof createTranslator
		>[0]);

		return (key, values) => translate(key as never, values as never);
	}, [intl, namespace]);
}

// Numbers and dates in the chat's language
export function useFormatter() {
	const { locale, timeZone } = useChatIntl();

	return useMemo(() => createFormatter({ locale, timeZone }), [locale, timeZone]);
}

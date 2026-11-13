"use client";

import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { IntlProvider } from "use-intl";

import { messagesFor, resolveChatLocale } from "../i18n";
import { defaultNotify, type Notify, NotifyContext } from "../lib/notify";
import { PortalContext } from "../lib/portal";
import { Toaster } from "../ui/toast";

export type ChatTheme = "auto" | "light" | "dark";

// The class the chat's stylesheet is written under
const ROOT_CLASS = "gubernet-chat";

const pageIsDark = () => {
	const page = document.documentElement;

	return page.classList.contains("dark") || page.dataset.theme === "dark";
};

function watchPageTheme(onChange: () => void) {
	const observer = new MutationObserver(onChange);

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "data-theme"],
	});

	return () => observer.disconnect();
}

// The browser's language does not change while the page is open
const watchNothing = () => () => undefined;

/**
 * Around every chat and every use of `useChatRuntime`: the chat's language,
 * its theme, its notices, and the element its menus and toasts are drawn in.
 */
export function ChatProvider({
	locale,
	theme = "auto",
	notify,
	children,
}: {
	// A language tag, as "it" or "it-IT"; without it, the browser's language
	locale?: string;
	// "auto" follows the page: dark when its <html> has the class "dark" or data-theme="dark"
	theme?: ChatTheme;
	// Shows the chat's notices with the app's own toasts, in place of the chat's
	notify?: Notify;
	children: ReactNode;
}) {
	// On the server, and in the first draw in the browser: a light page, in English
	const pageDark = useSyncExternalStore(watchPageTheme, pageIsDark, () => false);
	const browserLocale = useSyncExternalStore(
		watchNothing,
		() => navigator.language,
		() => null,
	);
	const [container, setContainer] = useState<HTMLElement>();
	const resolvedTheme = theme === "auto" ? (pageDark ? "dark" : "light") : theme;
	const chatLocale = resolveChatLocale(locale ?? browserLocale);

	useEffect(() => {
		const element = document.createElement("div");

		element.className = ROOT_CLASS;
		document.body.append(element);
		// The element exists only in the page: the menus are drawn once it is there
		// oxlint-disable-next-line react/set-state-in-effect
		setContainer(element);

		return () => element.remove();
	}, []);

	useEffect(() => {
		container?.setAttribute("data-theme", resolvedTheme);
	}, [container, resolvedTheme]);

	const content = (
		<div className={ROOT_CLASS} data-theme={resolvedTheme} style={{ display: "contents" }}>
			{children}
		</div>
	);

	return (
		<IntlProvider
			locale={locale ?? browserLocale ?? chatLocale}
			messages={messagesFor(chatLocale)}
			timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
		>
			<PortalContext.Provider value={container}>
				<NotifyContext.Provider value={notify ?? defaultNotify}>
					{notify ? content : <Toaster>{content}</Toaster>}
				</NotifyContext.Provider>
			</PortalContext.Provider>
		</IntlProvider>
	);
}

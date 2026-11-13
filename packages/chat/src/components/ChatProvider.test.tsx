import { renderToString } from "react-dom/server";
import { IntlProvider, useTranslations as usePageTranslations } from "use-intl";
import { describe, expect, it } from "vitest";

import { useTranslations } from "../i18n/intl";
import { ChatProvider } from "./ChatProvider";

// A text of the page around the chat, read the way an application reads its own
function PageText() {
	return <p>{usePageTranslations("page")("title")}</p>;
}

// A text of the chat itself
function ChatText() {
	return <p>{useTranslations("chat.composer")("send")}</p>;
}

describe("ChatProvider", () => {
	it("leaves the page's own translations to what the page draws inside the chat", () => {
		const html = renderToString(
			<IntlProvider locale="en" messages={{ page: { title: "My application" } }}>
				<ChatProvider locale="it">
					<PageText />
					<ChatText />
				</ChatProvider>
			</IntlProvider>,
		);

		expect(html).toContain("My application");
		// The chat speaks its own language, whatever the page's
		expect(html).toContain("Invia");
	});

	it("gives the chat its texts without any translations around it", () => {
		const html = renderToString(
			<ChatProvider locale="de">
				<ChatText />
			</ChatProvider>,
		);

		expect(html).toContain("Senden");
	});
});

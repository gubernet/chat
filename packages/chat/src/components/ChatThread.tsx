"use client";

import { AuiIf, SuggestionPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { ChatComposer } from "./ChatComposer";
import { type ChatFormDefinition, ChatOptionsContext, ChatStartForm } from "./ChatFormMessages";
import { ChatMessage } from "./ChatMessages";
import { ChatPreviewLayout } from "./ChatPreview";

// Lines stay readable however wide the chat is
const column = "mx-auto w-full max-w-3xl px-4";

/**
 * The conversation with the composer below it. Before the first message it
 * shows the welcome and the suggestions to start: at the bottom, or with the
 * composer in the middle of the page, as Claude opens a new chat.
 */
export function ChatThread({
	welcome,
	centeredStart = false,
	preview = true,
	form,
}: {
	welcome?: ReactNode;
	centeredStart?: boolean;
	// The delivered files open beside the chat; without it they download
	preview?: boolean;
	// An agent's form, in place of the composer before the first message; with
	// only files as its result, no composer and no text of the answers
	form?: ChatFormDefinition | null;
}) {
	const t = useTranslations("chat");
	const filesOnly = form?.result === "files";

	return (
		<ChatOptionsContext.Provider value={{ filesOnly }}>
			<ChatPreviewLayout enabled={preview}>
				<ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
					<ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto pt-6">
						<AuiIf condition={(s) => s.thread.messages.length === 0}>
							<div
								className={cn(
									column,
									"flex flex-1 flex-col gap-6 pb-6",
									centeredStart ? "justify-center" : "justify-end",
								)}
							>
								{welcome}
								{form ? (
									<ChatStartForm form={form} />
								) : (
									<ChatStart centeredStart={centeredStart} />
								)}
							</div>
						</AuiIf>

						<div className={cn(column, "flex flex-col gap-6 pb-6 empty:hidden")}>
							<ThreadPrimitive.Messages>
								{() => <ChatMessage />}
							</ThreadPrimitive.Messages>
						</div>

						{/* With the composer in the middle, or a form, the bottom one appears with the first message */}
						<AuiIf
							condition={(s) =>
								!filesOnly &&
								((!centeredStart && !form) || s.thread.messages.length > 0)
							}
						>
							<ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background pb-4">
								<div className={cn(column, "relative")}>
									{/* While the answer streams past the screen, back to its end */}
									<ThreadPrimitive.ScrollToBottom
										render={
											<Button
												variant="outline"
												size="icon"
												className="absolute start-1/2 -top-12 size-9 -translate-x-1/2 rounded-full shadow-sm disabled:invisible"
												aria-label={t("scrollToBottom")}
												title={t("scrollToBottom")}
											/>
										}
									>
										<ArrowDownIcon className="size-4" />
									</ThreadPrimitive.ScrollToBottom>
									<ChatComposer />
								</div>
							</ThreadPrimitive.ViewportFooter>
						</AuiIf>
					</ThreadPrimitive.Viewport>
				</ThreadPrimitive.Root>
			</ChatPreviewLayout>
		</ChatOptionsContext.Provider>
	);
}

// Before the first message: the composer in the middle, if there, and the suggestions to start
function ChatStart({ centeredStart }: { centeredStart: boolean }) {
	return (
		<>
			{centeredStart && <ChatComposer />}
			<div
				className={cn(
					"flex gap-2 empty:hidden",
					centeredStart ? "flex-wrap justify-center" : "flex-col",
				)}
			>
				<ThreadPrimitive.Suggestions>
					{() => (
						<SuggestionPrimitive.Trigger
							send
							className={cn(
								"border px-3 py-2 text-start text-sm hover:bg-muted",
								centeredStart ? "rounded-full" : "rounded-lg",
							)}
						>
							<SuggestionPrimitive.Title />
						</SuggestionPrimitive.Trigger>
					)}
				</ThreadPrimitive.Suggestions>
			</div>
		</>
	);
}

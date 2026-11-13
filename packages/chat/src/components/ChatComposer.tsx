"use client";

import { AuiIf, ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import {
	ArrowUpIcon,
	Loader2Icon,
	MicIcon,
	PaperclipIcon,
	QuoteIcon,
	SquareIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useFormatter, useTranslations } from "../i18n/intl";
import { Button } from "../ui/button";
import { ChatAttachment } from "./ChatAttachment";

// How long the user has been dictating, mounted with the recording
function DictationTimer() {
	const format = useFormatter();
	const [startedAt] = useState(() => Date.now());
	const [now, setNow] = useState(startedAt);

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);

		return () => clearInterval(timer);
	}, []);

	const seconds = Math.floor((now - startedAt) / 1000);

	return (
		<span className="flex items-center gap-1.5 text-xs text-destructive tabular-nums">
			<span className="size-2 animate-pulse rounded-full bg-destructive" />
			{Math.floor(seconds / 60)}:{format.number(seconds % 60, { minimumIntegerDigits: 2 })}
		</span>
	);
}

/**
 * The microphone, where the organization has dictation on: off with the
 * sending. While recording it stops the dictation; then the audio is
 * transcribed and its text joins what the composer holds.
 */
function ChatDictation() {
	const t = useTranslations("chat.composer");
	const dictation = useAuiState((s) => s.composer.dictation);

	if (!dictation) {
		return (
			<ComposerPrimitive.Dictate
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={t("dictate")}
						title={t("dictate")}
					/>
				}
			>
				<MicIcon className="size-4" />
			</ComposerPrimitive.Dictate>
		);
	}

	// The text is on its way: the composer shows a mark where it will go
	if (dictation.transcript !== undefined) {
		return (
			<span className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
				<Loader2Icon className="size-3.5 animate-spin" />
				{t("transcribing")}
			</span>
		);
	}

	return (
		<span className="flex items-center gap-2">
			{dictation.status.type === "running" && <DictationTimer />}
			<ComposerPrimitive.StopDictation
				render={
					<Button
						variant="outline"
						size="icon"
						aria-label={t("stopDictation")}
						title={t("stopDictation")}
					/>
				}
			>
				<SquareIcon className="size-3.5 fill-current" />
			</ComposerPrimitive.StopDictation>
		</span>
	);
}

// Where the user writes: menus and windows around the chat give the focus back to it
export function chatComposerInput() {
	return document.querySelector<HTMLElement>("[data-chat-composer-input]");
}

// The part of a file the message will be about, until it is sent or taken away
export function ChatComposerQuote() {
	const t = useTranslations("chat.composer");

	return (
		<ComposerPrimitive.Quote className="flex items-start gap-2 rounded-lg border bg-muted/50 px-2 py-1.5 text-xs">
			<QuoteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
			<ComposerPrimitive.QuoteText className="line-clamp-3 min-w-0 flex-1 break-words whitespace-pre-wrap" />
			<ComposerPrimitive.QuoteDismiss
				render={
					<button
						type="button"
						className="rounded-full text-muted-foreground hover:text-foreground"
						aria-label={t("removeQuote")}
						title={t("removeQuote")}
					/>
				}
			>
				<XIcon className="size-3.5" />
			</ComposerPrimitive.QuoteDismiss>
		</ComposerPrimitive.Quote>
	);
}

export function ChatComposer() {
	const t = useTranslations("chat.composer");

	return (
		<ComposerPrimitive.Root className="w-full">
			<ComposerPrimitive.AttachmentDropzone className="flex flex-col gap-2 rounded-2xl border bg-card p-2 transition-colors focus-within:border-foreground/25 data-[dragging=true]:border-dashed data-[dragging=true]:border-primary">
				<ChatComposerQuote />
				<div className="flex flex-wrap gap-2 empty:hidden">
					<ComposerPrimitive.Attachments>
						{() => <ChatAttachment removable />}
					</ComposerPrimitive.Attachments>
				</div>
				<ComposerPrimitive.Input
					placeholder={t("placeholder")}
					rows={1}
					// The chat opens to write in it
					autoFocus // oxlint-disable-line jsx-a11y/no-autofocus
					className="max-h-40 min-h-10 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground"
					aria-label={t("placeholder")}
					data-chat-composer-input
				/>
				<div className="flex items-center justify-between">
					<ComposerPrimitive.AddAttachment
						render={<Button variant="ghost" size="icon" aria-label={t("attach")} />}
					>
						<PaperclipIcon className="size-4" />
					</ComposerPrimitive.AddAttachment>
					<div className="flex items-center gap-1">
						<AuiIf condition={(s) => s.thread.capabilities.dictation}>
							<ChatDictation />
						</AuiIf>
						<AuiIf condition={(s) => !s.thread.isRunning}>
							<ComposerPrimitive.Send
								render={
									<Button variant="primary" size="icon" aria-label={t("send")} />
								}
							>
								<ArrowUpIcon className="size-4" />
							</ComposerPrimitive.Send>
						</AuiIf>
						<AuiIf condition={(s) => s.thread.isRunning}>
							<ComposerPrimitive.Cancel
								render={
									<Button variant="primary" size="icon" aria-label={t("stop")} />
								}
							>
								<SquareIcon className="size-3.5 fill-current" />
							</ComposerPrimitive.Cancel>
						</AuiIf>
					</div>
				</div>
			</ComposerPrimitive.AttachmentDropzone>
		</ComposerPrimitive.Root>
	);
}

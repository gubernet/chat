"use client";

import { ActionBarPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ChevronDownIcon, ClipboardListIcon, PencilIcon } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";

import type { FormElement, FormPart, FormResult } from "../contract/form";
import { useTranslations } from "../i18n/intl";
import type { ChatFormMessage } from "../lib/use-chat-runtime";
import { Button } from "../ui/button";
import { ChatForm, type ChatFormSubmission } from "./ChatForm";

// An agent's form as the chat starts from it, and what it gives: a chat or only files
export interface ChatFormDefinition {
	elements: FormElement[];
	result: FormResult;
}

// What the chat is around its messages: with only files as the result, the answers' text stays hidden
export const ChatOptionsContext = createContext<{ filesOnly: boolean }>({ filesOnly: false });

export const useChatOptions = () => useContext(ChatOptionsContext);

/**
 * Sends a form as a message: the first one, or again in place of one sent
 * before, keeping the files it had that the user did not remove.
 */
export function useSendForm() {
	const aui = useAui();

	return ({
		form,
		submission,
		parentId,
		from,
	}: {
		form: ChatFormDefinition;
		submission: ChatFormSubmission;
		parentId: string | null;
		// The message sent before, whose files are kept
		from?: { id: string; attachments: ReadonlyArray<{ name: string; contentType?: string }> };
	}) => {
		const message: ChatFormMessage = {
			part: {
				type: "form",
				result: form.result,
				elements: form.elements,
				values: submission.values,
			},
			files: submission.files,
			kept: submission.kept.map((name) => ({
				name,
				mimeType:
					from?.attachments.find((attachment) => attachment.name === name)?.contentType ||
					"application/octet-stream",
				// The server takes the kept file as it was saved
				size: 0,
			})),
			...(from && { keepFrom: from.id }),
		};

		aui.thread().append({
			role: "user",
			parentId,
			content: [],
			metadata: { custom: { form: message } },
		});
	};
}

// Before the first message: the agent's form in place of the composer
export function ChatStartForm({ form }: { form: ChatFormDefinition }) {
	const t = useTranslations("chat.form");
	const sendForm = useSendForm();
	const isDisabled = useAuiState((s) => s.thread.isDisabled);

	return (
		<div className="rounded-2xl border bg-card p-4 sm:p-6">
			<ChatForm
				elements={form.elements}
				disabled={isDisabled}
				submitLabel={form.result === "files" ? t("generate") : t("send")}
				onSubmit={(submission) => sendForm({ form, submission, parentId: null })}
			/>
		</div>
	);
}

/**
 * A user's message that is a form: only "Form compilato", which opens on the
 * same form, read-only; the pencil opens it to change and send again.
 */
export function FormMessage({ part, versions }: { part: FormPart; versions: ReactNode }) {
	const t = useTranslations("chat.form");
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const sendForm = useSendForm();
	const messageId = useAuiState((s) => s.message.id);
	const parentId = useAuiState((s) => s.message.parentId);
	const attachments = useAuiState((s) => s.message.attachments);
	const canEdit = useAuiState((s) => s.thread.capabilities.edit);

	if (editing) {
		return (
			<div className="w-full rounded-2xl border bg-card p-4 sm:p-6">
				<ChatForm
					elements={part.elements}
					values={part.values}
					submitLabel={part.result === "files" ? t("generate") : t("send")}
					onCancel={() => setEditing(false)}
					onSubmit={(submission) => {
						setEditing(false);
						sendForm({
							form: part,
							submission,
							parentId,
							from: { id: messageId, attachments: attachments ?? [] },
						});
					}}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="w-full max-w-[85%] rounded-2xl bg-muted sm:w-auto sm:min-w-80">
				<button
					type="button"
					className="flex w-full items-center gap-2 rounded-2xl px-4 py-2 text-start text-base"
					aria-expanded={open}
					onClick={() => setOpen((current) => !current)}
				>
					<ClipboardListIcon className="size-4 shrink-0 text-muted-foreground" />
					<span className="flex-1">{t("filled")}</span>
					<ChevronDownIcon
						className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</button>
				{open && (
					<div className="px-4 pb-4">
						<ChatForm elements={part.elements} values={part.values} readOnly />
					</div>
				)}
			</div>
			{/* Its height is kept, so the pencil shown on hover moves nothing */}
			<div className="-me-2 flex min-h-8 items-center gap-1">
				{canEdit && (
					<ActionBarPrimitive.Root hideWhenRunning autohide="always" className="flex">
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground"
							aria-label={t("edit")}
							title={t("edit")}
							onClick={() => setEditing(true)}
						>
							<PencilIcon className="size-4" />
						</Button>
					</ActionBarPrimitive.Root>
				)}
				{versions}
			</div>
		</>
	);
}

"use client";

import { MessageByIndexProvider, MessagePrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { SquareIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { FormPart } from "../contract/form";
import { useTranslations } from "../i18n/intl";
import type { ChatFile, ChatPlan, ChatStepView } from "../lib/messages";
import { Button } from "../ui/button";
import { ChatForm } from "./ChatForm";
import { type ChatFormDefinition, useSendForm } from "./ChatFormMessages";
import { groupBy, MessageOutcome, Sparkles, Versions } from "./ChatMessages";
import { ChatPlanList } from "./ChatPlan";
import { ChatFilePreview } from "./ChatPreview";
import { ChatStepRow, ChatSteps } from "./ChatSteps";

/**
 * An agent whose form gives only files: the form on the left, with
 * "Genera", and on the right the agent's steps while it works, then the files
 * it produced, as the chat would deliver them, without its message. Each
 * "Genera" makes a new version, the earlier ones kept.
 */
export function ChatElaborato({
	form,
	welcome,
}: {
	form: ChatFormDefinition;
	welcome?: ReactNode;
}) {
	const t = useTranslations("chat.form");
	const count = useAuiState((s) => s.thread.messages.length);
	const sendForm = useSendForm();
	const isDisabled = useAuiState((s) => s.thread.isDisabled);

	return (
		<div className="flex h-full min-h-0 bg-background text-foreground max-md:flex-col max-md:overflow-y-auto">
			<section className="flex flex-col gap-6 p-4 md:w-[min(42%,32rem)] md:shrink-0 md:overflow-y-auto md:border-e md:p-6">
				{welcome}
				{count === 0 ? (
					<ChatForm
						elements={form.elements}
						disabled={isDisabled}
						submitLabel={t("generate")}
						onSubmit={(submission) => sendForm({ form, submission, parentId: null })}
					/>
				) : (
					<MessageByIndexProvider index={0}>
						<SentForm form={form} />
					</MessageByIndexProvider>
				)}
			</section>
			<section className="flex min-w-0 flex-1 flex-col max-md:min-h-[70vh] max-md:border-t md:min-h-0">
				{count < 2 ? (
					<Placeholder>{t("resultHint")}</Placeholder>
				) : (
					<>
						<MessageByIndexProvider index={0}>
							<VersionsBar />
						</MessageByIndexProvider>
						<MessageByIndexProvider index={1}>
							<Result />
						</MessageByIndexProvider>
					</>
				)}
			</section>
		</div>
	);
}

// The form of the version shown: changed and generated again, it makes a new version
function SentForm({ form }: { form: ChatFormDefinition }) {
	const t = useTranslations("chat.form");
	const sendForm = useSendForm();
	const messageId = useAuiState((s) => s.message.id);
	const attachments = useAuiState((s) => s.message.attachments);
	const part = useAuiState(
		(s) => (s.message.metadata.custom.form as FormPart | undefined) ?? null,
	);
	const isRunning = useAuiState((s) => s.thread.isRunning);
	const isDisabled = useAuiState((s) => s.thread.isDisabled);

	return (
		<ChatForm
			// Another version shows its own values
			key={messageId}
			elements={form.elements}
			values={part?.values}
			disabled={isRunning || isDisabled}
			submitLabel={t("generate")}
			onSubmit={(submission) =>
				sendForm({
					form,
					submission,
					parentId: null,
					from: { id: messageId, attachments: attachments ?? [] },
				})
			}
		/>
	);
}

// Above the result: ‹ 1/2 › between the versions, and the stop while the agent works
function VersionsBar() {
	const t = useTranslations("chat.form");
	const aui = useAui();
	const isRunning = useAuiState((s) => s.thread.isRunning);

	return (
		<div className="flex min-h-12 items-center justify-between gap-2 border-b px-4 py-2 empty:hidden">
			<Versions />
			{isRunning && (
				<Button
					variant="outline"
					size="sm"
					className="ms-auto"
					onClick={() => aui.thread().cancelRun()}
				>
					<SquareIcon className="size-3.5 fill-current" />
					{t("stop")}
				</Button>
			)}
		</div>
	);
}

// While the agent works, its steps; then its files, or why there are none
function Result() {
	const status = useAuiState((s) => s.message.status?.type);
	const working = status === "running" || status === "requires-action";

	return (
		<MessagePrimitive.Root className="flex min-h-0 flex-1 flex-col">
			{working ? (
				<div className="overflow-y-auto p-4 text-base md:p-6">
					<MessagePrimitive.GroupedParts groupBy={groupBy}>
						{({ part, children }) => {
							switch (part.type) {
								case "group-steps":
									return <ChatSteps group={part}>{children}</ChatSteps>;
								case "tool-call":
									return (
										<ChatStepRow
											step={part.artifact as ChatStepView}
											respondToApproval={part.respondToApproval}
										/>
									);
								case "data":
									return part.name === "plan" ? (
										<ChatPlanList plan={part.data as ChatPlan} />
									) : null;
								case "indicator":
									return <Sparkles />;
								default:
									return null;
							}
						}}
					</MessagePrimitive.GroupedParts>
				</div>
			) : (
				<Files />
			)}
		</MessagePrimitive.Root>
	);
}

// The files the agent produced, one shown at a time; with none, that it produced none
function Files() {
	const t = useTranslations("chat.form");
	const files = useAuiState((s) =>
		s.message.content.flatMap((part) =>
			part.type === "data" && part.name === "file" ? [part.data as ChatFile] : [],
		),
	);
	const status = useAuiState((s) => s.message.status?.type);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = files.find(({ id }) => id === selectedId) ?? files[0];

	return (
		<>
			{status !== "complete" && (
				<div className="px-4 md:px-6">
					<MessageOutcome />
				</div>
			)}
			{files.length > 1 && (
				<div className="flex flex-wrap gap-1 border-b px-4 py-2" role="tablist">
					{files.map((file) => (
						<Button
							key={file.id}
							role="tab"
							aria-selected={file === selected}
							variant={file === selected ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setSelectedId(file.id)}
						>
							<span className="max-w-48 truncate">{file.name}</span>
						</Button>
					))}
				</div>
			)}
			{selected ? (
				<ChatFilePreview key={selected.id} file={selected} embedded />
			) : (
				status === "complete" && <Placeholder>{t("noFiles")}</Placeholder>
			)}
		</>
	);
}

function Placeholder({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
			{children}
		</div>
	);
}

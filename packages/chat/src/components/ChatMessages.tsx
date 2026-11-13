"use client";

import {
	ActionBarPrimitive,
	AuiIf,
	BranchPickerPrimitive,
	ComposerPrimitive,
	groupPartByType,
	MessagePrimitive,
	useAuiState,
} from "@assistant-ui/react";
import {
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleAlertIcon,
	CopyIcon,
	PencilIcon,
	RefreshCwIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import { MAX_RUNNING_ANSWERS } from "../contract/events";
import type { FormPart } from "../contract/form";
import type {
	ChatErrorCode,
	ChatFile,
	ChatNotice,
	ChatPlan,
	ChatStepView,
	ChatUsage,
} from "../lib/messages";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { ChatAttachment } from "./ChatAttachment";
import { ChatComposerQuote } from "./ChatComposer";
import { ChatFileLink } from "./ChatFileLink";
import { FormMessage, useChatOptions } from "./ChatFormMessages";
import { ChatPlanList } from "./ChatPlan";
import { ChatStepRow, ChatSteps } from "./ChatSteps";
import { MarkdownText } from "./MarkdownText";

// Consecutive steps close into one line
export const groupBy = groupPartByType({ "tool-call": ["group-steps"] });

export function ChatMessage() {
	const role = useAuiState((s) => s.message.role);

	return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

const actionButtonClasses = "size-8 text-muted-foreground";

function UserMessage() {
	const t = useTranslations("chat.actions");
	const form = useAuiState(
		(s) => (s.message.metadata.custom.form as FormPart | undefined) ?? null,
	);

	// A form: only "Form compilato", which opens on the form
	if (form) {
		return (
			<MessagePrimitive.Root className="flex flex-col items-end gap-2">
				<FormMessage part={form} versions={<Versions />} />
			</MessagePrimitive.Root>
		);
	}

	return (
		<MessagePrimitive.Root className="flex flex-col items-end gap-2">
			<AuiIf condition={(s) => s.message.composer.isEditing}>
				<EditComposer />
			</AuiIf>
			<AuiIf condition={(s) => !s.message.composer.isEditing}>
				<div className="flex flex-wrap justify-end gap-2 empty:hidden">
					<MessagePrimitive.Attachments>
						{() => <ChatAttachment />}
					</MessagePrimitive.Attachments>
				</div>
				{/* The part of a file the message is about */}
				<MessagePrimitive.Quote>
					{({ text }) => (
						<blockquote className="max-w-[85%] border-s-2 ps-3 text-xs break-words whitespace-pre-wrap text-muted-foreground">
							{text}
						</blockquote>
					)}
				</MessagePrimitive.Quote>
				<div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-base break-words whitespace-pre-wrap empty:hidden">
					<MessagePrimitive.Parts />
				</div>
				{/* Its height is kept, so the pencil shown on hover moves nothing */}
				<div className="-me-2 flex min-h-8 items-center gap-1">
					<ActionBarPrimitive.Root hideWhenRunning autohide="always" className="flex">
						<ActionBarPrimitive.Edit
							render={
								<Button
									variant="ghost"
									size="icon"
									className={actionButtonClasses}
									aria-label={t("edit")}
									title={t("edit")}
								/>
							}
						>
							<PencilIcon className="size-4" />
						</ActionBarPrimitive.Edit>
					</ActionBarPrimitive.Root>
					<Versions />
				</div>
			</AuiIf>
		</MessagePrimitive.Root>
	);
}

// A sent message changed in place: sending it writes a new version, the old one stays
function EditComposer() {
	const t = useTranslations("chat.actions");

	// As tall as the message with its row of buttons, so nothing moves: around
	// the text 2 + 16 + 8 + 6 + 24 = 56px, as 16 + 8 + 32 in the message
	return (
		<ComposerPrimitive.Root className="flex w-full flex-col gap-1.5 rounded-2xl border bg-card p-2">
			<ChatComposerQuote />
			<ComposerPrimitive.Input
				className="max-h-60 w-full resize-none bg-transparent px-2 py-1 text-base outline-none"
				aria-label={t("edit")}
				// The message opens to be changed
				autoFocus // oxlint-disable-line jsx-a11y/no-autofocus
			/>
			<div className="flex justify-end gap-2">
				<ComposerPrimitive.Cancel render={<Button variant="ghost" size="sm" />}>
					{t("cancel")}
				</ComposerPrimitive.Cancel>
				<ComposerPrimitive.Send render={<Button variant="primary" size="sm" />}>
					{t("send")}
				</ComposerPrimitive.Send>
			</div>
		</ComposerPrimitive.Root>
	);
}

// ‹ 2/3 ›: the versions of a message, shown only when there is more than one
export function Versions() {
	const t = useTranslations("chat.actions");

	return (
		<BranchPickerPrimitive.Root
			hideWhenSingleBranch
			className="inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums"
		>
			<BranchPickerPrimitive.Previous
				render={
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						aria-label={t("previousVersion")}
						title={t("previousVersion")}
					/>
				}
			>
				<ChevronLeftIcon className="size-4" />
			</BranchPickerPrimitive.Previous>
			<BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
			<BranchPickerPrimitive.Next
				render={
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						aria-label={t("nextVersion")}
						title={t("nextVersion")}
					/>
				}
			>
				<ChevronRightIcon className="size-4" />
			</BranchPickerPrimitive.Next>
		</BranchPickerPrimitive.Root>
	);
}

function AssistantMessage() {
	// With only files as the result, the answer's text stays hidden
	const { filesOnly } = useChatOptions();

	return (
		<MessagePrimitive.Root className="text-base break-words">
			<MessagePrimitive.GroupedParts groupBy={groupBy}>
				{({ part, children }) => {
					switch (part.type) {
						case "group-steps":
							return <ChatSteps group={part}>{children}</ChatSteps>;
						case "text":
							return filesOnly ? null : <MarkdownText />;
						case "tool-call":
							return (
								<ChatStepRow
									step={part.artifact as ChatStepView}
									respondToApproval={part.respondToApproval}
								/>
							);
						case "data":
							if (part.name === "notice") {
								return <MessageNotice notice={part.data as ChatNotice} />;
							}

							if (part.name === "plan") {
								return <ChatPlanList plan={part.data as ChatPlan} />;
							}

							return part.name === "file" ? (
								<ChatFileLink file={part.data as ChatFile} />
							) : null;
						case "indicator":
							return <Sparkles />;
						default:
							return null;
					}
				}}
			</MessagePrimitive.GroupedParts>
			<MessageOutcome />
			{!filesOnly && <MessageActions />}
		</MessagePrimitive.Root>
	);
}

// Above an answer: it started over on a new pod after the first one fell
function MessageNotice({ notice }: { notice: ChatNotice }) {
	const t = useTranslations("chat.notices");

	return <p className="mb-2 text-xs text-muted-foreground">{t(notice.code)}</p>;
}

// A four-pointed star, centred on 12,12
const STAR =
	"M12 2C12.6 7.5 16.5 11.4 22 12C16.5 12.6 12.6 16.5 12 22C11.4 16.5 7.5 12.6 2 12C7.5 11.4 11.4 7.5 12 2Z";

// Three stars twinkling in turn while the agent works
export function Sparkles() {
	return (
		<svg viewBox="0 0 24 24" className="inline-block size-5 text-primary" aria-hidden>
			{[
				{ x: 1.8, y: 6.4, scale: 0.65, delay: "0s" },
				{ x: 12.5, y: 2.2, scale: 0.4, delay: "0.45s" },
				{ x: 13.4, y: 12.8, scale: 0.35, delay: "0.9s" },
			].map(({ x, y, scale, delay }) => (
				<g key={delay} transform={`translate(${x} ${y}) scale(${scale})`}>
					<path
						d={STAR}
						fill="currentColor"
						className="origin-center animate-twinkle [transform-box:fill-box] motion-reduce:animate-none"
						style={{ animationDelay: delay }}
					/>
				</g>
			))}
		</svg>
	);
}

// Below the answer, once it is written: always under the last one, on hover under the others
function MessageActions() {
	const t = useTranslations("chat.actions");

	// The row keeps its height, so the buttons shown on hover or at the end move nothing
	return (
		<div className="-ms-2 mt-1 flex min-h-8 items-center gap-1">
			<Versions />
			<ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="flex gap-1">
				<ActionBarPrimitive.Copy
					render={
						<Button
							variant="ghost"
							size="icon"
							className={`${actionButtonClasses} group/copy`}
							aria-label={t("copy")}
							title={t("copy")}
							data-chat-copy
						/>
					}
				>
					<CopyIcon className="size-4 group-data-copied/copy:hidden" />
					<CheckIcon className="hidden size-4 group-data-copied/copy:block" />
				</ActionBarPrimitive.Copy>
				<ActionBarPrimitive.Reload
					render={
						<Button
							variant="ghost"
							size="icon"
							className={actionButtonClasses}
							aria-label={t("regenerate")}
							title={t("regenerate")}
						/>
					}
				>
					<RefreshCwIcon className="size-4" />
				</ActionBarPrimitive.Reload>
			</ActionBarPrimitive.Root>
		</div>
	);
}

/**
 * Below the answer: the error, the stop, or the tokens and cost of the turn.
 */
export function MessageOutcome() {
	const t = useTranslations("chat");
	const format = useFormatter();
	const status = useAuiState((s) => s.message.status?.type);
	const reason = useAuiState((s) =>
		s.message.status?.type === "incomplete" ? s.message.status.reason : null,
	);
	const errorCode = useAuiState(
		(s) => (s.message.metadata.custom.errorCode as ChatErrorCode | null) ?? null,
	);
	const usage = useAuiState((s) => (s.message.metadata.custom.usage as ChatUsage | null) ?? null);

	if (status === "incomplete" && reason === "error") {
		return (
			<Alert variant="error" className="mt-2">
				<CircleAlertIcon />
				<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
					<span>
						{t(`errors.${errorCode ?? "internal"}`, { max: MAX_RUNNING_ANSWERS })}
					</span>
					{/* A new version of the answer; the failed one stays among the versions */}
					<ActionBarPrimitive.Reload render={<Button variant="outline" size="sm" />}>
						{t("actions.retry")}
					</ActionBarPrimitive.Reload>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<>
			{reason === "cancelled" && (
				<p className="mt-2 text-xs text-muted-foreground">{t("stopped")}</p>
			)}
			{usage && (
				<p className="mt-2 text-xs text-muted-foreground tabular-nums">
					{t("usage.tokens", {
						count: usage.inputTokens + usage.cachedInputTokens + usage.outputTokens,
					})}
					{usage.costEur !== null &&
						` · ${format.number(usage.costEur, {
							style: "currency",
							currency: "EUR",
							minimumFractionDigits: 2,
							maximumFractionDigits: 4,
						})}`}
				</p>
			)}
		</>
	);
}

"use client";

import { type MessagePrimitive, type ToolApprovalResponse, useAuiState } from "@assistant-ui/react";
import {
	BookOpenIcon,
	BotIcon,
	CheckIcon,
	ChevronRightIcon,
	CircleAlertIcon,
	FileTextIcon,
	GlobeIcon,
	LoaderCircleIcon,
	WrenchIcon,
} from "lucide-react";
import { type PropsWithChildren, useState } from "react";
import { useTranslations } from "use-intl";

import type { ChatStep, ChatStepView } from "../lib/messages";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";

const KIND_ICONS = {
	file: FileTextIcon,
	tool: WrenchIcon,
	skill: BookOpenIcon,
	web: GlobeIcon,
	agent: BotIcon,
} as const satisfies Record<ChatStep["kind"], unknown>;

const stepAt = (parts: readonly { type: string; artifact?: unknown }[], index: number) => {
	const part = parts[index];

	return part?.type === "tool-call" ? (part.artifact as ChatStep) : undefined;
};

/**
 * The steps of the agent between two pieces of text, closed on one line; they
 * open by themselves when a write tool waits for the user.
 */
export function ChatSteps({
	group,
	children,
}: PropsWithChildren<{ group: MessagePrimitive.GroupedParts.GroupPart }>) {
	const t = useTranslations("chat.steps");
	const [open, setOpen] = useState(false);
	const lastLabel = useAuiState(
		(s) => stepAt(s.message.parts, group.indices[group.indices.length - 1] ?? -1)?.label ?? "",
	);
	const isWaiting = useAuiState((s) =>
		group.indices.some((index) => {
			const confirmation = stepAt(s.message.parts, index)?.confirmation;

			return confirmation !== undefined && confirmation.approved === undefined;
		}),
	);
	const isRunning = group.status.type === "running";
	const isOpen = open || isWaiting;

	return (
		<div className="my-2">
			<button
				type="button"
				onClick={() => setOpen(!isOpen)}
				aria-expanded={isOpen}
				className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
			>
				<ChevronRightIcon
					className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-90")}
				/>
				<span className="shrink-0">{t("count", { count: group.indices.length })}</span>
				<span aria-hidden>·</span>
				<span className={cn("truncate font-mono", isRunning && "animate-pulse")}>
					{lastLabel}
				</span>
			</button>
			{isOpen && (
				<div className="ms-1.5 mt-2 flex flex-col gap-2 border-s ps-3">{children}</div>
			)}
		</div>
	);
}

type RespondToApproval = (response: ToolApprovalResponse) => Promise<void>;

export function ChatStepRow({
	step,
	respondToApproval,
}: {
	step: ChatStepView;
	respondToApproval: RespondToApproval;
}) {
	const t = useTranslations("chat.steps");
	const Icon = KIND_ICONS[step.kind];

	if (step.kind === "agent") {
		return (
			<ChatSubagent
				step={step}
				steps={step.steps ?? []}
				respondToApproval={respondToApproval}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex min-w-0 items-center gap-2 text-xs">
				<Icon className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="shrink-0 text-muted-foreground">{t(`kinds.${step.kind}`)}</span>
				<span className="min-w-0 truncate font-mono">{step.label}</span>
				<span className="ms-auto shrink-0">
					<StepStatus step={step} />
				</span>
			</div>
			{step.confirmation?.approved === undefined && step.confirmation && (
				<ChatConfirmation
					tool={step.label}
					input={step.confirmation.input}
					respondToApproval={respondToApproval}
				/>
			)}
		</div>
	);
}

function StepStatus({ step }: { step: ChatStep }) {
	const t = useTranslations("chat.steps");

	if (step.confirmation?.approved === false) {
		return <span className="text-muted-foreground">{t("refused")}</span>;
	}

	if (step.status === "running") {
		return <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" />;
	}

	return step.status === "error" ? (
		<CircleAlertIcon className="size-3.5 text-destructive" />
	) : (
		<CheckIcon className="size-3.5 text-success" />
	);
}

/**
 * A sub-agent on one line, with its task and how many steps it took; it opens
 * on its steps.
 */
function ChatSubagent({
	step,
	steps,
	respondToApproval,
}: {
	step: ChatStep;
	steps: ChatStep[];
	respondToApproval: RespondToApproval;
}) {
	const t = useTranslations("chat.steps");
	const [open, setOpen] = useState(false);

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				aria-expanded={open}
				className="flex w-full min-w-0 items-center gap-2 text-start text-xs"
			>
				<ChevronRightIcon
					className={cn(
						"size-3.5 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-90",
					)}
				/>
				<BotIcon className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="shrink-0 text-muted-foreground">{t("kinds.agent")}</span>
				<span className="min-w-0 truncate">{step.label}</span>
				<span className="shrink-0 text-muted-foreground">
					· {t("count", { count: steps.length })}
				</span>
				<span className="ms-auto shrink-0">
					<StepStatus step={step} />
				</span>
			</button>
			{open && steps.length > 0 && (
				<div className="ms-1.5 flex flex-col gap-2 border-s ps-3">
					{steps.map((child) => (
						<ChatStepRow
							key={child.id}
							step={child}
							respondToApproval={respondToApproval}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ChatConfirmation({
	tool,
	input,
	respondToApproval,
}: {
	tool: string;
	input: Record<string, unknown>;
	respondToApproval: (response: ToolApprovalResponse) => Promise<void>;
}) {
	const t = useTranslations("chat.confirmation");
	const [answer, setAnswer] = useState<boolean | null>(null);

	const respond = async (approved: boolean) => {
		setAnswer(approved);

		try {
			await respondToApproval({ approved });
		} catch {
			// The buttons stay usable to try again
			setAnswer(null);
		}
	};

	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
			<p className="text-sm font-medium">{t("title", { tool })}</p>
			{Object.keys(input).length > 0 && (
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
					{Object.entries(input).map(([name, value]) => (
						<div key={name} className="contents">
							<dt className="font-mono text-muted-foreground">{name}</dt>
							<dd className="break-words whitespace-pre-wrap">
								{typeof value === "string" ? value : JSON.stringify(value)}
							</dd>
						</div>
					))}
				</dl>
			)}
			<div className="flex justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => void respond(false)}
					disabled={answer !== null}
					loading={answer === false}
				>
					{t("refuse")}
				</Button>
				<Button
					variant="primary"
					size="sm"
					onClick={() => void respond(true)}
					disabled={answer !== null}
					loading={answer === true}
				>
					{t("allow")}
				</Button>
			</div>
		</div>
	);
}

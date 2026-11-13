"use client";

import {
	CheckIcon,
	ChevronRightIcon,
	CircleDotIcon,
	CircleIcon,
	ListChecksIcon,
} from "lucide-react";
import { useState } from "react";

import { useTranslations } from "../i18n/intl";
import type { ChatPlan } from "../lib/messages";
import { cn } from "../ui/cn";

const ITEM_ICONS = {
	pending: <CircleIcon className="size-3.5 shrink-0 text-muted-foreground" />,
	running: <CircleDotIcon className="size-3.5 shrink-0 text-primary" />,
	done: <CheckIcon className="size-3.5 shrink-0 text-success" />,
} as const satisfies Record<ChatPlan["items"][number]["status"], unknown>;

/**
 * The agent's plan on one line: how far it is and what it is doing; it opens
 * on the whole list.
 */
export function ChatPlanList({ plan }: { plan: ChatPlan }) {
	const t = useTranslations("chat.plan");
	const [open, setOpen] = useState(false);
	const total = plan.items.length;
	const done = plan.items.filter(({ status }) => status === "done").length;
	const current =
		plan.items.find(({ status }) => status === "running") ??
		plan.items.find(({ status }) => status === "pending");

	if (!total) {
		return null;
	}

	return (
		<div className="my-2">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				aria-expanded={open}
				className="flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
			>
				<ChevronRightIcon
					className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
				/>
				<ListChecksIcon className="size-3.5 shrink-0" />
				<span className="shrink-0">{t("progress", { done, total })}</span>
				{current && (
					<>
						<span aria-hidden>·</span>
						<span className="truncate">{current.text}</span>
					</>
				)}
			</button>
			{open && (
				<ol className="ms-1.5 mt-2 flex flex-col gap-1.5 border-s ps-3 text-xs">
					{plan.items.map((item, index) => (
						// The plan comes whole at each change: its items have no ids
						// oxlint-disable-next-line react/no-array-index-key
						<li key={index} className="flex items-start gap-2">
							<span className="mt-px">{ITEM_ICONS[item.status]}</span>
							<span className={cn(item.status === "done" && "text-muted-foreground")}>
								{item.text}
							</span>
						</li>
					))}
				</ol>
			)}
		</div>
	);
}

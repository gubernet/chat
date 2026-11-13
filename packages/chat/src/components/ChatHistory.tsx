"use client";

import { EllipsisIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { GubernetClient, ListedConversation } from "../client/client";
import { useTranslations } from "../i18n/intl";
import { useNotify } from "../lib/notify";
import { useResource } from "../lib/use-resource";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

// How many conversations the list shows; the others are found with the search
const RECENT_CONVERSATIONS = 30;
const SEARCH_DELAY_MS = 250;
const DAY_MS = 24 * 60 * 60 * 1000;

type DateGroup = "pinned" | "today" | "yesterday" | "week" | "month" | "older";

// The pinned ones, then by the day of their last message, as ChatGPT and Claude.ai list them
function dateGroupOf(conversation: ListedConversation, startOfToday: number): DateGroup {
	if (conversation.pinnedAt) {
		return "pinned";
	}

	const last = new Date(conversation.lastMessageAt).getTime();

	if (last >= startOfToday) {
		return "today";
	}

	if (last >= startOfToday - DAY_MS) {
		return "yesterday";
	}

	if (last >= startOfToday - 7 * DAY_MS) {
		return "week";
	}

	return last >= startOfToday - 30 * DAY_MS ? "month" : "older";
}

export function groupByDate(conversations: ListedConversation[], now = new Date()) {
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const groups = new Map<DateGroup, ListedConversation[]>();

	for (const conversation of conversations) {
		const group = dateGroupOf(conversation, startOfToday);

		groups.set(group, [...(groups.get(group) ?? []), conversation]);
	}

	return [...groups.entries()];
}

/**
 * The user's conversations with an agent, as the list reads them: found with
 * the search, which asks the server once the user stops typing.
 */
export function useConversationHistory(
	client: GubernetClient,
	// Null while the agent loads, or where the chat shows no conversations
	source: { organizationId: string; agentId: string } | null,
) {
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const organizationId = source?.organizationId;
	const agentId = source?.agentId;
	const load = useCallback(
		(signal: AbortSignal) =>
			client.listConversations(
				{
					organizationId: organizationId ?? "",
					agentId: agentId ?? "",
					query: query || undefined,
					limit: RECENT_CONVERSATIONS,
				},
				signal,
			),
		[client, organizationId, agentId, query],
	);
	const { data, reload } = useResource(
		organizationId && agentId ? `${organizationId}:${agentId}:${query}` : null,
		load,
	);

	useEffect(() => {
		const timeout = setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS);

		return () => clearTimeout(timeout);
	}, [search]);

	return { conversations: data ?? [], search, setSearch, isFiltered: query !== "", reload };
}

export type ConversationHistory = ReturnType<typeof useConversationHistory>;

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-0.5">
			<h2 className="px-3 pb-1 text-xs font-medium text-muted-foreground">{title}</h2>
			<ul className="flex list-none flex-col gap-0.5">{children}</ul>
		</section>
	);
}

/**
 * The conversations with the agent, found with the search and grouped by
 * date, each with its menu: rename, pin or unpin, delete.
 */
export function ChatHistory({
	client,
	history,
	activeId,
	onOpen,
	onDeleted,
}: {
	client: GubernetClient;
	history: ConversationHistory;
	// The conversation that is open, if any
	activeId: string | null;
	onOpen: (conversationId: string) => void;
	onDeleted: (conversationId: string) => void;
}) {
	const t = useTranslations("chat.history");
	const { conversations, search, setSearch, isFiltered, reload } = history;

	return (
		<div className="flex flex-col gap-3">
			<div className="relative px-1">
				<SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={t("search")}
					aria-label={t("search")}
					className="h-8 ps-8 text-sm"
				/>
			</div>

			{conversations.length === 0 && (
				<p className="px-3 py-1.5 text-sm text-muted-foreground">
					{isFiltered ? t("noResults") : t("empty")}
				</p>
			)}

			{groupByDate(conversations).map(([group, items]) => (
				<Section key={group} title={t(`groups.${group}`)}>
					{items.map((conversation) => (
						<ConversationItem
							key={conversation.id}
							client={client}
							conversation={conversation}
							isActive={conversation.id === activeId}
							onOpen={() => onOpen(conversation.id)}
							onChanged={reload}
							onDeleted={() => onDeleted(conversation.id)}
						/>
					))}
				</Section>
			))}
		</div>
	);
}

/**
 * A conversation with its menu: rename on the row itself, pin or unpin, and
 * delete after a confirmation.
 */
function ConversationItem({
	client,
	conversation,
	isActive,
	onOpen,
	onChanged,
	onDeleted,
}: {
	client: GubernetClient;
	conversation: ListedConversation;
	isActive: boolean;
	onOpen: () => void;
	onChanged: () => void;
	onDeleted: () => void;
}) {
	const t = useTranslations("chat.history.actions");
	const tChat = useTranslations("chat");
	const notify = useNotify();
	const [isRenaming, setIsRenaming] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [title, setTitle] = useState("");
	const name = conversation.title ?? tChat("untitled");

	const run = async (change: () => Promise<unknown>) => {
		try {
			await change();
			onChanged();
			return true;
		} catch {
			notify({ title: t("error"), type: "error" });
			return false;
		}
	};

	const saveTitle = async () => {
		const next = title.trim();

		setIsRenaming(false);

		if (next && next !== conversation.title) {
			await run(() => client.renameConversation(conversation.id, next));
		}
	};

	if (isRenaming) {
		return (
			<li className="px-1">
				<Input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					onBlur={() => void saveTitle()}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							void saveTitle();
						} else if (event.key === "Escape") {
							setIsRenaming(false);
						}
					}}
					maxLength={120}
					aria-label={t("renameLabel")}
					className="h-8 text-sm"
					// The row turns into its title, ready to be changed
					autoFocus // oxlint-disable-line jsx-a11y/no-autofocus
				/>
			</li>
		);
	}

	return (
		<li className="group/conversation relative">
			<button
				type="button"
				onClick={onOpen}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"flex w-full items-center gap-2 rounded-lg px-3 py-1.5 pe-9 text-start text-sm transition-colors",
					isActive ? "bg-touch/10 font-medium" : "hover:bg-accent/50",
				)}
			>
				<span className="flex-1 truncate">{name}</span>
			</button>
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						"absolute end-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
						"opacity-0 group-hover/conversation:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100",
						// On touch screens there is no hover: the button is always there
						"pointer-coarse:opacity-100",
					)}
					aria-label={t("more", { title: name })}
				>
					<EllipsisIcon className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => {
							setTitle(conversation.title ?? "");
							setIsRenaming(true);
						}}
					>
						{t("rename")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() =>
							void run(() =>
								client.pinConversation(conversation.id, !conversation.pinnedAt),
							)
						}
					>
						{conversation.pinnedAt ? t("unpin") : t("pin")}
					</DropdownMenuItem>
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => setIsDeleting(true)}
					>
						{t("delete")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("deleteTitle", { title: name })}</AlertDialogTitle>
					</AlertDialogHeader>
					<AlertDialogDescription>{t("deleteMessage")}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
						<Button
							variant="destructive"
							onClick={async () => {
								const deleted = await run(() =>
									client.deleteConversation(conversation.id),
								);

								setIsDeleting(false);

								// The open conversation is gone: a new chat takes its place
								if (deleted) {
									onDeleted();
								}
							}}
						>
							{t("delete")}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</li>
	);
}

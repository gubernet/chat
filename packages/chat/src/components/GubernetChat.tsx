"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { HistoryIcon, SquarePenIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import {
	type AgentChat,
	type ChatAgent,
	createGubernetClient,
	type GubernetClient,
	type SavedConversation,
} from "../client/client";
import { createConversationTransport, toChatTreeMessage } from "../client/transport";
import { useTranslations } from "../i18n/intl";
import type { ChatColor } from "../lib/colors";
import type { Transcribe } from "../lib/dictation";
import { type Notify, useNotify } from "../lib/notify";
import { useChatRuntime } from "../lib/use-chat-runtime";
import { useResource } from "../lib/use-resource";
import { useTurnEnd } from "../lib/use-turn-end";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import { AgentLogo } from "./AgentLogo";
import { ChatBudgetNotice } from "./ChatBudgetNotice";
import { ChatElaborato } from "./ChatElaborato";
import { ChatHistory, useConversationHistory } from "./ChatHistory";
import { ChatModelPicker } from "./ChatModelPicker";
import { ChatProvider, type ChatTheme } from "./ChatProvider";
import { ChatThread } from "./ChatThread";

// Where the user's conversations with the agent are: a menu in the bar on top,
// a panel beside the chat, or nowhere
export type ChatHistoryPlacement = "menu" | "panel" | "hidden";

export interface GubernetChatProps {
	// The address of the Gubernet installation, as https://app.example.com
	url: string;
	agentId: string;
	// The conversation to open; without it, a new chat
	conversationId?: string | null;
	// The conversation the chat is on now, null for a new chat: to keep it in the page's address
	onConversationChange?: (conversationId: string | null) => void;
	history?: ChatHistoryPlacement;
	// Without the agent's name in the bar on top
	hideTitle?: boolean;
	// Without the choice of the model: the chat uses the first one the budgets leave
	hideModel?: boolean;
	// A language tag, as "it" or "it-IT"; without it, the browser's language
	locale?: string;
	theme?: ChatTheme;
	// One of the chat's own colours; without it, the theme's
	color?: ChatColor;
	// Shows the chat's notices with the app's own toasts, in place of the chat's
	notify?: Notify;
	// What the page puts at the end of the bar on top, as its user's menu: the
	// chat has nothing of its own there
	barEnd?: ReactNode;
}

/**
 * The whole chat of an agent of a Gubernet installation: a new chat or one of
 * the user's conversations with the agent, its model and the conversations
 * had before. The user is the one signed in to the installation.
 */
export function GubernetChat({
	url,
	agentId,
	conversationId,
	onConversationChange,
	history = "menu",
	hideTitle = false,
	hideModel = false,
	locale,
	theme,
	color,
	notify,
	barEnd,
}: GubernetChatProps) {
	const client = useMemo(() => createGubernetClient({ url }), [url]);

	return (
		<ChatProvider locale={locale} theme={theme} color={color} notify={notify}>
			<AgentChatView
				// Another agent is another chat
				key={agentId}
				client={client}
				agentId={agentId}
				conversationId={conversationId}
				onConversationChange={onConversationChange}
				history={history}
				hideTitle={hideTitle}
				hideModel={hideModel}
				barEnd={barEnd}
			/>
		</ChatProvider>
	);
}

function AgentChatView({
	client,
	agentId,
	conversationId: wanted,
	onConversationChange,
	history,
	hideTitle,
	hideModel,
	barEnd,
}: {
	client: GubernetClient;
	agentId: string;
	conversationId: string | null | undefined;
	onConversationChange: ((conversationId: string | null) => void) | undefined;
	history: ChatHistoryPlacement;
	hideTitle: boolean;
	hideModel: boolean;
	barEnd: ReactNode;
}) {
	const t = useTranslations("chat");
	const loadAgent = useCallback(
		(signal: AbortSignal) => client.getAgentChat(agentId, signal),
		[client, agentId],
	);
	const agentChat = useResource(agentId, loadAgent);
	const organizationId = agentChat.data?.organizationId ?? null;
	// The conversation the chat is on, the one it opened with, and a key that
	// changes when another one opens: a new chat keeps its key when its first
	// message makes it a conversation
	const [open, setOpen] = useState({ id: wanted ?? null, opened: wanted ?? null, key: 0 });
	const [lastWanted, setLastWanted] = useState(wanted);

	// The page asks for another conversation
	if (wanted !== lastWanted) {
		setLastWanted(wanted);

		if (wanted !== undefined && wanted !== open.id) {
			setOpen({ id: wanted, opened: wanted, key: open.key + 1 });
		}
	}

	const conversations = useConversationHistory(
		client,
		history !== "hidden" && organizationId ? { organizationId, agentId } : null,
	);
	const loadDictation = useCallback(
		(signal: AbortSignal) => client.getDictationEnabled(organizationId ?? "", signal),
		[client, organizationId],
	);
	const dictation = useResource(organizationId, loadDictation);
	const dictationEnabled = dictation.data ?? false;
	// The microphone, where the organization has it on
	const transcribe = useMemo<Transcribe | undefined>(
		() =>
			dictationEnabled && organizationId
				? (audio, signal) => client.transcribe(organizationId, audio, signal)
				: undefined,
		[client, dictationEnabled, organizationId],
	);
	const reloadAgent = agentChat.reload;
	const reloadConversations = conversations.reload;
	// The title arrives with the end of the first answer, and the turn counts in the budgets
	const turnEnded = useCallback(() => {
		reloadConversations();
		reloadAgent();
	}, [reloadConversations, reloadAgent]);

	const show = (id: string | null) => {
		setOpen((current) => ({ id, opened: id, key: current.key + 1 }));
		onConversationChange?.(id);
	};

	// A new chat became a conversation: the same chat goes on
	const started = (id: string) => {
		setOpen((current) => ({ ...current, id }));
		onConversationChange?.(id);
		reloadConversations();
	};

	if (agentChat.isLoading) {
		return (
			<Frame>
				<div className="mx-auto w-full max-w-3xl p-6">
					<Skeleton className="h-64 w-full" />
				</div>
			</Frame>
		);
	}

	if (!agentChat.data) {
		return (
			<Frame>
				<Notice centered>{t("agentUnavailable")}</Notice>
			</Frame>
		);
	}

	const chat = agentChat.data;
	const list = (onPicked?: () => void) => (
		<ChatHistory
			client={client}
			history={conversations}
			activeId={open.id}
			onOpen={(id) => {
				onPicked?.();

				if (id !== open.id) {
					show(id);
				}
			}}
			onDeleted={(id) => {
				if (id === open.id) {
					show(null);
				}
			}}
		/>
	);
	// With the panel beside the chat, the bar's buttons are only for a narrow screen
	const inBar = history === "panel" ? "md:hidden" : undefined;
	// Nothing is left in the bar on a wide screen: it goes away
	const barClassName =
		history === "panel" && hideTitle && hideModel && !barEnd ? "md:hidden" : undefined;
	const barStart = (
		<>
			{!hideTitle && (
				<span className="min-w-0 truncate px-1 text-sm font-semibold">
					{chat.agent.name}
				</span>
			)}
			<Button
				variant="ghost"
				size="icon"
				className={cn("shrink-0", inBar)}
				aria-label={t("newChat")}
				title={t("newChat")}
				onClick={() => show(null)}
			>
				<SquarePenIcon className="size-4" />
			</Button>
			{history !== "hidden" && <HistoryMenu className={inBar}>{list}</HistoryMenu>}
		</>
	);

	return (
		<Frame>
			<div className="flex min-h-0 flex-1">
				{history === "panel" && (
					<aside className="flex w-64 shrink-0 flex-col gap-3 border-e p-3 max-md:hidden">
						<Button
							variant="outline"
							className="justify-start"
							onClick={() => show(null)}
						>
							<SquarePenIcon className="size-4" />
							{t("newChat")}
						</Button>
						<div className="min-h-0 flex-1 overflow-y-auto">{list()}</div>
					</aside>
				)}
				<div className="min-w-0 flex-1">
					<ChatSession
						key={open.key}
						client={client}
						chat={chat}
						conversationId={open.opened}
						barStart={barStart}
						barEnd={barEnd}
						barClassName={barClassName}
						hideModel={hideModel}
						transcribe={transcribe}
						onStarted={started}
						onTurnEnd={turnEnded}
						onBudgetRequested={reloadAgent}
					/>
				</div>
			</div>
		</Frame>
	);
}

// The chat paints its own background: the page around it may have another
function Frame({ children }: { children: ReactNode }) {
	return <div className="flex h-full flex-col bg-background text-foreground">{children}</div>;
}

// Alone in the chat, a notice sits in the middle of its height
function Notice({ centered, children }: { centered?: boolean; children: ReactNode }) {
	return (
		<div className={cn("mx-auto w-full max-w-3xl p-6", centered && "my-auto")}>
			<div className="rounded-xl border bg-card p-8 text-center text-card-foreground">
				{children}
			</div>
		</div>
	);
}

// The conversations in a menu of the bar; choosing one closes it
function HistoryMenu({
	className,
	children,
}: {
	className?: string;
	children: (close: () => void) => ReactNode;
}) {
	const t = useTranslations("chat.history");
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={cn("shrink-0", className)}
						aria-label={t("title")}
						title={t("title")}
					/>
				}
			>
				<HistoryIcon className="size-4" />
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="max-h-[min(32rem,var(--available-height))] w-80 overflow-y-auto p-3"
			>
				{children(() => setIsOpen(false))}
			</PopoverContent>
		</Popover>
	);
}

// The bar on top, with what the chat is and its model on the left and what the
// page adds on the right, and the chat below
function SessionFrame({
	start,
	model,
	end,
	className,
	children,
}: {
	start: ReactNode;
	model?: ReactNode;
	end: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex h-full flex-col">
			<div className={cn("flex min-h-14 items-center gap-3 border-b px-4 py-2", className)}>
				<div className="flex min-w-0 flex-1 items-center gap-1">
					{start}
					{model}
				</div>
				{end && <div className="flex shrink-0 items-center gap-2">{end}</div>}
			</div>
			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}

interface SessionProps {
	client: GubernetClient;
	chat: AgentChat;
	barStart: ReactNode;
	barEnd: ReactNode;
	barClassName: string | undefined;
	hideModel: boolean;
	transcribe: Transcribe | undefined;
	onStarted: (conversationId: string) => void;
	onTurnEnd: () => void;
	onBudgetRequested: () => void;
}

// A new chat, or a conversation read from the installation before it opens
function ChatSession({
	conversationId,
	...session
}: SessionProps & { conversationId: string | null }) {
	const t = useTranslations("chat");
	const { client, chat, barStart, barEnd, barClassName } = session;
	const load = useCallback(
		(signal: AbortSignal) => client.findConversation(conversationId ?? "", signal),
		[client, conversationId],
	);
	const conversation = useResource(conversationId, load);

	if (conversationId === null) {
		return <OpenSession {...session} conversation={null} />;
	}

	if (conversation.isLoading) {
		return (
			<SessionFrame start={barStart} end={barEnd} className={barClassName}>
				<div className="mx-auto w-full max-w-3xl p-6">
					<Skeleton className="h-64 w-full" />
				</div>
			</SessionFrame>
		);
	}

	// Not the user's, deleted, or of another agent
	if (!conversation.data || conversation.data.agent?.id !== chat.agent.id) {
		return (
			<SessionFrame start={barStart} end={barEnd} className={barClassName}>
				<Notice>{t("notFound")}</Notice>
			</SessionFrame>
		);
	}

	return <OpenSession {...session} conversation={conversation.data} />;
}

// The first of the agent's models the budgets leave for now, or none
const firstAvailableModel = (agent: ChatAgent) =>
	agent.models.find(({ available }) => available)?.code ?? "";

/**
 * The chat itself. A new chat takes agent and model until the first message,
 * which creates the conversation; then it goes on as that conversation.
 */
function OpenSession({
	client,
	chat,
	conversation,
	barStart,
	barEnd,
	barClassName,
	hideModel,
	transcribe,
	onStarted,
	onTurnEnd,
	onBudgetRequested,
}: SessionProps & { conversation: SavedConversation | null }) {
	const t = useTranslations("chat");
	const notify = useNotify();
	const { agent, organizationId } = chat;
	// Set by the first message of a new chat
	const [conversationId, setConversationId] = useState(conversation?.id ?? null);
	const [chosenModelCode, setModelCode] = useState(
		conversation?.modelCode ?? firstAvailableModel(agent),
	);
	const [changingModel, setChangingModel] = useState(false);
	const chosenAvailable = agent.models.some(
		({ code, available }) => code === chosenModelCode && available,
	);
	// Until the first message a model the budgets no longer leave gives way to
	// the first one they do; then the conversation keeps its own
	const modelCode =
		conversationId || chosenAvailable ? chosenModelCode : firstAvailableModel(agent);
	const canContinue = conversation?.canContinue ?? true;
	const startId = conversation?.id ?? null;
	// One transport for the whole chat: it takes the model as it changes and
	// creates the conversation with it at the first message
	const transport = useMemo(
		() =>
			createConversationTransport(client, {
				conversationId: startId,
				onCreated: (id, started) => {
					setModelCode(started.modelCode);
					setConversationId(id);
					onStarted(id);
				},
			}),
		// The chat's own transport, for as long as it is open
		// oxlint-disable-next-line react-hooks/exhaustive-deps
		[client, startId],
	);

	useEffect(() => {
		transport.choose({ organizationId, agentId: agent.id, modelCode });
	}, [transport, organizationId, agent.id, modelCode]);

	const { runtime, isRunning } = useChatRuntime({
		transport,
		suggestions: conversation ? [] : agent.conversationStarters,
		initialMessages: conversation?.messages.map(toChatTreeMessage),
		// A conversation that can only be read, or no model the budgets leave
		isDisabled: !canContinue || (conversationId ? !chosenAvailable : !modelCode),
		showUsage: false,
		transcribe,
	});

	useTurnEnd(isRunning, onTurnEnd);

	// Before the first message the choice stays in the chat; then the
	// conversation goes on with the new model, from the next message
	const changeModel = async (code: string) => {
		if (code === modelCode) {
			return;
		}

		if (!conversationId) {
			setModelCode(code);
			return;
		}

		setChangingModel(true);

		try {
			await client.setConversationModel(conversationId, code);
			setModelCode(code);
		} catch {
			notify({ title: t("controls.modelError"), type: "error" });
		}

		setChangingModel(false);
	};

	// Started from a form whose result is only files: the elaborato's page, with
	// the agent's form as it is now, or as it was sent
	const startForm = conversation?.messages
		.filter(({ parentId, role }) => parentId === null && role === "user")
		.flatMap(({ parts }) => parts.flatMap((part) => (part.type === "form" ? [part] : [])))[0];
	const elaborato = conversation
		? startForm?.result === "files"
			? (agent.form ?? { elements: startForm.elements, result: startForm.result })
			: null
		: agent.form?.result === "files"
			? agent.form
			: null;

	return (
		<SessionFrame
			start={barStart}
			end={barEnd}
			className={barClassName}
			model={
				!hideModel && (
					<ChatModelPicker
						models={agent.models}
						modelCode={modelCode}
						onModelChange={(code) => void changeModel(code)}
						locked={!canContinue || isRunning || changingModel}
					/>
				)
			}
		>
			<div className="flex h-full flex-col">
				{!canContinue && (
					<p className="bg-muted px-4 py-2 text-sm text-muted-foreground">
						{t("readOnly")}
					</p>
				)}
				<ChatBudgetNotice
					budget={chat.budget}
					onRequest={async (note) => {
						await client.requestBudgetIncrease(organizationId, note);
						onBudgetRequested();
					}}
				/>
				<div className="min-h-0 flex-1">
					<AssistantRuntimeProvider runtime={runtime}>
						{elaborato ? (
							<ChatElaborato
								form={elaborato}
								welcome={
									<div className="flex items-start gap-3">
										<AgentLogo agent={agent} size="md" />
										<div className="min-w-0">
											<p className="font-semibold">{agent.name}</p>
											{agent.description && (
												<p className="line-clamp-3 text-sm text-muted-foreground">
													{agent.description}
												</p>
											)}
										</div>
									</div>
								}
							/>
						) : conversation ? (
							<ChatThread />
						) : (
							<ChatThread
								centeredStart
								form={agent.form}
								welcome={
									<div className="flex flex-col items-center gap-3 text-center">
										<AgentLogo agent={agent} size="lg" />
										<p className="text-xl font-semibold">{agent.name}</p>
										{agent.description && (
											<p className="line-clamp-3 max-w-xl text-sm text-muted-foreground">
												{agent.description}
											</p>
										)}
									</div>
								}
							/>
						)}
					</AssistantRuntimeProvider>
				</div>
			</div>
		</SessionFrame>
	);
}

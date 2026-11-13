"use client";

import {
	type AppendMessage,
	type AttachmentAdapter,
	ExportedMessageRepository,
	generateId,
	type QuoteInfo,
	type RespondToToolApprovalOptions,
	type ThreadMessage,
	useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import type { AnswerEvent, ChatAttachment } from "../contract/events";
import type { FormPart, FormValues } from "../contract/form";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_MESSAGE } from "../contract/limits";
import { createRecordingDictationAdapter, type Transcribe } from "./dictation";
import {
	answerConfirmation,
	applyAnswerEvent,
	type ChatErrorCode,
	type ChatMessage,
	createAssistantMessage,
	createUserMessage,
	failMessage,
	hasPendingConfirmation,
	settleMessage,
	toThreadMessage,
} from "./messages";
import { useNotify } from "./notify";
import { joinQuote } from "./references";

// A message with the one it follows: the versions of a message share it
export type ChatTreeMessage = ChatMessage & { parentId: string | null };

// An attachment as the composer holds it, with its file to upload
export type ChatOutgoingAttachment = ChatAttachment & { file?: File };

/**
 * A form sent as a message, in its metadata: the form with its values, shown
 * at once, the new files and those kept, by name, from the message sent before.
 */
export interface ChatFormMessage {
	part: FormPart;
	files: File[];
	kept: ChatAttachment[];
	keepFrom?: string;
}

/**
 * How the chat reaches the backend: each call streams the events of a turn.
 */
export interface ChatTransport {
	send(
		message: {
			text: string;
			attachments: ChatOutgoingAttachment[];
			// The answer the message follows, null for the first: an edited message
			// goes after the answer its original followed
			parentId: string | null;
			// The agent's form, filled in, with the message whose files it keeps
			form?: { values: FormValues };
			keepFrom?: string;
		},
		signal: AbortSignal,
	): Promise<AsyncIterable<AnswerEvent>>;
	respond(
		answer: { stepId: string; approved: boolean },
		signal: AbortSignal,
	): Promise<AsyncIterable<AnswerEvent>>;
	stop(): Promise<void>;
	// A new version of an answer, for a saved conversation only
	regenerate?(messageId: string, signal: AbortSignal): Promise<AsyncIterable<AnswerEvent>>;
	// The conversation as saved, with every version, after each turn
	load?(): Promise<ChatTreeMessage[]>;
	// An answer still running, from its start and then live: for a saved
	// conversation, whose answers go on without the page
	follow?(messageId: string, signal: AbortSignal): Promise<AsyncIterable<AnswerEvent>>;
}

/**
 * Thrown by a transport to show a known error in the chat.
 */
export class ChatTransportError extends Error {
	constructor(readonly code: ChatErrorCode) {
		super(code);
	}
}

// The files wait in the composer; the transport uploads them with the message
const attachmentAdapter: AttachmentAdapter = {
	accept: "*",
	add: ({ file }) => {
		if (file.size > MAX_ATTACHMENT_BYTES) {
			return Promise.reject(new Error("The file is too large"));
		}

		return Promise.resolve({
			id: generateId(),
			type: file.type.startsWith("image/") ? "image" : "document",
			name: file.name,
			contentType: file.type,
			file,
			status: { type: "requires-action", reason: "composer-send" },
		});
	},
	send: (attachment) =>
		Promise.resolve({ ...attachment, status: { type: "complete" }, content: [] }),
	remove: () => Promise.resolve(),
};

const lastId = (messages: readonly { id: string }[]) => messages[messages.length - 1]?.id ?? null;

// The page went away: the answer goes on without it. An AbortError, as any
// stream closed on purpose
const LEFT = new DOMException("The page went away", "AbortError");

// An answer still running after its stream ended is followed again after this long
const FOLLOW_AGAIN_MS = 1000;

// The visible branch: from the head back to the first message
function pathTo(messages: ChatTreeMessage[], headId: string | null) {
	const byId = new Map(messages.map((message) => [message.id, message]));
	const path: ChatTreeMessage[] = [];

	for (let current = headId ? byId.get(headId) : undefined; current;) {
		path.unshift(current);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}

	return path;
}

export function useChatRuntime({
	transport,
	suggestions,
	initialMessages = [],
	isDisabled = false,
	showUsage = false,
	transcribe,
}: {
	transport: ChatTransport;
	suggestions: string[];
	// A saved conversation opens with its messages, on its latest version
	initialMessages?: ChatTreeMessage[];
	// A conversation that can only be read
	isDisabled?: boolean;
	// Tokens and cost of each answer, for who tests an agent; the chat's users never see them
	showUsage?: boolean;
	// The microphone of the composer, where the organization has it on; the
	// text goes in the composer to be read before sending
	transcribe?: Transcribe;
}) {
	const tDictation = useTranslations("chat.composer.dictationErrors");
	const notify = useNotify();
	const dictationAdapter = useMemo(
		() =>
			transcribe &&
			createRecordingDictationAdapter({
				transcribe,
				onError: (error) =>
					notify({
						title: tDictation(error),
						type: error === "limit" ? "info" : "error",
					}),
			}),
		[transcribe, tDictation, notify],
	);
	const [messages, setMessages] = useState<ChatTreeMessage[]>(initialMessages);
	const [headId, setHeadId] = useState<string | null>(lastId(initialMessages));
	const [isRunning, setIsRunning] = useState(false);
	const runRef = useRef<{ messageId: string; controller: AbortController } | null>(null);
	const leftRef = useRef(false);

	const update = (id: string, change: (message: ChatMessage) => ChatMessage) =>
		setMessages((current) =>
			current.map((message) =>
				message.id === id ? { ...change(message), parentId: message.parentId } : message,
			),
		);

	/**
	 * After a turn the saved conversation replaces the chat's own copy, so the
	 * next message, edit or new version refers to the saved messages; without
	 * it the chat closes its own copy. Gives the answer still running, if any.
	 */
	const settle = async (messageId: string, failure: ChatErrorCode | null, stopped: boolean) => {
		if (transport.load) {
			try {
				const saved = await transport.load();
				const head = saved[saved.length - 1];

				setMessages(saved);
				setHeadId(lastId(saved));

				return head?.role === "assistant" && head.status === "running" ? head.id : null;
			} catch {
				// The chat keeps its copy; the page reloaded shows the saved one
			}
		}

		update(messageId, (message) =>
			failure ? failMessage(message, failure) : settleMessage(message, stopped),
		);

		return null;
	};

	const run = async (
		messageId: string,
		open: (signal: AbortSignal) => Promise<AsyncIterable<AnswerEvent>>,
	) => {
		const controller = new AbortController();
		let failure: ChatErrorCode | null = null;

		runRef.current = { messageId, controller };
		setIsRunning(true);

		try {
			for await (const event of await open(controller.signal)) {
				update(messageId, (message) => applyAnswerEvent(message, event));
			}
		} catch (error) {
			if (!controller.signal.aborted) {
				failure = error instanceof ChatTransportError ? error.code : "internal";
			}
		}

		if (controller.signal.reason === LEFT) {
			return;
		}

		const running = await settle(messageId, failure, controller.signal.aborted);
		const follow = transport.follow?.bind(transport);

		if (runRef.current?.controller !== controller) {
			return;
		}

		// The stream broke, or the stop has not reached the agent yet: the page
		// follows the answer again until it ends
		if (running && follow) {
			setTimeout(() => {
				if (!leftRef.current && runRef.current?.controller === controller) {
					void run(running, (signal) => follow(running, signal));
				}
			}, FOLLOW_AGAIN_MS);
			return;
		}

		runRef.current = null;
		setIsRunning(false);
	};

	// A conversation opened while its last answer runs follows it; the answer
	// goes on when the page goes away
	useEffect(() => {
		const head = initialMessages[initialMessages.length - 1];
		const follow = transport.follow?.bind(transport);

		leftRef.current = false;

		if (follow && head?.role === "assistant" && head.status === "running") {
			void run(head.id, (signal) => follow(head.id, signal));
		}

		return () => {
			leftRef.current = true;

			// Only the stream closes; an agent's test keeps its own way to end
			if (follow) {
				runRef.current?.controller.abort(LEFT);
			}
		};
		// Once, for the conversation as the page opened it
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// A message, new or edited, after the answer it follows, with the agent's answer
	const sendAfter = (message: AppendMessage) => {
		const custom = message.metadata?.custom as
			| { quote?: QuoteInfo; form?: ChatFormMessage }
			| undefined;
		const form = custom?.form;
		const typed = message.content
			.flatMap((part) => (part.type === "text" ? [part.text] : []))
			.join("\n")
			.trim();
		// The part of a file the message is about goes at its top; a form has no text
		const text = form ? "" : joinQuote(custom?.quote?.text, typed);
		const attachments: ChatOutgoingAttachment[] = form
			? [
					...form.files.map((file) => ({
						name: file.name,
						mimeType: file.type || "application/octet-stream",
						size: file.size,
						file,
					})),
					...form.kept,
				]
			: (message.attachments ?? [])
					.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)
					.map((attachment) => ({
						name: attachment.name,
						mimeType: attachment.contentType || "application/octet-stream",
						size: attachment.file?.size ?? 0,
						file: attachment.file,
					}));
		const parentId = message.parentId;
		const userMessageId = generateId();
		const answerId = generateId();

		setMessages((current) => [
			...current,
			{
				...createUserMessage(
					userMessageId,
					text,
					attachments.map(({ file: _file, ...attachment }) => attachment),
					form?.part,
				),
				parentId,
			},
			{ ...createAssistantMessage(answerId), parentId: userMessageId },
		]);
		setHeadId(answerId);
		// The composer is free again while the answer streams
		void run(answerId, (signal) =>
			transport.send(
				{
					text,
					attachments,
					parentId,
					...(form && { form: { values: form.part.values }, keepFrom: form.keepFrom }),
				},
				signal,
			),
		);
	};

	const onNew = async (message: AppendMessage) => sendAfter(message);

	const onEdit = async (message: AppendMessage) => sendAfter(message);

	// A new version of the answer to a message, the earlier one kept beside it
	const onReload = async (parentId: string | null) => {
		const answer = pathTo(messages, headId).find(
			(message) => message.role === "assistant" && message.parentId === parentId,
		);
		if (!answer || !parentId || transport.regenerate === undefined) {
			return;
		}

		const answerId = generateId();

		setMessages((current) => [...current, { ...createAssistantMessage(answerId), parentId }]);
		setHeadId(answerId);
		void run(answerId, (signal) =>
			transport.regenerate
				? transport.regenerate(answer.id, signal)
				: Promise.reject(new ChatTransportError("internal")),
		);
	};

	const onRespondToToolApproval = async ({
		approvalId,
		approved,
	}: RespondToToolApprovalOptions) => {
		const message = messages.find(({ parts }) =>
			parts.some((part) => part.type === "step" && part.id === approvalId),
		);

		if (!message) {
			return;
		}

		update(message.id, (current) => answerConfirmation(current, approvalId, approved));
		void run(message.id, (signal) =>
			transport.respond({ stepId: approvalId, approved }, signal),
		);
	};

	const onCancel = async () => {
		runRef.current?.controller.abort();
		await transport.stop().catch(() => undefined);
	};

	// Every version, with the visible one as the head
	const messageRepository = useMemo(
		() =>
			ExportedMessageRepository.fromBranchableArray(
				messages.map(({ parentId, ...message }) => ({
					message: toThreadMessage(showUsage ? message : { ...message, usage: null }),
					parentId,
				})),
				{ headId },
			),
		[messages, headId, showUsage],
	);

	// Edits and new versions need a conversation that keeps them
	const canBranch = transport.regenerate !== undefined && transport.load !== undefined;

	const runtime = useExternalStoreRuntime({
		messageRepository,
		isRunning,
		onNew,
		...(canBranch && { onEdit, onReload }),
		onCancel,
		onRespondToToolApproval,
		// The arrows between the versions show another branch
		setMessages: (visible: readonly ThreadMessage[]) => setHeadId(lastId(visible)),
		isDisabled,
		// The agent waits for the answer to its write tool before a new message
		isSendDisabled: messages.some(hasPendingConfirmation),
		suggestions: suggestions.map((prompt) => ({ prompt })),
		adapters: {
			attachments: attachmentAdapter,
			...(dictationAdapter && { dictation: dictationAdapter }),
		},
	});

	return { runtime, hasMessages: messages.length > 0, isRunning };
}

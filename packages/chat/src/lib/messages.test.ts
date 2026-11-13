import { describe, expect, it } from "vitest";

import type { FormPart } from "../contract/form";
import {
	answerConfirmation,
	applyChatEvent,
	createAssistantMessage,
	createUserMessage,
	hasPendingConfirmation,
	settleMessage,
	toThreadMessage,
} from "./messages";

const step = {
	type: "step",
	id: "step-1",
	kind: "tool",
	label: "crm.create_note",
	status: "running",
} as const;

describe("chat messages", () => {
	it("joins the text of the answer and updates a step in place", () => {
		let message = createAssistantMessage("answer-1");

		message = applyChatEvent(message, { type: "text", delta: "Il minimo " });
		message = applyChatEvent(message, { type: "text", delta: "è 2.897 €." });
		message = applyChatEvent(message, step);
		message = applyChatEvent(message, { ...step, status: "done" });

		expect(message.parts).toEqual([
			{ type: "text", text: "Il minimo è 2.897 €." },
			{ type: "step", id: "step-1", kind: "tool", label: "crm.create_note", status: "done" },
		]);
	});

	it("waits for the answer to a confirmation and goes on after it", () => {
		let message = applyChatEvent(createAssistantMessage("answer-1"), step);

		message = applyChatEvent(message, {
			type: "confirmation",
			stepId: "step-1",
			input: { title: "Nota" },
		});
		message = applyChatEvent(message, { type: "end", reason: "confirmation" });

		expect(message.status).toBe("awaiting-confirmation");
		expect(hasPendingConfirmation(message)).toBe(true);
		expect(toThreadMessage(message)).toMatchObject({
			status: { type: "requires-action" },
			content: [{ type: "tool-call", toolCallId: "step-1", approval: { id: "step-1" } }],
		});

		message = answerConfirmation(message, "step-1", false);

		expect(message.status).toBe("running");
		expect(hasPendingConfirmation(message)).toBe(false);
		expect(toThreadMessage(message).content).toMatchObject([
			{ approval: { id: "step-1", approved: false } },
		]);
	});

	it("ends the answer with the agent's questions, and shows the answers as the user's message", () => {
		const questions = [
			{
				question: "In che formato?",
				header: "Formato",
				options: [{ label: "Sintesi" }, { label: "Report" }],
				multiSelect: false,
			},
		];
		let message = applyChatEvent(createAssistantMessage("answer-1"), {
			type: "text",
			delta: "Prima una scelta.",
		});

		message = applyChatEvent(message, { type: "question", id: "call-1", questions });
		message = applyChatEvent(message, { type: "question", id: "call-1", questions });
		message = applyChatEvent(message, { type: "end", reason: "completed" });

		expect(message.status).toBe("complete");
		expect(toThreadMessage(message).content).toEqual([
			{ type: "text", text: "Prima una scelta." },
			{ type: "data-question", data: { type: "question", id: "call-1", questions } },
		]);

		const answers = {
			type: "answers" as const,
			answers: [{ question: "In che formato?", header: "Formato", selected: ["Sintesi"] }],
		};
		const reply = toThreadMessage(createUserMessage("user-2", "", [], answers));

		expect(reply.content).toEqual([]);
		expect(reply.metadata?.custom).toMatchObject({ answers });
	});

	it("keeps the PDF a Word document is shown as, with the file", () => {
		const file = {
			id: "file-1",
			name: "Contratto.docx",
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			size: 12_000,
			url: "https://app.example.com/api/conversations/c1/files/file-1",
		};
		const withPreview = applyChatEvent(createAssistantMessage("answer-1"), {
			type: "file",
			...file,
			previewUrl: `${file.url}/preview`,
		});
		const without = applyChatEvent(createAssistantMessage("answer-2"), {
			type: "file",
			...file,
		});

		expect(toThreadMessage(withPreview).content).toEqual([
			{
				type: "data-file",
				data: { type: "file", ...file, previewUrl: `${file.url}/preview` },
			},
		]);
		// A file without one says nothing of a preview
		expect(without.parts).toEqual([{ type: "file", ...file }]);
	});

	it("sums the usage of the turn, without a cost for the tenant's own key", () => {
		const usage = {
			type: "usage",
			inputTokens: 100,
			cachedInputTokens: 1_000,
			outputTokens: 50,
			webSearches: 1,
			webPages: 3,
		} as const;

		let message = applyChatEvent(createAssistantMessage("answer-1"), {
			...usage,
			costEur: 0.01,
		});

		message = applyChatEvent(message, { ...usage, costEur: 0.02 });

		expect(message.usage).toEqual({
			inputTokens: 200,
			cachedInputTokens: 2_000,
			outputTokens: 100,
			webSearches: 2,
			webPages: 6,
			costEur: 0.03,
		});
		expect(applyChatEvent(message, { ...usage, costEur: null }).usage?.costEur).toBeNull();
	});

	it("keeps an error over the end of the turn", () => {
		let message = applyChatEvent(createAssistantMessage("answer-1"), {
			type: "error",
			code: "engine_unavailable",
		});

		message = applyChatEvent(message, { type: "end", reason: "completed" });

		expect(message).toMatchObject({ status: "error", errorCode: "engine_unavailable" });
		expect(toThreadMessage(message).status).toEqual({ type: "incomplete", reason: "error" });
	});

	it("closes a turn cut off by the user or by the connection", () => {
		const message = createAssistantMessage("answer-1");

		expect(settleMessage(message, true).status).toBe("stopped");
		expect(settleMessage(message, false)).toMatchObject({
			status: "error",
			errorCode: "internal",
		});
	});

	it("turns files into data parts and keeps the attachments of the user", () => {
		const answer = applyChatEvent(createAssistantMessage("answer-1"), {
			type: "file",
			id: "file-1",
			name: "minimi.xlsx",
			mimeType: "application/vnd.ms-excel",
			size: 2_048,
			url: "https://example.com/minimi.xlsx",
		});

		expect(toThreadMessage(answer).content).toEqual([
			{ type: "data-file", data: expect.objectContaining({ name: "minimi.xlsx" }) },
		]);
		expect(
			toThreadMessage(
				createUserMessage("question-1", "Analizza", [
					{ name: "tabelle.xlsx", mimeType: "", size: 10 },
				]),
			).attachments,
		).toEqual([
			expect.objectContaining({ name: "tabelle.xlsx", status: { type: "complete" } }),
		]);
	});

	it("puts the steps of a sub-agent inside its own row", () => {
		const subagent = {
			type: "step",
			id: "agent-1",
			kind: "agent",
			label: "Leggi i contratti",
			status: "running",
		} as const;
		let message = createAssistantMessage("answer-1");

		message = applyChatEvent(message, subagent);
		message = applyChatEvent(message, {
			type: "step",
			id: "read-1",
			kind: "file",
			label: "/context/contratto.pdf",
			status: "done",
			parentId: "agent-1",
		});
		message = applyChatEvent(message, { ...subagent, status: "done" });

		expect(message.parts).toHaveLength(2);
		expect(toThreadMessage(message).content).toEqual([
			expect.objectContaining({
				type: "tool-call",
				toolCallId: "agent-1",
				artifact: expect.objectContaining({
					status: "done",
					steps: [expect.objectContaining({ id: "read-1", parentId: "agent-1" })],
				}),
			}),
		]);
	});

	it("keeps one plan, where it first appeared, at its latest state", () => {
		let message = createAssistantMessage("answer-1");

		message = applyChatEvent(message, {
			type: "plan",
			items: [
				{ text: "Leggere", status: "running" },
				{ text: "Scrivere", status: "pending" },
			],
		});
		message = applyChatEvent(message, { type: "text", delta: "Ecco." });
		message = applyChatEvent(message, {
			type: "plan",
			items: [
				{ text: "Leggere", status: "done" },
				{ text: "Scrivere", status: "done" },
			],
		});

		expect(message.parts).toEqual([
			{
				type: "plan",
				items: [
					{ text: "Leggere", status: "done" },
					{ text: "Scrivere", status: "done" },
				],
			},
			{ type: "text", text: "Ecco." },
		]);
		expect(toThreadMessage(message).content[0]).toMatchObject({ type: "data-plan" });
	});

	it("shows a form sent as the form itself, not among the message's parts", () => {
		const form: FormPart = {
			type: "form",
			result: "chat",
			elements: [
				{ id: "company", type: "text", name: "Azienda", description: null, required: true },
			],
			values: { company: "Acme" },
		};
		const message = toThreadMessage(createUserMessage("question-1", "", [], form));

		expect(message.content).toEqual([]);
		expect(message.metadata?.custom).toMatchObject({ form });
	});
});

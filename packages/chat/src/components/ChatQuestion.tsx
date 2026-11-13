"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import type { Answer, AnswersPart, QuestionPart } from "../contract/questions";
import { useTranslations } from "../i18n/intl";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Input } from "../ui/input";

// What the user chose for a question: options, and their own text when "Other" is on
interface Choice {
	selected: string[];
	other: string | null;
}

const isAnswered = ({ selected, other }: Choice) =>
	selected.length > 0 || (other !== null && other.trim() !== "");

const choiceOf = (answer: Answer | undefined): Choice => ({
	selected: answer?.selected ?? [],
	other: answer?.other ?? null,
});

/**
 * The agent's questions at the end of its answer, each with its options and
 * "Other" for an answer of the user's own. While nothing follows the answer
 * the user sends them, as a message; writing in the composer answers too.
 * Then they show what was chosen, read-only.
 */
export function ChatQuestion({ part }: { part: QuestionPart }) {
	const t = useTranslations("chat.question");
	const aui = useAui();
	const messageId = useAuiState((s) => s.message.id);
	const canAnswer = useAuiState(
		(s) => s.message.isLast && !s.thread.isRunning && !s.thread.isDisabled,
	);
	// The answers sent, in the message after this one
	const sent = useAuiState((s) => {
		const index = s.thread.messages.findIndex(({ id }) => id === messageId);
		const next = s.thread.messages[index + 1];

		return (next?.metadata.custom.answers as AnswersPart | undefined)?.answers ?? null;
	});
	const [choices, setChoices] = useState<Choice[]>(() =>
		part.questions.map(() => ({ selected: [], other: null })),
	);
	const shown = sent ? part.questions.map((_, index) => choiceOf(sent[index])) : choices;
	const editable = canAnswer && !sent;

	const change = (index: number, next: (choice: Choice) => Choice) =>
		setChoices((current) =>
			current.map((choice, position) => (position === index ? next(choice) : choice)),
		);

	const send = () => {
		const answers: Answer[] = part.questions.map((question, index) => {
			const choice = choices[index] ?? { selected: [], other: null };
			const other = choice.other?.trim();

			return {
				question: question.question,
				header: question.header,
				selected: choice.selected,
				...(other && { other }),
			};
		});

		aui.thread().append({
			role: "user",
			parentId: messageId,
			content: [],
			metadata: { custom: { answers: { type: "answers", answers } satisfies AnswersPart } },
		});
	};

	return (
		<div className="mt-3 flex flex-col gap-5 rounded-2xl border bg-card p-4">
			{part.questions.map((question, index) => {
				const choice = shown[index] ?? { selected: [], other: null };
				const multiple = question.multiSelect;

				return (
					<div key={question.question} className="flex flex-col gap-2">
						<div className="flex flex-col gap-0.5">
							<span className="text-xs font-medium text-muted-foreground">
								{question.header}
							</span>
							<p className="text-sm font-medium">{question.question}</p>
						</div>
						<div
							role={multiple ? "group" : "radiogroup"}
							aria-label={question.header}
							className="flex flex-col gap-1.5"
						>
							{question.options.map((option) => (
								<ChoiceButton
									key={option.label}
									label={option.label}
									description={option.description}
									multiple={multiple}
									checked={choice.selected.includes(option.label)}
									disabled={!editable}
									onClick={() =>
										change(index, (current) =>
											multiple
												? {
														...current,
														selected: current.selected.includes(
															option.label,
														)
															? current.selected.filter(
																	(label) =>
																		label !== option.label,
																)
															: [...current.selected, option.label],
													}
												: { selected: [option.label], other: null },
										)
									}
								/>
							))}
							<ChoiceButton
								label={t("other")}
								description={editable ? undefined : (choice.other ?? undefined)}
								multiple={multiple}
								checked={choice.other !== null}
								disabled={!editable}
								onClick={() =>
									change(index, (current) =>
										multiple
											? {
													...current,
													other: current.other === null ? "" : null,
												}
											: { selected: [], other: current.other ?? "" },
									)
								}
							/>
							{editable && choice.other !== null && (
								<Input
									value={choice.other}
									maxLength={2000}
									placeholder={t("otherPlaceholder")}
									aria-label={t("other")}
									// Opened to be written in
									autoFocus // oxlint-disable-line jsx-a11y/no-autofocus
									onChange={(event) =>
										change(index, (current) => ({
											...current,
											other: event.target.value,
										}))
									}
								/>
							)}
						</div>
					</div>
				);
			})}
			{editable && (
				<div className="flex justify-end">
					<Button
						variant="primary"
						size="sm"
						disabled={!choices.every(isAnswered)}
						onClick={send}
					>
						{t("send")}
					</Button>
				</div>
			)}
		</div>
	);
}

// An option: a check for several choices, a round mark for one
function ChoiceButton({
	label,
	description,
	multiple,
	checked,
	disabled,
	onClick,
}: {
	label: string;
	description?: string;
	multiple: boolean;
	checked: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			role={multiple ? "checkbox" : "radio"}
			aria-checked={checked}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-start text-sm transition-colors enabled:hover:bg-muted disabled:cursor-default",
				checked ? "border-primary" : "border-border",
				disabled && !checked && "text-muted-foreground",
			)}
		>
			<span
				className={cn(
					"mt-0.5 flex size-4 shrink-0 items-center justify-center border",
					multiple ? "rounded" : "rounded-full",
					checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
				)}
				aria-hidden
			>
				{checked && <CheckIcon className="size-3" />}
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="break-words">{label}</span>
				{description && (
					<span className="text-xs break-words whitespace-pre-wrap text-muted-foreground">
						{description}
					</span>
				)}
			</span>
		</button>
	);
}

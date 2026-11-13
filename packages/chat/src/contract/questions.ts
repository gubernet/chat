import { z } from "zod";

/**
 * The questions an agent asks the user, each with options to choose from, and
 * the user's answers: the agent's tool in the pod, the chat's card and the
 * message of the answers share them. The limits are those of Claude's own
 * tool, which the models know.
 */
export const MAX_QUESTIONS = 4;
export const MAX_OPTIONS = 4;

const MAX_HEADER_LENGTH = 30;
const MAX_LABEL_LENGTH = 100;

export const questionSchema = z.object({
	question: z.string().trim().min(1).max(500).describe("The whole question, clear on its own"),
	header: z
		.string()
		.trim()
		.min(1)
		.max(MAX_HEADER_LENGTH)
		.describe('A label of a word or two for the question, as "Format" or "Audience"'),
	options: z
		.array(
			z.object({
				label: z
					.string()
					.trim()
					.min(1)
					.max(MAX_LABEL_LENGTH)
					.describe("The choice, in a few words"),
				description: z
					.string()
					.trim()
					.max(300)
					.optional()
					.describe("What the choice means, when its label does not say it"),
			}),
		)
		.min(2)
		.max(MAX_OPTIONS)
		.describe(
			`From 2 to ${MAX_OPTIONS} distinct choices. The user can always write an answer of their own, so add no "Other"`,
		),
	multiSelect: z
		.boolean()
		.default(false)
		.describe("True when the user may choose more than one option"),
});

export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).min(1).max(MAX_QUESTIONS);

// The agent's questions, at the end of its answer
export const questionPartSchema = z.object({
	type: z.literal("question"),
	id: z.string(),
	questions: questionsSchema,
});

export type QuestionPart = z.infer<typeof questionPartSchema>;

// The user's answer to a question: the options chosen and what they wrote instead, or besides
export const answerSchema = z.object({
	question: z.string().max(500),
	header: z.string().max(MAX_HEADER_LENGTH),
	selected: z.array(z.string().max(MAX_LABEL_LENGTH)).max(MAX_OPTIONS),
	other: z.string().trim().max(2000).optional(),
});

export type Answer = z.infer<typeof answerSchema>;

export const answersSchema = z.array(answerSchema).min(1).max(MAX_QUESTIONS);

// A user's message that answers the agent's questions
export const answersPartSchema = z.object({
	type: z.literal("answers"),
	answers: answersSchema,
});

export type AnswersPart = z.infer<typeof answersPartSchema>;

// An answer with what the user wrote only when they wrote something
function cleanAnswer(answer: Answer): Answer {
	const { other: written, ...rest } = answer;
	const other = written?.trim();
	const selected = [...new Set(answer.selected)];

	return { ...rest, selected, ...(other && { other }) };
}

const answerCount = (answer: Answer) => answer.selected.length + (answer.other ? 1 : 0);

/**
 * The answers to the questions of a test, which keeps no messages: each one
 * says something.
 */
export function readTestAnswers(answers: Answer[]): Answer[] {
	const cleaned = answers.map(cleanAnswer);

	if (cleaned.some((answer) => answerCount(answer) === 0)) {
		throw new Error("Every question needs an answer");
	}

	return cleaned;
}

/**
 * The answers checked against the questions they answer, in the same order:
 * each with options of its question, a single one, or a text of the user's,
 * when only one may be chosen. The questions keep their own words.
 */
export function readAnswers(questions: Question[], answers: Answer[]): Answer[] {
	if (answers.length !== questions.length) {
		throw new Error("Every question needs an answer");
	}

	return questions.map((question, index) => {
		const answer = cleanAnswer({
			...(answers[index] ?? { selected: [] }),
			question: question.question,
			header: question.header,
		});
		const labels = question.options.map(({ label }) => label);
		const count = answerCount(answer);

		if (!answer.selected.every((label) => labels.includes(label))) {
			throw new Error(`An answer to "${question.header}" is not one of its options`);
		}

		if (count === 0 || (!question.multiSelect && count > 1)) {
			throw new Error(
				question.multiSelect
					? `"${question.header}" needs an answer`
					: `"${question.header}" takes one answer`,
			);
		}

		return answer;
	});
}

export const answerText = (answer: Answer) =>
	[...answer.selected, ...(answer.other ? [answer.other] : [])].join("; ");

export const ANSWERS_HEADING = "The user answered your questions.";

// The answers as the agent reads them, after the questions it asked
export const answersPrompt = (answers: Answer[]) =>
	[
		ANSWERS_HEADING,
		...answers.map((answer) => `## ${answer.question}\n${answerText(answer)}`),
	].join("\n\n");

// The answers in short, one line per question: the conversation's title
export const answersSummary = (answers: Answer[]) =>
	answers.map((answer) => `${answer.header}: ${answerText(answer)}`).join("\n");

// The questions as the conversation's text keeps them, for a pod that starts without its state
export const questionsText = (questions: Question[]) =>
	[
		"I asked you:",
		...questions.map(
			(question) =>
				`${question.question}\n${question.options.map(({ label }) => `- ${label}`).join("\n")}`,
		),
	].join("\n\n");

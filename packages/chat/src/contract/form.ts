/**
 * The form an agent can start from instead of the chat's text box: the fields
 * the user fills in and the informative texts between them. Only Zod here:
 * the browser checks the form with the same rules.
 */
import { z } from "zod";

// The types of field, in the order the editor offers them; the informative text comes last
export const FORM_FIELD_TYPES = [
	"text",
	"multilineText",
	"select",
	"multiSelect",
	"number",
	"email",
	"checkbox",
	"date",
	"file",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

// Not a product limit: only against a form without end
export const MAX_FORM_ELEMENTS = 200;
export const MAX_FORM_OPTIONS = 200;
export const MAX_FORM_TEXT_LENGTH = 100_000;
const MAX_INFO_LENGTH = 100_000;

const elementIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const fieldBase = {
	id: elementIdSchema,
	name: z.string().trim().min(1).max(255),
	// What the agent does with the value; the user filling in never sees it
	description: z.string().trim().max(2000).nullable(),
	required: z.boolean(),
};

// An extension with its dot, as .pdf
export const fileTypeSchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^\.[a-z0-9]{1,16}$/);

export const formFieldSchema = z.union([
	z.object({
		...fieldBase,
		type: z.enum(["text", "multilineText", "number", "email", "checkbox", "date"]),
	}),
	z.object({
		...fieldBase,
		type: z.enum(["select", "multiSelect"]),
		options: z.array(z.string().trim().min(1).max(255)).min(1).max(MAX_FORM_OPTIONS),
	}),
	z.object({
		...fieldBase,
		type: z.literal("file"),
		// Empty: any file
		fileTypes: z.array(fileTypeSchema).max(100),
	}),
]);

// Between the fields, for the user only: HTML of the editor, sanitized by the server
export const formInfoSchema = z.object({
	id: elementIdSchema,
	type: z.literal("info"),
	html: z.string().max(MAX_INFO_LENGTH),
});

export const formElementSchema = z.union([formFieldSchema, formInfoSchema]);

export const formElementsSchema = z
	.array(formElementSchema)
	.max(MAX_FORM_ELEMENTS)
	.refine((elements) => new Set(elements.map(({ id }) => id)).size === elements.length, {
		message: "Two elements of the form have the same id",
	});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormElement = z.infer<typeof formElementSchema>;

export const isFormField = (element: FormElement): element is FormField => element.type !== "info";

// What the user filling in gets: the agent's notes stay on the server
export const publicFormElements = (elements: FormElement[]): FormElement[] =>
	elements.map((element) => (isFormField(element) ? { ...element, description: null } : element));

/**
 * The value of each field: text, number, yes or no, the chosen options, or
 * the names of the files attached to the message.
 */
export const formValueSchema = z
	.union([
		z.string().max(MAX_FORM_TEXT_LENGTH),
		z.number(),
		z.boolean(),
		z.array(z.string().max(1000)).max(MAX_FORM_OPTIONS),
	])
	.nullable();

export const formValuesSchema = z.record(elementIdSchema, formValueSchema);

export type FormValue = z.infer<typeof formValueSchema>;
export type FormValues = z.infer<typeof formValuesSchema>;

// The result of an agent with a form: a chat that goes on, or only its files
export const FORM_RESULTS = ["chat", "files"] as const;

export type FormResult = (typeof FORM_RESULTS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isDate = (value: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const extensionOf = (name: string) => {
	const dot = name.lastIndexOf(".");

	return dot > 0 ? name.slice(dot).toLowerCase() : "";
};

export type FormProblem = "required" | "invalid";

const isEmpty = (value: FormValue | undefined) =>
	value === undefined ||
	value === null ||
	value === false ||
	(typeof value === "string" && !value.trim()) ||
	(Array.isArray(value) && !value.length);

// Why a field's value is not accepted, or null when it is
export function checkFormField(field: FormField, value: FormValue | undefined): FormProblem | null {
	if (isEmpty(value)) {
		return field.required ? "required" : null;
	}

	switch (field.type) {
		case "text":
		case "multilineText":
			return typeof value === "string" ? null : "invalid";
		case "email":
			return typeof value === "string" && EMAIL.test(value.trim()) ? null : "invalid";
		case "date":
			return typeof value === "string" && isDate(value) ? null : "invalid";
		case "number":
			return typeof value === "number" && Number.isFinite(value) ? null : "invalid";
		case "checkbox":
			return typeof value === "boolean" ? null : "invalid";
		case "select":
			return typeof value === "string" && field.options.includes(value) ? null : "invalid";
		case "multiSelect":
			return Array.isArray(value) && value.every((option) => field.options.includes(option))
				? null
				: "invalid";
		case "file":
			return Array.isArray(value) &&
				(!field.fileTypes.length ||
					value.every((name) => field.fileTypes.includes(extensionOf(name))))
				? null
				: "invalid";
	}
}

/**
 * The values of a sent form, checked against its fields: only the fields'
 * values, empty ones as null, and every attached file named by one file
 * field. Throws when a value is not accepted.
 */
export function readFormValues(
	elements: FormElement[],
	values: FormValues,
	attachmentNames: string[],
): FormValues {
	const read: FormValues = {};
	const claimed: string[] = [];

	for (const field of elements.filter(isFormField)) {
		const value = values[field.id];
		const problem = checkFormField(field, value);

		if (problem) {
			throw new Error(`The field "${field.name}" is ${problem}`);
		}

		read[field.id] =
			field.type === "checkbox"
				? value === true
				: isEmpty(value)
					? null
					: typeof value === "string"
						? value.trim()
						: (value ?? null);

		if (field.type === "file" && Array.isArray(value)) {
			claimed.push(...value);
		}
	}

	if (
		claimed.length !== attachmentNames.length ||
		new Set(claimed).size !== claimed.length ||
		!claimed.every((name) => attachmentNames.includes(name))
	) {
		throw new Error("The files do not match the form's file fields");
	}

	return read;
}

// The form as the user sent it, kept in the message: fields, values and the result
export const formPartSchema = z.object({
	type: z.literal("form"),
	result: z.enum(FORM_RESULTS),
	elements: z.array(formElementSchema),
	values: formValuesSchema,
});

export type FormPart = z.infer<typeof formPartSchema>;

const valueText = (field: FormField, value: FormValue | undefined) => {
	if (field.type === "checkbox") {
		return value === true ? "Yes" : "No";
	}

	if (isEmpty(value)) {
		return "(not filled in)";
	}

	if (Array.isArray(value)) {
		return value.join(", ");
	}

	return String(value);
};

// The agent never asks with only files as the result: nobody reads its messages
const FILES_RESULT = `The user sees only the files you save for them, not your messages: there is no chat to answer. Do not ask the user anything: work with what this form gives you.`;

/**
 * The form as the agent reads it: each field with what to do with it and its
 * value; files by name, as the message attaches them. The informative texts
 * are for the user only.
 */
export function formPrompt(part: Pick<FormPart, "elements" | "values" | "result">) {
	const fields = part.elements.filter(isFormField).map((field) => {
		const lines = [`## ${field.name}`];

		if (field.description) {
			lines.push(`What to do with it: ${field.description}`);
		}

		lines.push(
			field.type === "file"
				? `Files: ${valueText(field, part.values[field.id])}`
				: `Value: ${valueText(field, part.values[field.id])}`,
		);

		return lines.join("\n");
	});

	return [
		"The user filled in your form. Each field says what to do with its value.",
		...fields,
		...(part.result === "files" ? [FILES_RESULT] : []),
	].join("\n\n");
}

// The form's values as a short text, for the conversation's title
export function formSummary(part: Pick<FormPart, "elements" | "values">) {
	return part.elements
		.filter(isFormField)
		.flatMap((field) => {
			const value = part.values[field.id];

			return isEmpty(value) || field.type === "checkbox"
				? []
				: [`${field.name}: ${valueText(field, value)}`];
		})
		.join("\n");
}

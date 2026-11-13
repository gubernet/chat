import { describe, expect, it } from "vitest";

import {
	checkFormField,
	type FormElement,
	formElementsSchema,
	formPrompt,
	formSummary,
	publicFormElements,
	readFormValues,
} from "./form";

const elements: FormElement[] = [
	{
		id: "company",
		type: "text",
		name: "Nome dell'azienda",
		description: "Usalo nell'intestazione del report",
		required: true,
	},
	{ id: "intro", type: "info", html: "<p>Allega la privacy policy in PDF.</p>" },
	{
		id: "sector",
		type: "multiSelect",
		name: "Settore",
		description: null,
		required: false,
		options: ["Legale", "Finanza", "Sanità"],
	},
	{
		id: "policy",
		type: "file",
		name: "Privacy policy",
		description: "Il documento da analizzare",
		required: true,
		fileTypes: [".pdf"],
	},
	{ id: "consent", type: "checkbox", name: "Accetto", description: null, required: false },
];

describe("agent forms", () => {
	it("checks each type of field", () => {
		const field = (type: "email" | "date" | "number") =>
			({ id: "x", type, name: "X", description: null, required: true }) as const;

		expect(checkFormField(field("email"), "mario@acme.it")).toBeNull();
		expect(checkFormField(field("email"), "mario")).toBe("invalid");
		expect(checkFormField(field("date"), "2026-11-12")).toBeNull();
		expect(checkFormField(field("date"), "12/11/2026")).toBe("invalid");
		expect(checkFormField(field("number"), 3.5)).toBeNull();
		expect(checkFormField(field("number"), Number.NaN)).toBe("invalid");
		expect(checkFormField(field("number"), null)).toBe("required");
		// A required checkbox must be ticked
		expect(
			checkFormField(
				{ id: "c", type: "checkbox", name: "C", description: null, required: true },
				false,
			),
		).toBe("required");
	});

	it("reads the values of a sent form, every file named by a file field", () => {
		expect(
			readFormValues(
				elements,
				{ company: "  Acme  ", sector: ["Legale"], policy: ["policy.pdf"], other: "x" },
				["policy.pdf"],
			),
		).toEqual({ company: "Acme", sector: ["Legale"], policy: ["policy.pdf"], consent: false });
	});

	it("refuses missing values, unknown options, wrong file types and stray files", () => {
		expect(() => readFormValues(elements, { policy: ["policy.pdf"] }, ["policy.pdf"])).toThrow(
			"Nome dell'azienda",
		);
		expect(() =>
			readFormValues(
				elements,
				{ company: "Acme", sector: ["Altro"], policy: ["policy.pdf"] },
				["policy.pdf"],
			),
		).toThrow("Settore");
		expect(() =>
			readFormValues(elements, { company: "Acme", policy: ["policy.docx"] }, ["policy.docx"]),
		).toThrow("Privacy policy");
		expect(() =>
			readFormValues(elements, { company: "Acme", policy: ["policy.pdf"] }, [
				"policy.pdf",
				"altro.pdf",
			]),
		).toThrow("file fields");
	});

	it("gives the agent each field with what to do with it, never the informative texts", () => {
		const prompt = formPrompt({
			elements,
			values: { company: "Acme", sector: null, policy: ["policy.pdf"], consent: true },
			result: "chat",
		});

		expect(prompt).toContain(
			"## Nome dell'azienda\nWhat to do with it: Usalo nell'intestazione del report\nValue: Acme",
		);
		expect(prompt).toContain("## Settore\nValue: (not filled in)");
		expect(prompt).toContain(
			"## Privacy policy\nWhat to do with it: Il documento da analizzare\nFiles: policy.pdf",
		);
		expect(prompt).toContain("## Accetto\nValue: Yes");
		expect(prompt).not.toContain("Allega la privacy policy");
		expect(prompt).not.toContain("Do not ask the user");
	});

	it("tells the agent not to ask when the result is only files", () => {
		expect(formPrompt({ elements, values: {}, result: "files" })).toContain(
			"Do not ask the user anything",
		);
	});

	it("keeps the agent's notes from the user filling in, and sums up the values for a title", () => {
		expect(
			publicFormElements(elements).every(
				(element) => !("description" in element) || element.description === null,
			),
		).toBe(true);
		expect(
			formSummary({ elements, values: { company: "Acme", sector: ["Legale", "Finanza"] } }),
		).toBe("Nome dell'azienda: Acme\nSettore: Legale, Finanza");
	});

	it("refuses two elements with the same id", () => {
		expect(formElementsSchema.safeParse([elements[0], elements[0]]).success).toBe(false);
	});
});

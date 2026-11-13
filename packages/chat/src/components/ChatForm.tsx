"use client";

import { FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";

import {
	checkFormField,
	extensionOf,
	type FormElement,
	type FormField,
	type FormProblem,
	type FormValue,
	type FormValues,
	isFormField,
} from "../contract/form";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_MESSAGE } from "../contract/limits";
import { useTranslations } from "../i18n/intl";
import { useNotify } from "../lib/notify";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../ui/cn";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { richTextClasses } from "../ui/rich-text";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

// A file of a file field: new, to upload, or kept from the message sent before
interface FormFile {
	name: string;
	file?: File;
}

/**
 * The form sent: the values, with the file fields naming their files, the new
 * files to upload and the names of the files kept from the earlier message.
 */
export interface ChatFormSubmission {
	values: FormValues;
	files: File[];
	kept: string[];
}

// A field's value as the inputs hold it: numbers as typed
type Draft = Record<string, FormValue | undefined>;

function initialDraft(elements: FormElement[], values: FormValues | undefined): Draft {
	const draft: Draft = {};

	for (const field of elements.filter(isFormField)) {
		const value = values?.[field.id];

		draft[field.id] =
			field.type === "number" && typeof value === "number" ? String(value) : value;
	}

	return draft;
}

function initialFiles(elements: FormElement[], values: FormValues | undefined) {
	const files: Record<string, FormFile[]> = {};

	for (const field of elements.filter(isFormField)) {
		const value = values?.[field.id];

		if (field.type === "file" && Array.isArray(value)) {
			files[field.id] = value.map((name) => ({ name }));
		}
	}

	return files;
}

// A name not taken yet by another file of the message: two files never share one
function uniqueName(name: string, taken: Set<string>) {
	if (!taken.has(name)) {
		return name;
	}

	const extension = extensionOf(name);
	const base = extension ? name.slice(0, -extension.length) : name;

	for (let index = 2; ; index++) {
		const candidate = `${base} (${index})${extension}`;

		if (!taken.has(candidate)) {
			return candidate;
		}
	}
}

// The value as checked and sent: a number from what was typed
function valueOf(field: FormField, draft: FormValue | undefined, files: FormFile[]): FormValue {
	if (field.type === "file") {
		return files.map(({ name }) => name);
	}

	if (field.type === "number") {
		if (typeof draft !== "string" || !draft.trim()) {
			return null;
		}

		const number = Number(draft.replace(",", "."));

		return Number.isFinite(number) ? number : Number.NaN;
	}

	if (field.type === "checkbox") {
		return draft === true;
	}

	return draft ?? null;
}

/**
 * An agent's form: the fields to fill in, the informative texts between them.
 * Read-only, it shows a form already sent with its values.
 */
export function ChatForm({
	elements,
	values,
	readOnly = false,
	disabled = false,
	submitLabel,
	onSubmit,
	onCancel,
	actions,
	className,
}: {
	elements: FormElement[];
	values?: FormValues;
	readOnly?: boolean;
	disabled?: boolean;
	submitLabel?: string;
	onSubmit?: (submission: ChatFormSubmission) => void;
	onCancel?: () => void;
	// More buttons beside the submit one
	actions?: ReactNode;
	className?: string;
}) {
	const t = useTranslations("chat.form");
	const notify = useNotify();
	const idPrefix = useId();
	const [draft, setDraft] = useState(() => initialDraft(elements, values));
	const [files, setFiles] = useState(() => initialFiles(elements, values));
	const [problems, setProblems] = useState<Record<string, FormProblem>>({});
	const fields = elements.filter(isFormField);

	const change = (id: string, value: FormValue) => {
		setDraft((current) => ({ ...current, [id]: value }));
		setProblems(({ [id]: _solved, ...rest }) => rest);
	};

	const addFiles = (field: Extract<FormField, { type: "file" }>, picked: File[]) => {
		const total = Object.values(files).flat().length;
		const accepted: File[] = [];

		for (const file of picked) {
			if (file.size > MAX_ATTACHMENT_BYTES) {
				notify({ title: t("fileTooLarge", { name: file.name }), type: "error" });
			} else if (
				field.fileTypes.length &&
				!field.fileTypes.includes(extensionOf(file.name))
			) {
				notify({ title: t("fileTypeNotAccepted", { name: file.name }), type: "error" });
			} else if (total + accepted.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
				notify({
					title: t("tooManyFiles", { max: MAX_ATTACHMENTS_PER_MESSAGE }),
					type: "error",
				});
				break;
			} else {
				accepted.push(file);
			}
		}

		setFiles((current) => {
			const taken = new Set(
				Object.values(current).flatMap((list) => list.map(({ name }) => name)),
			);
			const added = accepted.map((file) => {
				const name = uniqueName(file.name, taken);

				taken.add(name);

				return {
					name,
					file: name === file.name ? file : new File([file], name, { type: file.type }),
				};
			});

			return { ...current, [field.id]: [...(current[field.id] ?? []), ...added] };
		});
		setProblems(({ [field.id]: _solved, ...rest }) => rest);
	};

	const removeFile = (fieldId: string, name: string) =>
		setFiles((current) => ({
			...current,
			[fieldId]: (current[fieldId] ?? []).filter((file) => file.name !== name),
		}));

	const submit = () => {
		const read: FormValues = {};
		const found: Record<string, FormProblem> = {};

		for (const field of fields) {
			const value = valueOf(field, draft[field.id], files[field.id] ?? []);
			const problem = checkFormField(field, value);

			if (problem) {
				found[field.id] = problem;
			}

			read[field.id] = value;
		}

		setProblems(found);

		if (Object.keys(found).length) {
			return;
		}

		const all = Object.values(files).flat();

		onSubmit?.({
			values: read,
			files: all.flatMap(({ file }) => (file ? [file] : [])),
			kept: all.flatMap(({ name, file }) => (file ? [] : [name])),
		});
	};

	return (
		<form
			className={cn("flex flex-col gap-5", className)}
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			{elements.map((element) => {
				if (!isFormField(element)) {
					return (
						<div
							key={element.id}
							className={richTextClasses}
							// Sanitized by the server when the agent was saved
							// oxlint-disable-next-line react/no-danger
							dangerouslySetInnerHTML={{ __html: element.html }}
						/>
					);
				}

				const id = `${idPrefix}-${element.id}`;
				const problem = problems[element.id];

				return (
					<div key={element.id} className="grid gap-2">
						{element.type !== "checkbox" && (
							<Label htmlFor={id}>
								{element.name}
								{element.required && !readOnly && (
									<span className="text-destructive" aria-hidden>
										{" *"}
									</span>
								)}
							</Label>
						)}
						<FieldInput
							id={id}
							field={element}
							value={draft[element.id]}
							files={files[element.id] ?? []}
							readOnly={readOnly}
							disabled={disabled}
							invalid={Boolean(problem)}
							onChange={(value) => change(element.id, value)}
							onAddFiles={(picked) =>
								element.type === "file" && addFiles(element, picked)
							}
							onRemoveFile={(name) => removeFile(element.id, name)}
						/>
						{problem && (
							<p className="text-xs text-destructive" role="alert">
								{t(problem)}
							</p>
						)}
					</div>
				);
			})}
			{!readOnly && (
				<div className="flex flex-wrap items-center justify-end gap-2">
					{actions}
					{onCancel && (
						<Button type="button" variant="ghost" onClick={onCancel}>
							{t("cancel")}
						</Button>
					)}
					<Button type="submit" variant="primary" disabled={disabled}>
						{submitLabel ?? t("send")}
					</Button>
				</div>
			)}
		</form>
	);
}

// Read-only, the inputs look as they were filled in
const shown = "disabled:opacity-100 disabled:cursor-default";

function FieldInput({
	id,
	field,
	value,
	files,
	readOnly,
	disabled,
	invalid,
	onChange,
	onAddFiles,
	onRemoveFile,
}: {
	id: string;
	field: FormField;
	value: FormValue | undefined;
	files: FormFile[];
	readOnly: boolean;
	disabled: boolean;
	invalid: boolean;
	onChange: (value: FormValue) => void;
	onAddFiles: (files: File[]) => void;
	onRemoveFile: (name: string) => void;
}) {
	const t = useTranslations("chat.form");
	const fileInput = useRef<HTMLInputElement>(null);
	const text = typeof value === "string" ? value : "";
	const common = {
		id,
		readOnly,
		disabled,
		"aria-invalid": invalid || undefined,
		"aria-required": field.required || undefined,
	};

	switch (field.type) {
		case "text":
		case "email":
		case "date":
		case "number":
			return (
				<Input
					{...common}
					type={field.type === "number" ? "text" : field.type}
					inputMode={field.type === "number" ? "decimal" : undefined}
					value={text}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case "multilineText":
			return (
				<Textarea
					{...common}
					rows={4}
					value={text}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case "checkbox":
			return (
				<div className="flex items-center gap-2">
					<Checkbox
						id={id}
						checked={value === true}
						onCheckedChange={(checked) => onChange(checked)}
						disabled={readOnly || disabled}
						className={shown}
						aria-invalid={invalid || undefined}
					/>
					<Label htmlFor={id}>
						{field.name}
						{field.required && !readOnly && (
							<span className="text-destructive" aria-hidden>
								{" *"}
							</span>
						)}
					</Label>
				</div>
			);
		case "select":
		case "multiSelect": {
			const items = field.options.map((option) => ({ value: option, label: option }));
			const selected =
				field.type === "multiSelect" ? (Array.isArray(value) ? value : []) : null;

			return (
				<Select
					items={items}
					multiple={field.type === "multiSelect"}
					value={selected ?? (text || null)}
					onValueChange={(next) =>
						onChange(
							Array.isArray(next) ? next : typeof next === "string" ? next : null,
						)
					}
					disabled={readOnly || disabled}
				>
					<SelectTrigger id={id} className={shown} aria-invalid={invalid || undefined}>
						<SelectValue placeholder={t("choose")}>
							{selected ? selected.join(", ") || t("choose") : undefined}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{field.options.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		}
		case "file":
			return (
				<div className="flex flex-wrap items-center gap-2">
					{files.map((file) => (
						<span
							key={file.name}
							className="flex max-w-full items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs"
						>
							<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="max-w-48 truncate">{file.name}</span>
							{!readOnly && (
								<button
									type="button"
									className="rounded-full text-muted-foreground hover:text-foreground"
									onClick={() => onRemoveFile(file.name)}
									aria-label={t("removeFile", { name: file.name })}
									disabled={disabled}
								>
									<XIcon className="size-3.5" />
								</button>
							)}
						</span>
					))}
					{!readOnly && (
						<>
							<Button
								id={id}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInput.current?.click()}
								disabled={disabled}
								aria-invalid={invalid || undefined}
							>
								<PaperclipIcon className="size-4" />
								{t("addFiles")}
							</Button>
							<input
								ref={fileInput}
								type="file"
								multiple
								hidden
								accept={field.fileTypes.join(",") || undefined}
								onChange={(event) => {
									onAddFiles([...(event.target.files ?? [])]);
									event.target.value = "";
								}}
							/>
						</>
					)}
					{readOnly && !files.length && (
						<span className="text-sm text-muted-foreground">{t("noFile")}</span>
					)}
				</div>
			);
	}
}

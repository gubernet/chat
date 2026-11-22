"use client";

import type { ToolApprovalResponse } from "@assistant-ui/react";
import { BanIcon, CheckIcon, ClockIcon } from "lucide-react";
import { useId, useState } from "react";

import { useTranslations } from "../i18n/intl";
import type { ChatStep } from "../lib/messages";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../ui/cn";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { MarkdownDocument } from "./MarkdownText";

type Confirmation = NonNullable<ChatStep["confirmation"]>;

// A text this long, or on more lines, is shown as it reads, with its source to edit
const LONG_TEXT = 120;

type Field =
	| { name: string; kind: "text"; long: boolean; value: string }
	| { name: string; kind: "number"; value: string }
	| { name: string; kind: "boolean"; value: boolean }
	// Lists, objects and empty values, edited as JSON
	| { name: string; kind: "json"; value: string };

function fieldOf(name: string, value: unknown): Field {
	if (typeof value === "string") {
		return {
			name,
			kind: "text",
			long: value.length > LONG_TEXT || value.includes("\n"),
			value,
		};
	}

	if (typeof value === "number") {
		return { name, kind: "number", value: String(value) };
	}

	if (typeof value === "boolean") {
		return { name, kind: "boolean", value };
	}

	return { name, kind: "json", value: JSON.stringify(value ?? null, null, 2) };
}

// What a field sends, or why it cannot
function valueOf(field: Field): { value: unknown } | { error: "number" | "json" } {
	switch (field.kind) {
		case "text":
		case "boolean":
			return { value: field.value };
		case "number": {
			const value = Number(field.value);

			return field.value.trim() !== "" && Number.isFinite(value)
				? { value }
				: { error: "number" };
		}
		case "json":
			try {
				return { value: JSON.parse(field.value) as unknown };
			} catch {
				return { error: "json" };
			}
	}
}

const shown = (value: unknown) =>
	typeof value === "string" ? value : JSON.stringify(value, null, 2);

/**
 * A write tool waiting for the user: what the tool does and the values the
 * agent chose, which the user may change before allowing the call.
 */
export function ChatConfirmation({
	tool,
	confirmation,
	respondToApproval,
}: {
	tool: string;
	confirmation: Confirmation;
	respondToApproval: (response: ToolApprovalResponse) => Promise<void>;
}) {
	const t = useTranslations("chat.confirmation");
	const idPrefix = useId();
	const [fields, setFields] = useState(() =>
		Object.entries(confirmation.input).map(([name, value]) => fieldOf(name, value)),
	);
	const [answer, setAnswer] = useState<boolean | null>(null);
	const results = fields.map(valueOf);
	const isValid = results.every((result) => "value" in result);

	const change = (index: number, field: Field) =>
		setFields((current) => current.map((item, at) => (at === index ? field : item)));

	const respond = async (approved: boolean) => {
		const values = Object.fromEntries(
			fields.map((field, index) => {
				const result = results[index];

				return [field.name, result && "value" in result ? result.value : null];
			}),
		);
		// The call goes with the agent's values unless the user changed them
		const changed = JSON.stringify(values) !== JSON.stringify(confirmation.input);

		setAnswer(approved);

		try {
			await respondToApproval(
				approved && changed ? { approved, text: JSON.stringify(values) } : { approved },
			);
		} catch {
			// The buttons stay usable to try again
			setAnswer(null);
		}
	};

	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium">{t("title", { tool })}</p>
				{confirmation.description && (
					<p className="text-xs text-muted-foreground">{confirmation.description}</p>
				)}
			</div>
			{fields.map((field, index) => {
				const result = results[index];

				return (
					<ConfirmationField
						key={field.name}
						id={`${idPrefix}-${index}`}
						field={field}
						error={result && "error" in result ? t(`errors.${result.error}`) : null}
						disabled={answer !== null}
						onChange={(next) => change(index, next)}
					/>
				);
			})}
			<div className="flex justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => void respond(false)}
					disabled={answer !== null}
					loading={answer === false}
				>
					{t("refuse")}
				</Button>
				<Button
					variant="primary"
					size="sm"
					onClick={() => void respond(true)}
					disabled={answer !== null || !isValid}
					loading={answer === true}
				>
					{t("allow")}
				</Button>
			</div>
		</div>
	);
}

function ConfirmationField({
	id,
	field,
	error,
	disabled,
	onChange,
}: {
	id: string;
	field: Field;
	error: string | null;
	disabled: boolean;
	onChange: (field: Field) => void;
}) {
	const t = useTranslations("chat.confirmation");
	// A long text shows first as it reads
	const [source, setSource] = useState(false);

	if (field.kind === "boolean") {
		return (
			<div className="flex items-center gap-2">
				<Checkbox
					id={id}
					checked={field.value}
					disabled={disabled}
					onCheckedChange={(checked) => onChange({ ...field, value: checked })}
				/>
				<Label htmlFor={id} className="font-mono text-xs">
					{field.name}
				</Label>
			</div>
		);
	}

	const isLong = field.kind === "text" && field.long;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id} className="font-mono text-xs text-muted-foreground">
					{field.name}
				</Label>
				{isLong && (
					<div className="flex gap-1 text-xs">
						{([false, true] as const).map((isSource) => (
							<button
								key={String(isSource)}
								type="button"
								onClick={() => setSource(isSource)}
								aria-pressed={source === isSource}
								className={cn(
									"rounded-md px-2 py-0.5 text-muted-foreground hover:text-foreground",
									source === isSource && "bg-muted text-foreground",
								)}
							>
								{t(isSource ? "source" : "preview")}
							</button>
						))}
					</div>
				)}
			</div>
			{isLong && !source ? (
				<div id={id} className="max-h-64 overflow-auto rounded-xl border">
					<MarkdownDocument text={field.value} className="p-3" />
				</div>
			) : field.kind === "text" && !field.long ? (
				<Input
					id={id}
					value={field.value}
					disabled={disabled}
					onChange={(event) => onChange({ ...field, value: event.target.value })}
					className="h-8 text-sm"
				/>
			) : field.kind === "number" ? (
				<Input
					id={id}
					type="number"
					inputMode="decimal"
					value={field.value}
					disabled={disabled}
					onChange={(event) => onChange({ ...field, value: event.target.value })}
					aria-invalid={error !== null}
					className="h-8 text-sm"
				/>
			) : (
				<Textarea
					id={id}
					value={field.value}
					disabled={disabled}
					rows={field.kind === "json" ? 4 : 8}
					onChange={(event) => onChange({ ...field, value: event.target.value })}
					aria-invalid={error !== null}
					className={cn(field.kind === "json" && "font-mono text-xs")}
				/>
			)}
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}

/**
 * A write tool once answered: allowed, with the values the call went with,
 * refused, or expired with nobody answering. It stays in the conversation.
 */
export function ChatConfirmationOutcome({ confirmation }: { confirmation: Confirmation }) {
	const t = useTranslations("chat.confirmation");
	const values = confirmation.values ?? confirmation.input;
	const outcome = confirmation.expired
		? "expired"
		: confirmation.approved
			? confirmation.values
				? "allowedChanged"
				: "allowed"
			: "refused";
	const Icon = outcome === "expired" ? ClockIcon : outcome === "refused" ? BanIcon : CheckIcon;

	return (
		<div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-xs">
			<p className="flex items-center gap-1.5 font-medium">
				<Icon
					className={cn(
						"size-3.5 shrink-0",
						outcome === "allowed" || outcome === "allowedChanged"
							? "text-success"
							: "text-muted-foreground",
					)}
				/>
				{t(`outcomes.${outcome}`)}
			</p>
			{confirmation.approved && !confirmation.expired && Object.keys(values).length > 0 && (
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
					{Object.entries(values).map(([name, value]) => (
						<div key={name} className="contents">
							<dt className="font-mono text-muted-foreground">{name}</dt>
							<dd className="line-clamp-4 break-words whitespace-pre-wrap">
								{shown(value)}
							</dd>
						</div>
					))}
				</dl>
			)}
		</div>
	);
}

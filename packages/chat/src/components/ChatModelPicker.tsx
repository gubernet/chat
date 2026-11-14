"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import type { ChatAgentModel } from "../client/client";
import { useTranslations } from "../i18n/intl";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { chatComposerInput } from "./ChatComposer";

/**
 * The model of the chat, in the bar on top: it opens on the agent's models the
 * budgets leave. While it is locked, or without a model to choose, it doesn't open.
 */
export function ChatModelPicker({
	models,
	modelCode,
	onModelChange,
	locked,
}: {
	models: ChatAgentModel[];
	modelCode: string;
	onModelChange: (code: string) => void;
	locked: boolean;
}) {
	const t = useTranslations("chat.controls");
	// The budgets may leave only some of the agent's models for now, or none
	const availableModels = models.filter(({ available }) => available);
	const model = availableModels.find(({ code }) => code === modelCode);
	const modelName = model?.name ?? (models.length ? t("noModel") : modelCode);
	// The cost bar shows the model under the pointer, otherwise the chosen one
	const [highlighted, setHighlighted] = useState<string | null>(null);
	const shownModel = availableModels.find(({ code }) => code === (highlighted ?? modelCode));

	return (
		<DropdownMenu
			disabled={locked || !availableModels.length}
			onItemHighlighted={(item) => setHighlighted(item?.dataset.model ?? null)}
		>
			<DropdownMenuTrigger
				render={
					// Always the same button: when it can't be used it only doesn't open
					<Button
						variant="ghost"
						className="h-10 gap-2 rounded-xl px-2.5 text-sm font-normal disabled:opacity-100 [&>svg]:mr-0"
					>
						<span className="max-w-40 truncate">{modelName}</span>
						<ChevronDownIcon className="size-4 text-muted-foreground" />
					</Button>
				}
			/>
			<DropdownMenuContent
				align="start"
				// Wide enough for the four bands of the cost bar
				className="w-80"
				finalFocus={chatComposerInput}
			>
				<DropdownMenuRadioGroup
					value={modelCode}
					onValueChange={(value) => onModelChange(String(value))}
				>
					{availableModels.map((item) => (
						<DropdownMenuRadioItem
							key={item.code}
							value={item.code}
							data-model={item.code}
							closeOnClick
						>
							<span className="truncate">{item.name}</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<ModelCostBar
					level={shownModel?.costLevel ?? null}
					className="-mx-2 mt-2 -mb-2 px-5"
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// The four bands, a quarter of the bar each, with the colours of their part of it
const LEVELS = [
	{ key: "low", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
	{ key: "moderate", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
	{ key: "high", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
	{ key: "veryHigh", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
] as const;

/**
 * At the foot of the model picker, how expensive a model is next to the
 * others, from 0 to 1: only an indication, without the prices. Without a
 * model the bar stays, with no marker and no band.
 */
function ModelCostBar({ level, className }: { level: number | null; className?: string }) {
	const t = useTranslations("chat.modelCost");
	const band = level === null ? null : LEVELS[Math.min(Math.floor(level * 4), 3)];

	return (
		<div className={cn("grid gap-2 border-t px-3 py-2.5", className)}>
			<span className="text-xs text-muted-foreground">{t("title")}</span>
			{band && level !== null && (
				<meter
					className="sr-only"
					min={0}
					max={1}
					value={level}
					aria-label={t("title")}
					aria-valuetext={t(`levels.${band.key}`)}
				/>
			)}
			<div
				aria-hidden
				className="relative h-1 rounded-full"
				style={{
					background:
						"linear-gradient(to right, #10b981, #facc15 35%, #f97316 60%, #f43f5e 80%, #a855f7)",
				}}
			>
				{band && level !== null && (
					<span
						className={cn(
							"absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-popover transition-[left]",
							band.dot,
						)}
						style={{ left: `${level * 100}%` }}
					/>
				)}
			</div>
			<div aria-hidden className="flex justify-between gap-3 text-xs whitespace-nowrap">
				{LEVELS.map((item) => (
					// All bold, only the colour changes: nothing moves
					<span
						key={item.key}
						className={cn(
							"font-semibold",
							item === band ? item.text : "text-muted-foreground",
						)}
					>
						{t(`levels.${item.key}`)}
					</span>
				))}
			</div>
		</div>
	);
}

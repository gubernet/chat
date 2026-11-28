"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";

import { type ChatAgentModel, CHAT_EFFORT_LEVELS, type ChatEffortLevel } from "../client/client";
import { useTranslations } from "../i18n/intl";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { chatComposerInput } from "./ChatComposer";

const rank = (level: ChatEffortLevel) => CHAT_EFFORT_LEVELS.indexOf(level);

/**
 * The level the chat shows with a model: the one the user chose, brought among
 * the model's levels, or the one the conversation starts from.
 */
export function chatEffortValue(
	effort: ChatAgentModel["effort"],
	chosen: ChatEffortLevel | null,
): ChatEffortLevel | null {
	const first = effort?.levels[0];
	const last = effort?.levels[effort.levels.length - 1];

	if (!chosen || !first || !last) {
		return effort?.start ?? null;
	}

	if (rank(chosen) < rank(first)) {
		return first;
	}

	return rank(chosen) > rank(last) ? last : chosen;
}

/**
 * The reasoning level of the chat, next to its model: the levels the agent
 * leaves on with the model, when they make a difference to it.
 */
export function ChatEffortPicker({
	levels,
	value,
	onChange,
	locked,
}: {
	levels: ChatEffortLevel[];
	value: ChatEffortLevel | null;
	onChange: (level: ChatEffortLevel) => void;
	locked: boolean;
}) {
	const t = useTranslations("chat.effort");

	if (levels.length < 2) {
		return null;
	}

	return (
		<DropdownMenu disabled={locked}>
			<DropdownMenuTrigger
				render={
					// Always the same button: when it can't be used it only doesn't open
					<Button
						variant="ghost"
						aria-label={t("label")}
						className="h-10 gap-2 rounded-xl px-2.5 text-sm font-normal disabled:opacity-100 [&>svg]:mr-0"
					>
						<BrainIcon className="size-4 text-muted-foreground" />
						<span className="text-xs">{value ? t(`levels.${value}`) : t("label")}</span>
						<ChevronDownIcon className="size-4 text-muted-foreground" />
					</Button>
				}
			/>
			<DropdownMenuContent align="start" finalFocus={chatComposerInput}>
				<DropdownMenuRadioGroup
					value={value ?? ""}
					onValueChange={(next) => {
						const level = levels.find((item) => item === next);

						if (level) {
							onChange(level);
						}
					}}
				>
					{levels.map((level) => (
						<DropdownMenuRadioItem key={level} value={level} closeOnClick>
							{t(`levels.${level}`)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

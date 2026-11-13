"use client";

import { MessageSquareQuoteIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTranslations } from "../i18n/intl";
import { cellRange, columnName } from "../lib/references";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";

// A table shows its first rows: the whole file is a download away
const MAX_ROWS = 500;

export interface ChatSheet {
	name: string;
	rows: string[][];
}

interface Cell {
	row: number;
	column: number;
}

/**
 * The sheets of a file as tables, with the letters and numbers of a
 * spreadsheet: the cells selected, by dragging, with shift or on a row or
 * column, become a range to ask the agent about.
 */
export function ChatSheetView({
	sheets,
	named,
	onAsk,
}: {
	sheets: ChatSheet[];
	// An Excel file names its sheet in the range; a CSV has none
	named: boolean;
	// Without a chat to ask, nothing to ask about
	onAsk?: (range: string) => void;
}) {
	const t = useTranslations("chat.preview");
	const [sheetIndex, setSheetIndex] = useState(0);
	const [selection, setSelection] = useState<{ anchor: Cell; focus: Cell } | null>(null);
	const dragging = useRef(false);

	useEffect(() => {
		const stop = () => {
			dragging.current = false;
		};

		window.addEventListener("pointerup", stop);
		return () => window.removeEventListener("pointerup", stop);
	}, []);

	const sheet = sheets[sheetIndex] ?? sheets[0];
	const allRows = sheet?.rows ?? [];
	const rows = allRows.slice(0, MAX_ROWS);
	const columns = Math.max(0, ...rows.map((row) => row.length));

	const select = (anchor: Cell, focus: Cell = anchor) => setSelection({ anchor, focus });

	const isSelected = (row: number, column: number) =>
		selection !== null &&
		row >= Math.min(selection.anchor.row, selection.focus.row) &&
		row <= Math.max(selection.anchor.row, selection.focus.row) &&
		column >= Math.min(selection.anchor.column, selection.focus.column) &&
		column <= Math.max(selection.anchor.column, selection.focus.column);

	const range =
		selection && sheet
			? cellRange(selection.anchor, selection.focus, named ? sheet.name : undefined)
			: null;

	return (
		<div className="flex flex-col gap-3 p-4">
			{sheets.length > 1 && (
				<div className="flex flex-wrap gap-1" role="tablist" aria-label={t("sheets")}>
					{sheets.map(({ name }, index) => (
						<Button
							key={name}
							variant={index === sheetIndex ? "secondary" : "ghost"}
							size="sm"
							role="tab"
							aria-selected={index === sheetIndex}
							onClick={() => {
								setSheetIndex(index);
								setSelection(null);
							}}
						>
							{name}
						</Button>
					))}
				</div>
			)}
			<div className="overflow-x-auto select-none">
				<table className="border-collapse text-xs">
					<thead>
						<tr>
							<td className="border bg-muted" aria-hidden />
							{Array.from({ length: columns }, (_, column) => (
								<th key={column} className="border bg-muted p-0 font-normal">
									<button
										type="button"
										className="w-full px-2 py-0.5 text-muted-foreground hover:text-foreground"
										onClick={() =>
											select(
												{ row: 0, column },
												{ row: Math.max(0, allRows.length - 1), column },
											)
										}
									>
										{columnName(column)}
									</button>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, rowIndex) => (
							// oxlint-disable-next-line react/no-array-index-key -- the rows of a file have no identity
							<tr
								key={rowIndex}
								className={rowIndex === 0 ? "font-medium" : undefined}
							>
								<th className="border bg-muted p-0 font-normal">
									<button
										type="button"
										className="w-full px-2 py-0.5 text-end text-muted-foreground tabular-nums hover:text-foreground"
										onClick={() =>
											select(
												{ row: rowIndex, column: 0 },
												{ row: rowIndex, column: Math.max(0, columns - 1) },
											)
										}
									>
										{rowIndex + 1}
									</button>
								</th>
								{Array.from({ length: columns }, (_, column) => (
									<td
										// oxlint-disable-next-line react/no-array-index-key -- nor have its cells
										key={column}
										className={cn(
											"border px-2 py-1 whitespace-nowrap",
											isSelected(rowIndex, column) && "bg-primary/10",
										)}
										onPointerDown={(event) => {
											const cell = { row: rowIndex, column };

											if (event.shiftKey && selection) {
												select(selection.anchor, cell);
											} else {
												select(cell);
											}

											dragging.current = event.pointerType === "mouse";
										}}
										onPointerEnter={() => {
											if (dragging.current && selection) {
												select(selection.anchor, { row: rowIndex, column });
											}
										}}
									>
										{row[column] ?? ""}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{allRows.length > MAX_ROWS && (
				<p className="text-xs text-muted-foreground">
					{t("truncated", { count: MAX_ROWS })}
				</p>
			)}
			{range && onAsk && (
				<div className="sticky bottom-4 flex justify-center">
					<div className="flex items-center gap-2 rounded-full border bg-background py-1 ps-3 pe-1 text-xs shadow-md">
						<span className="font-mono">{range}</span>
						<Button
							size="sm"
							className="rounded-full"
							onClick={() => {
								onAsk(range);
								setSelection(null);
							}}
						>
							<MessageSquareQuoteIcon className="size-4" />
							{t("askCells")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

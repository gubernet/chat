/**
 * A reference to a part of a delivered file (a page, a slide, a passage, some
 * cells) travels as a quote at the top of the user's message: the agent reads
 * it as text, the conversation keeps it with the message, and the chat shows
 * it apart from what the user wrote.
 */

// A passage longer than this is cut: the agent finds the rest in the file
const MAX_PASSAGE_LENGTH = 500;

// The selected text on one line, cut to a readable length
export function passageOf(selection: string) {
	const text = selection.replace(/\s+/g, " ").trim();

	return text.length > MAX_PASSAGE_LENGTH ? `${text.slice(0, MAX_PASSAGE_LENGTH)}…` : text;
}

// A, B, … Z, AA, AB: the column letters of a sheet, from 0
export function columnName(index: number) {
	let name = "";

	for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
		name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
	}

	return name;
}

/**
 * The cells between two corners, from 0, as a spreadsheet names them: B3, or
 * B3:D7, after the sheet's name when given.
 */
export function cellRange(
	from: { row: number; column: number },
	to: { row: number; column: number },
	sheet?: string,
) {
	const top = Math.min(from.row, to.row);
	const bottom = Math.max(from.row, to.row);
	const left = Math.min(from.column, to.column);
	const right = Math.max(from.column, to.column);
	const start = `${columnName(left)}${top + 1}`;
	const end = `${columnName(right)}${bottom + 1}`;
	const range = start === end ? start : `${start}:${end}`;

	if (sheet === undefined) {
		return range;
	}

	// A name with spaces or symbols goes in quotes, its own quotes doubled
	const name = /^[\p{L}\p{N}_]+$/u.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`;

	return `${name}!${range}`;
}

// The message as sent: the quote's lines first, then what the user wrote
export function joinQuote(quote: string | undefined, text: string) {
	if (!quote) {
		return text;
	}

	const lines = quote
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");

	return text ? `${lines}\n\n${text}` : lines;
}

// The quote at the top of a sent message, apart from the rest
export function splitQuote(text: string): { quote: string | null; text: string } {
	const lines = text.split("\n");
	let count = 0;

	while (count < lines.length && lines[count]?.startsWith(">")) {
		count++;
	}

	// A quote ends the message or a blank line closes it
	if (count === 0 || (count < lines.length && lines[count] !== "")) {
		return { quote: null, text };
	}

	return {
		quote: lines
			.slice(0, count)
			.map((line) => line.replace(/^> ?/, ""))
			.join("\n"),
		text: lines.slice(count + 1).join("\n"),
	};
}

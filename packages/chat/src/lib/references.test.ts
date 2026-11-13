import { describe, expect, it } from "vitest";

import { createUserMessage, toThreadMessage } from "./messages";
import { cellRange, columnName, joinQuote, passageOf, splitQuote } from "./references";

describe("references to a file", () => {
	it("names the cells as a spreadsheet does", () => {
		expect([0, 1, 25, 26, 27, 701, 702].map(columnName)).toEqual([
			"A",
			"B",
			"Z",
			"AA",
			"AB",
			"ZZ",
			"AAA",
		]);
		expect(cellRange({ row: 6, column: 3 }, { row: 2, column: 1 })).toBe("B3:D7");
		expect(cellRange({ row: 0, column: 0 }, { row: 0, column: 0 }, "Foglio1")).toBe(
			"Foglio1!A1",
		);
		expect(cellRange({ row: 1, column: 0 }, { row: 4, column: 2 }, "Vendite 2026")).toBe(
			"'Vendite 2026'!A2:C5",
		);
		expect(cellRange({ row: 0, column: 0 }, { row: 1, column: 0 }, "L'anno")).toBe(
			"'L''anno'!A1:A2",
		);
	});

	it("keeps a passage on one line and cuts a long one", () => {
		expect(passageOf("  Il minimo\n  è 2.897 €.  ")).toBe("Il minimo è 2.897 €.");
		expect(passageOf("x".repeat(600))).toBe(`${"x".repeat(500)}…`);
	});

	it("puts the quote at the top of the message and takes it back", () => {
		const quote = "report.docx · pagina 2\n«Il minimo è 2.897 €.»";
		const sent = joinQuote(quote, "Aggiorna la cifra");

		expect(sent).toBe(
			"> report.docx · pagina 2\n> «Il minimo è 2.897 €.»\n\nAggiorna la cifra",
		);
		expect(splitQuote(sent)).toEqual({ quote, text: "Aggiorna la cifra" });
		expect(splitQuote(joinQuote(quote, ""))).toEqual({ quote, text: "" });
		expect(joinQuote(undefined, "Ciao")).toBe("Ciao");
	});

	it("leaves a message without a closed quote as it is", () => {
		expect(splitQuote("Ciao")).toEqual({ quote: null, text: "Ciao" });
		expect(splitQuote("> una riga\nsubito testo")).toEqual({
			quote: null,
			text: "> una riga\nsubito testo",
		});
	});

	it("shows the quote of a sent message apart from its text", () => {
		const message = toThreadMessage(
			createUserMessage("user-1", "> dati.xlsx · Foglio1!B3:D7\n\nFai la somma", []),
		);

		expect(message.content).toEqual([{ type: "text", text: "Fai la somma" }]);
		expect(message.metadata?.custom?.quote).toEqual({
			text: "dati.xlsx · Foglio1!B3:D7",
			messageId: "user-1",
		});
	});
});

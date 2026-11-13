import { describe, expect, it } from "vitest";

import type { ChatFile } from "./messages";
import { hasPreview, previewOf } from "./preview";

const file = (name: string, mimeType: string, previewUrl?: string): ChatFile => ({
	id: "file-1",
	name,
	mimeType,
	size: 1_000,
	url: "https://app.example.com/api/conversations/c1/files/file-1",
	...(previewUrl && { previewUrl }),
});

const WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const SLIDES = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const PREVIEW = "https://app.example.com/api/conversations/c1/files/file-1/preview";

describe("the preview of a file", () => {
	it("shows a Word document as the PDF made of it, a presentation as slides", () => {
		expect(previewOf(file("Contratto.docx", WORD, PREVIEW))).toEqual({
			kind: "pdf",
			url: PREVIEW,
			unit: "page",
		});
		expect(previewOf(file("Offerta.pptx", SLIDES, PREVIEW))).toEqual({
			kind: "pdf",
			url: PREVIEW,
			unit: "slide",
		});
	});

	it("has none for a file the chat cannot show, which only downloads", () => {
		// A Word document whose PDF was not made
		expect(hasPreview(file("Contratto.docx", WORD))).toBe(false);
		expect(hasPreview(file("Archivio.zip", "application/zip"))).toBe(false);
		expect(hasPreview(file("Vecchio.xls", "application/vnd.ms-excel"))).toBe(false);
	});

	it("shows images, PDFs, sheets and text", () => {
		for (const [name, mimeType] of [
			["Foto.png", "image/png"],
			["Report.pdf", "application/pdf"],
			["Dati.csv", "text/csv"],
			["Dati.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
			["Note.md", "text/markdown"],
			["Pagina.html", "text/html"],
			["script.py", "application/octet-stream"],
		] as const) {
			expect(hasPreview(file(name, mimeType)), name).toBe(true);
		}
	});
});

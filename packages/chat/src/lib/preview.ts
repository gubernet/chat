import type { ChatFile } from "./messages";

const TEXT_EXTENSIONS = new Set([
	"txt",
	"json",
	"xml",
	"yaml",
	"yml",
	"log",
	"py",
	"js",
	"ts",
	"sql",
	"css",
]);

// The presentations, whose PDF pages are slides
const SLIDE_EXTENSIONS = new Set(["ppt", "pptx", "odp"]);

// The files the chat reads in the browser before showing them
export type LoadedPreviewKind = "csv" | "spreadsheet" | "text" | "markdown" | "html";

export type Preview =
	| { kind: "image"; url: string }
	| { kind: "pdf"; url: string; unit: "page" | "slide" }
	| { kind: LoadedPreviewKind }
	| { kind: "none" };

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/**
 * How a file shows: images as they are, PDFs, Word documents and slides as
 * the PDF made of them, sheets as tables, text as it reads. None for a file
 * the chat cannot show.
 */
export function previewOf(file: ChatFile): Preview {
	const extension = extensionOf(file.name);

	if (file.mimeType.startsWith("image/")) {
		return { kind: "image", url: file.url };
	}

	if (file.mimeType === "application/pdf" || extension === "pdf") {
		return { kind: "pdf", url: file.url, unit: "page" };
	}

	if (file.previewUrl) {
		return {
			kind: "pdf",
			url: file.previewUrl,
			unit: SLIDE_EXTENSIONS.has(extension) ? "slide" : "page",
		};
	}

	if (extension === "csv" || file.mimeType === "text/csv") {
		return { kind: "csv" };
	}

	if (extension === "xlsx") {
		return { kind: "spreadsheet" };
	}

	if (extension === "md" || extension === "markdown" || file.mimeType === "text/markdown") {
		return { kind: "markdown" };
	}

	if (extension === "html" || extension === "htm" || file.mimeType === "text/html") {
		return { kind: "html" };
	}

	if (file.mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(extension)) {
		return { kind: "text" };
	}

	return { kind: "none" };
}

// Whether the chat can show the file: one it cannot only downloads, and never opens the preview
export const hasPreview = (file: ChatFile) => previewOf(file).kind !== "none";

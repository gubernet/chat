"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import { DownloadIcon, FileIcon, Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react";
import Papa from "papaparse";
import {
	createContext,
	lazy,
	type ReactNode,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import readXlsxFile from "read-excel-file/browser";

import { useFormatter, useTranslations } from "../i18n/intl";
import { FILE_SIZE_FORMAT } from "../lib/file-size";
import type { ChatFile } from "../lib/messages";
import { type LoadedPreviewKind, previewOf } from "../lib/preview";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { chatComposerInput } from "./ChatComposer";
import type { PdfReference } from "./ChatPdfView";
import { type ChatSheet, ChatSheetView } from "./ChatSheetView";
import { MarkdownDocument } from "./MarkdownText";

// PDF.js loads only when a PDF opens, and never in the server's render
const ChatPdfView = lazy(() => import("./ChatPdfView"));

const ChatPreviewContext = createContext<{
	// Null where the chat has no preview: its files download
	open: ((file: ChatFile) => void) | null;
}>({ open: null });

export const useChatPreview = () => useContext(ChatPreviewContext);

/**
 * When the agent delivers a new version of the open file, with the same name,
 * the preview moves to it; the files the chat already had stay where they are.
 */
function useNewVersions(file: ChatFile | null, open: (file: ChatFile) => void) {
	const messages = useAuiState((s) => s.thread.messages);
	const seen = useRef<Set<string> | null>(null);
	const files = useMemo(
		() =>
			messages.flatMap((message) =>
				message.content.flatMap((part) =>
					part.type === "data" && part.name === "file" ? [part.data as ChatFile] : [],
				),
			),
		[messages],
	);
	const name = file?.name;

	useEffect(() => {
		const known = seen.current;

		seen.current = new Set(files.map(({ id }) => id));

		const newer = known
			? files.filter(({ id, name: other }) => !known.has(id) && other === name).pop()
			: undefined;

		if (newer) {
			open(newer);
		}
	}, [files, name, open]);
}

/**
 * The chat with the preview of a file the agent delivered beside it: on the
 * right on a wide screen, over the chat on a phone or in full screen. Without
 * the preview, as in an agent's test, the files only download.
 */
export function ChatPreviewLayout({
	children,
	enabled = true,
}: {
	children: ReactNode;
	enabled?: boolean;
}) {
	const [file, setFile] = useState<ChatFile | null>(null);

	useNewVersions(enabled ? file : null, setFile);

	return (
		<ChatPreviewContext.Provider value={{ open: enabled ? setFile : null }}>
			<div className="flex h-full min-h-0 bg-background text-foreground">
				<div className="min-w-0 flex-1">{children}</div>
				{enabled && file && (
					<ChatPreviewPanel key={file.id} file={file} onClose={() => setFile(null)} />
				)}
			</div>
		</ChatPreviewContext.Provider>
	);
}

function ChatPreviewPanel({ file, onClose }: { file: ChatFile; onClose: () => void }) {
	return <ChatFilePreview file={file} onClose={onClose} />;
}

/**
 * A file the agent delivered, as it reads, with its download: beside the
 * chat, where a page, a passage or cells can be asked about, or filling the
 * place it is given, as the files of an elaborato, without a chat to ask.
 */
export function ChatFilePreview({
	file,
	onClose,
	embedded = false,
}: {
	file: ChatFile;
	onClose?: () => void;
	embedded?: boolean;
}) {
	const t = useTranslations("chat.preview");
	const format = useFormatter();
	const aui = useAui();
	const preview = previewOf(file);
	const [fullScreen, setFullScreen] = useState(false);
	// Markdown and HTML show as they read, or as their code
	const [showCode, setShowCode] = useState(false);
	const hasCode = preview.kind === "markdown" || preview.kind === "html";

	// The part of the file goes above the composer, for the user to say what to change
	const ask = (reference: string) => {
		aui.thread().composer().setQuote({ text: reference, messageId: file.id });
		setFullScreen(false);

		// On a phone the preview covers the chat
		if (window.matchMedia("(max-width: 767px)").matches) {
			onClose?.();
		}

		chatComposerInput()?.focus();
	};

	const askPdf = (unit: "page" | "slide", { page, passage }: PdfReference) => {
		const where = t(unit === "slide" ? "slideOf" : "pageOf", { name: file.name, number: page });

		ask(passage ? `${where}\n${t("passage", { text: passage })}` : where);
	};

	return (
		<aside
			className={cn(
				"flex flex-col bg-background",
				fullScreen || !embedded ? "fixed inset-0 z-50" : "min-h-0 flex-1",
				!fullScreen &&
					!embedded &&
					"md:static md:inset-auto md:z-auto md:w-[min(50%,40rem)] md:shrink-0 md:border-s",
			)}
			aria-label={file.name}
		>
			<header className="flex items-center gap-1 border-b px-4 py-2">
				<p className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</p>
				{hasCode && (
					<fieldset className="m-0 me-1 flex min-w-0 gap-0.5 border-0 p-0">
						<legend className="sr-only">{t("view")}</legend>
						{[false, true].map((code) => (
							<Button
								key={String(code)}
								variant={showCode === code ? "secondary" : "ghost"}
								size="sm"
								aria-pressed={showCode === code}
								onClick={() => setShowCode(code)}
							>
								{t(code ? "code" : "rendered")}
							</Button>
						))}
					</fieldset>
				)}
				{preview.kind !== "none" && (
					<Button
						variant="ghost"
						size="icon"
						className={cn(!embedded && "max-md:hidden")}
						onClick={() => setFullScreen((current) => !current)}
						aria-label={t(fullScreen ? "exitFullScreen" : "fullScreen")}
						title={t(fullScreen ? "exitFullScreen" : "fullScreen")}
					>
						{fullScreen ? (
							<Minimize2Icon className="size-4" />
						) : (
							<Maximize2Icon className="size-4" />
						)}
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("download")}
					title={t("download")}
					render={({ children, ...props }) => (
						<a {...props} href={file.url} download={file.name}>
							{children}
						</a>
					)}
				>
					<DownloadIcon className="size-4" />
				</Button>
				{onClose && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label={t("close")}
						title={t("close")}
					>
						<XIcon className="size-4" />
					</Button>
				)}
			</header>
			<div className="min-h-0 flex-1 overflow-auto">
				{preview.kind === "image" && (
					<img src={preview.url} alt={file.name} className="mx-auto max-w-full p-4" />
				)}
				{preview.kind === "pdf" && (
					<Suspense fallback={<Message>{t("loading")}</Message>}>
						<ChatPdfView
							url={preview.url}
							unit={preview.unit}
							onAsk={
								embedded
									? undefined
									: (reference) => askPdf(preview.unit, reference)
							}
						/>
					</Suspense>
				)}
				{(preview.kind === "csv" ||
					preview.kind === "spreadsheet" ||
					preview.kind === "text" ||
					preview.kind === "markdown" ||
					preview.kind === "html") && (
					<LoadedPreview
						file={file}
						kind={preview.kind}
						showCode={showCode}
						onAskCells={
							embedded
								? undefined
								: (range) => ask(t("cellsOf", { name: file.name, range }))
						}
					/>
				)}
				{/* Only where the files are the page, as an elaborato's: the file itself, to download */}
				{preview.kind === "none" && (
					<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
						<FileIcon className="size-8 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium break-all">{file.name}</p>
							<p className="text-xs text-muted-foreground">
								{format.number(file.size / 1024, FILE_SIZE_FORMAT)}
							</p>
						</div>
						<Button
							variant="primary"
							render={({ children, ...props }) => (
								<a {...props} href={file.url} download={file.name}>
									{children}
								</a>
							)}
						>
							<DownloadIcon className="size-4" />
							{t("download")}
						</Button>
					</div>
				)}
			</div>
		</aside>
	);
}

function Message({ children }: { children: ReactNode }) {
	return <p className="p-6 text-sm text-muted-foreground">{children}</p>;
}

type Content =
	| { state: "loading" }
	| { state: "failed" }
	| { state: "text"; text: string }
	| { state: "table"; sheets: ChatSheet[] };

const cellText = (value: unknown) => {
	if (value instanceof Date) {
		return value.toLocaleDateString();
	}

	return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
		? String(value)
		: "";
};

// The files read in the browser: tables, text, Markdown and HTML
function LoadedPreview({
	file,
	kind,
	showCode,
	onAskCells,
}: {
	file: ChatFile;
	kind: LoadedPreviewKind;
	showCode: boolean;
	onAskCells?: (range: string) => void;
}) {
	const t = useTranslations("chat.preview");
	const [content, setContent] = useState<Content>({ state: "loading" });

	useEffect(() => {
		const controller = new AbortController();

		void (async () => {
			try {
				const response = await fetch(file.url, { signal: controller.signal });

				if (!response.ok) {
					throw new Error(`The file answered ${response.status}`);
				}

				if (kind === "spreadsheet") {
					const sheets = await readXlsxFile(await response.blob());

					setContent({
						state: "table",
						sheets: sheets.map(({ sheet: name, data }) => ({
							name,
							rows: data.map((row) => row.map(cellText)),
						})),
					});
				} else if (kind === "csv") {
					const { data } = Papa.parse<string[]>(await response.text(), {
						skipEmptyLines: true,
					});

					setContent({ state: "table", sheets: [{ name: file.name, rows: data }] });
				} else {
					setContent({ state: "text", text: await response.text() });
				}
			} catch {
				if (!controller.signal.aborted) {
					setContent({ state: "failed" });
				}
			}
		})();

		return () => controller.abort();
	}, [file.url, file.name, kind]);

	if (content.state === "loading") {
		return <Message>{t("loading")}</Message>;
	}

	if (content.state === "failed") {
		return <Message>{t("failed")}</Message>;
	}

	if (content.state === "table") {
		return (
			<ChatSheetView
				sheets={content.sheets}
				named={kind === "spreadsheet"}
				onAsk={onAskCells}
			/>
		);
	}

	if (kind === "markdown" && !showCode) {
		return <MarkdownDocument text={content.text} />;
	}

	// The page runs apart from the app: no cookies, no access to the chat
	if (kind === "html" && !showCode) {
		return (
			<iframe
				srcDoc={content.text}
				sandbox="allow-scripts"
				title={file.name}
				className="size-full border-0 bg-white"
			/>
		);
	}

	return (
		<pre className="p-4 font-mono text-xs break-words whitespace-pre-wrap">{content.text}</pre>
	);
}

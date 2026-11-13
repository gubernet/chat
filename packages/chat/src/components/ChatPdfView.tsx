"use client";

import { MessageSquareQuoteIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTranslations } from "use-intl";

import { passageOf } from "../lib/references";
import { Button } from "../ui/button";

// Set here, where the pages are drawn, as React-PDF asks
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

// Wider pages would only be harder to read, in full screen
const MAX_PAGE_WIDTH = 960;

// A page is drawn when it comes this near: a long document opens at once
const DRAW_MARGIN = "1200px";

export type PdfReference = { page: number; passage?: string };

/**
 * A PDF drawn page by page with PDF.js, the same in every browser: each page or
 * slide, and any text selected on it, can be asked about.
 */
export default function ChatPdfView({
	url,
	unit,
	onAsk,
}: {
	url: string;
	// A presentation's pages are its slides
	unit: "page" | "slide";
	// Without a chat to ask, nothing to ask about
	onAsk?: (reference: PdfReference) => void;
}) {
	const t = useTranslations("chat.preview");
	const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
	const pagesRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [pages, setPages] = useState(0);
	// Height over width, from the first page, for the pages not drawn yet
	const [ratio, setRatio] = useState(Math.SQRT2);
	const [selected, setSelected] = useState<Required<PdfReference> | null>(null);

	// The pages fill the panel, also when it goes full screen
	useEffect(() => {
		const element = pagesRef.current;

		if (!element) {
			return;
		}

		const observer = new ResizeObserver(([entry]) => {
			if (entry) {
				setWidth(Math.min(MAX_PAGE_WIDTH, Math.floor(entry.contentRect.width)));
			}
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	// Text selected on a page becomes a passage to ask about
	useEffect(() => {
		const onChange = () => {
			const selection = document.getSelection();
			const node = selection?.anchorNode;
			const element = node instanceof Element ? node : node?.parentElement;
			const page = element?.closest<HTMLElement>("[data-page-number]");
			const passage = selection?.isCollapsed === false ? passageOf(selection.toString()) : "";

			setSelected(
				page && passage && pagesRef.current?.contains(page)
					? { page: Number(page.dataset.pageNumber), passage }
					: null,
			);
		};

		document.addEventListener("selectionchange", onChange);
		return () => document.removeEventListener("selectionchange", onChange);
	}, []);

	const askSelected = () => {
		if (selected && onAsk) {
			onAsk(selected);
			document.getSelection()?.removeAllRanges();
		}
	};

	return (
		<div ref={setScroller} className="h-full overflow-auto bg-muted/40">
			<div ref={pagesRef} className="flex flex-col items-center gap-4 p-4">
				<Document
					file={url}
					onLoadSuccess={(pdf) => {
						setPages(pdf.numPages);
						void pdf.getPage(1).then((page) => {
							const viewport = page.getViewport({ scale: 1 });

							setRatio(viewport.height / viewport.width);
						});
					}}
					loading={<p className="p-2 text-sm text-muted-foreground">{t("loading")}</p>}
					error={<p className="p-2 text-sm text-muted-foreground">{t("failed")}</p>}
					className="flex flex-col gap-4"
				>
					{width > 0 &&
						Array.from({ length: pages }, (_, index) => (
							<PdfPage
								key={index}
								number={index + 1}
								width={width}
								ratio={ratio}
								scroller={scroller}
								label={t(unit, { number: index + 1 })}
								askLabel={t(unit === "slide" ? "askSlide" : "askPage")}
								onAsk={onAsk && (() => onAsk({ page: index + 1 }))}
							/>
						))}
				</Document>
			</div>
			{selected && onAsk && (
				<div className="sticky bottom-4 flex justify-center">
					<Button
						size="sm"
						className="rounded-full shadow-md"
						// Before the click takes the selection away
						onPointerDown={(event) => {
							event.preventDefault();
							askSelected();
						}}
						onClick={askSelected}
					>
						<MessageSquareQuoteIcon className="size-4" />
						{t("askPassage")}
					</Button>
				</div>
			)}
		</div>
	);
}

function PdfPage({
	number,
	width,
	ratio,
	scroller,
	label,
	askLabel,
	onAsk,
}: {
	number: number;
	width: number;
	ratio: number;
	scroller: HTMLElement | null;
	label: string;
	askLabel: string;
	onAsk?: () => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [near, setNear] = useState(false);

	useEffect(() => {
		const element = ref.current;

		if (!element || !scroller || near) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setNear(true);
				}
			},
			{ root: scroller, rootMargin: DRAW_MARGIN },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [scroller, near]);

	const blank = (
		<div style={{ width, height: Math.round(width * ratio) }} className="bg-background" />
	);

	return (
		<div ref={ref} className="flex flex-col gap-1">
			<div className="overflow-hidden rounded-sm bg-background shadow-sm">
				{near ? (
					<Page
						pageNumber={number}
						width={width}
						renderAnnotationLayer={false}
						loading={blank}
					/>
				) : (
					blank
				)}
			</div>
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span className="tabular-nums">{label}</span>
				{onAsk && (
					<Button variant="ghost" size="sm" onClick={onAsk}>
						<MessageSquareQuoteIcon className="size-4" />
						{askLabel}
					</Button>
				)}
			</div>
		</div>
	);
}

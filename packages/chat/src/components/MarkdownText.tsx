"use client";

import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { memo } from "react";
import { Streamdown, type StreamdownProps } from "streamdown";

import { cn } from "../ui/cn";

// Coloured code, formulas and diagrams, also while the answer streams
const plugins = { code, math, mermaid };

// Copy on the code blocks and the diagrams in full screen; tables stay plain
const controls = { code: true, table: false, mermaid: { fullscreen: true } };

// Links open in a new tab, as they always did, without a confirmation
const linkSafety = { enabled: false };

// The text keeps the chat's own type; code blocks and diagrams are Streamdown's
const components: NonNullable<StreamdownProps["components"]> = {
	h1: ({ className, children, ...props }) => (
		<h1 className={cn("mt-5 mb-2 text-lg font-semibold first:mt-0", className)} {...props}>
			{children}
		</h1>
	),
	h2: ({ className, children, ...props }) => (
		<h2 className={cn("mt-5 mb-2 text-base font-semibold first:mt-0", className)} {...props}>
			{children}
		</h2>
	),
	h3: ({ className, children, ...props }) => (
		<h3 className={cn("mt-4 mb-1.5 font-semibold first:mt-0", className)} {...props}>
			{children}
		</h3>
	),
	p: ({ className, ...props }) => (
		<p className={cn("my-3 leading-relaxed first:mt-0 last:mb-0", className)} {...props} />
	),
	a: ({ className, children, ...props }) => (
		<a
			className={cn("text-primary underline underline-offset-2", className)}
			target="_blank"
			rel="noreferrer"
			{...props}
		>
			{children}
		</a>
	),
	blockquote: ({ className, ...props }) => (
		<blockquote
			className={cn("my-3 border-s-2 ps-4 text-muted-foreground", className)}
			{...props}
		/>
	),
	ul: ({ className, ...props }) => (
		<ul className={cn("my-3 ms-5 list-disc [&>li]:mt-1", className)} {...props} />
	),
	ol: ({ className, ...props }) => (
		<ol className={cn("my-3 ms-5 list-decimal [&>li]:mt-1", className)} {...props} />
	),
	hr: ({ className, ...props }) => <hr className={cn("my-3", className)} {...props} />,
	table: ({ className, ...props }) => (
		<div className="my-3 overflow-x-auto">
			<table className={cn("w-full border-collapse text-sm", className)} {...props} />
		</div>
	),
	th: ({ className, ...props }) => (
		<th
			className={cn(
				"border bg-muted px-3 py-1.5 text-start font-medium [[align=right]]:text-right",
				className,
			)}
			{...props}
		/>
	),
	td: ({ className, ...props }) => (
		<td
			className={cn("border px-3 py-1.5 text-start [[align=right]]:text-right", className)}
			{...props}
		/>
	),
};

function MarkdownTextImpl() {
	return (
		<StreamdownTextPrimitive
			plugins={plugins}
			controls={controls}
			linkSafety={linkSafety}
			components={components}
			defer
		/>
	);
}

export const MarkdownText = memo(MarkdownTextImpl);

// A Markdown file the agent delivered, written as its answers are
export function MarkdownDocument({ text }: { text: string }) {
	return (
		<Streamdown
			mode="static"
			plugins={plugins}
			controls={controls}
			linkSafety={linkSafety}
			components={components}
			className="p-6 text-sm break-words"
		>
			{text}
		</Streamdown>
	);
}

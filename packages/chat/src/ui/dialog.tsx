"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { usePortalContainer } from "../lib/portal";
import { cn } from "./cn";

const Dialog = DialogPrimitive.Root;

const DialogOverlay = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) => (
	<DialogPrimitive.Backdrop
		className={cn(
			"fixed inset-0 z-50 bg-black/25 data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:animate-in data-[open]:fade-in-0",
			className,
		)}
		{...props}
	/>
);

const DialogContent = ({
	className,
	children,
	closeLabel,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & {
	// What the button that closes the dialog says to a screen reader
	closeLabel: string;
}) => (
	<DialogPrimitive.Portal container={usePortalContainer()}>
		<DialogOverlay />
		<DialogPrimitive.Popup
			className={cn(
				"data-[closed]:slide-out-to-left-1/2 data-[open]:slide-in-from-left-1/2 fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border bg-background p-6 text-foreground shadow-lg duration-200 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:slide-out-to-top-[48%] data-[closed]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:slide-in-from-top-[48%] data-[open]:zoom-in-95 md:w-full",
				className,
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close
				aria-label={closeLabel}
				className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[open]:bg-accent data-[open]:text-muted-foreground"
			>
				<XIcon className="size-4" />
			</DialogPrimitive.Close>
		</DialogPrimitive.Popup>
	</DialogPrimitive.Portal>
);

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
		{...props}
	/>
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
		{...props}
	/>
);

const DialogTitle = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
	<DialogPrimitive.Title
		className={cn("text-lg leading-none font-semibold tracking-tight", className)}
		{...props}
	/>
);

const DialogDescription = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
	<DialogPrimitive.Description
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
);

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };

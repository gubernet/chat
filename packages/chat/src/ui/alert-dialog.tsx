"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import * as React from "react";

import { usePortalContainer } from "../lib/portal";
import { buttonVariants } from "./button";
import { cn } from "./cn";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogOverlay = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Backdrop>) => (
	<AlertDialogPrimitive.Backdrop
		className={cn(
			"fixed inset-0 z-50 bg-black/25 data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:animate-in data-[open]:fade-in-0",
			className,
		)}
		{...props}
	/>
);

const AlertDialogContent = ({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Popup>) => (
	<AlertDialogPrimitive.Portal container={usePortalContainer()}>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Popup
			className={cn(
				"data-[closed]:slide-out-to-left-1/2 data-[open]:slide-in-from-left-1/2 fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-card p-6 text-card-foreground shadow-lg duration-200 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:slide-out-to-top-[48%] data-[closed]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:slide-in-from-top-[48%] data-[open]:zoom-in-95 sm:rounded-2xl",
				className,
			)}
			{...props}
		>
			{children}
		</AlertDialogPrimitive.Popup>
	</AlertDialogPrimitive.Portal>
);

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
		{...props}
	/>
);

const AlertDialogTitle = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) => (
	<AlertDialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />
);

const AlertDialogDescription = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) => (
	<AlertDialogPrimitive.Description
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
);

const AlertDialogCancel = ({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close>) => (
	<AlertDialogPrimitive.Close
		className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
		{...props}
	/>
);

export {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
};

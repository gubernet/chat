"use client";

import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { usePortalContainer } from "../lib/portal";
import { cn } from "./cn";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

type DropdownPositionerProps = React.ComponentProps<typeof DropdownMenuPrimitive.Positioner>;

const DropdownMenuContent = ({
	className,
	sideOffset = 4,
	side,
	align,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Popup> & {
	sideOffset?: number;
	side?: DropdownPositionerProps["side"];
	align?: DropdownPositionerProps["align"];
}) => (
	<DropdownMenuPrimitive.Portal container={usePortalContainer()}>
		<DropdownMenuPrimitive.Positioner
			className="z-50"
			sideOffset={sideOffset}
			side={side}
			align={align}
		>
			<DropdownMenuPrimitive.Popup
				className={cn(
					"z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl shadow-black/3",
					"data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					className,
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Positioner>
	</DropdownMenuPrimitive.Portal>
);

const DropdownMenuItem = ({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) => (
	<DropdownMenuPrimitive.Item
		className={cn(
			"relative flex cursor-default items-center rounded-md px-3 py-2 text-sm outline-hidden transition-colors select-none focus:bg-accent focus:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
			className,
		)}
		{...props}
	/>
);

const DropdownMenuRadioItem = ({
	className,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) => (
	<DropdownMenuPrimitive.RadioItem
		className={cn(
			"relative flex cursor-default items-center rounded-md py-2 pr-8 pl-3 text-sm outline-hidden transition-colors select-none focus:bg-accent focus:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[checked]:font-semibold",
			className,
		)}
		{...props}
	>
		<span className="absolute right-2 flex size-3.5 items-center justify-center">
			<DropdownMenuPrimitive.RadioItemIndicator>
				<CheckIcon className="size-4" />
			</DropdownMenuPrimitive.RadioItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
);

export {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
};

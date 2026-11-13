import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "./cn";

const alertVariants = cva(
	"relative w-full rounded-xl border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg]:size-4 [&>svg]:text-foreground [&>svg~*]:pl-6",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground",
				primary: "border-primary/20 bg-primary/10 text-primary [&>svg]:text-primary",
				error: "border-destructive/20 bg-destructive/10 text-destructive [&>svg]:text-destructive",
				success: "border-success/20 bg-success/10 text-success [&>svg]:text-success",
				warning: "border-warning/20 bg-warning/10 text-warning [&>svg]:text-warning",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const Alert = ({
	className,
	variant,
	...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) => (
	<div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
);

const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
	// oxlint-disable-next-line jsx_a11y/heading-has-content
	<h5
		className={cn("text-sm leading-tight font-semibold tracking-tight", className)}
		{...props}
	/>
);

const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
	<div className={cn("mt-1 text-sm [&_p]:leading-relaxed", className)} {...props} />
);

export { Alert, AlertDescription, AlertTitle };

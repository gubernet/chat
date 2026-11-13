import * as React from "react";

import { cn } from "./cn";

const Textarea = ({ className, ...props }: React.ComponentProps<"textarea">) => {
	return (
		<textarea
			className={cn(
				"flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
};

export { Textarea };

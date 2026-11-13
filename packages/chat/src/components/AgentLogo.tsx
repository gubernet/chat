import { BotIcon } from "lucide-react";

import { cn } from "../ui/cn";

const SIZES = {
	xs: "size-4 rounded",
	sm: "size-8 rounded-lg",
	md: "size-11 rounded-xl",
	lg: "size-16 rounded-2xl",
} as const;

// The agent's logo, a neutral mark without one
export function AgentLogo({
	agent,
	size,
	className,
}: {
	agent: { logoUrl: string | null };
	size: keyof typeof SIZES;
	className?: string;
}) {
	if (agent.logoUrl) {
		return (
			<img
				src={agent.logoUrl}
				alt=""
				className={cn("shrink-0 object-cover", SIZES[size], className)}
			/>
		);
	}

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center",
				size === "xs" ? "text-muted-foreground" : "border bg-muted",
				SIZES[size],
				className,
			)}
			aria-hidden="true"
		>
			<BotIcon className={size === "xs" ? "size-4" : "size-1/2 opacity-60"} />
		</span>
	);
}

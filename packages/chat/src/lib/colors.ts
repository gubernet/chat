import type { CSSProperties } from "react";

/**
 * The colours a chat can take without writing any: one hue each, for the
 * buttons and for what is selected, as dark as white text needs in the light
 * theme and as light as dark text needs in the dark one.
 */
export const CHAT_COLORS = [
	"blue",
	"indigo",
	"violet",
	"pink",
	"red",
	"orange",
	"green",
	"teal",
] as const;

export type ChatColor = (typeof CHAT_COLORS)[number];

const SHADES: Record<ChatColor, { light: string; dark: string }> = {
	blue: { light: "#2563eb", dark: "#60a5fa" },
	indigo: { light: "#4f46e5", dark: "#818cf8" },
	violet: { light: "#7c3aed", dark: "#a78bfa" },
	pink: { light: "#be185d", dark: "#f472b6" },
	red: { light: "#dc2626", dark: "#f87171" },
	orange: { light: "#c2410c", dark: "#fb923c" },
	green: { light: "#15803d", dark: "#4ade80" },
	teal: { light: "#0f766e", dark: "#2dd4bf" },
};

const TEXT = { light: "#ffffff", dark: "#0a0a0a" };

/**
 * The variables of a colour, for the element around the chat: both the
 * theme's own and those its classes read, which a page's stylesheet may have
 * already worked out above the chat.
 */
export function chatColorVariables(
	color: ChatColor | undefined,
	theme: "light" | "dark",
): Record<string, string> {
	if (!color) {
		return {};
	}

	const shade = SHADES[color][theme];
	const text = TEXT[theme];

	return {
		"--primary": shade,
		"--color-primary": shade,
		"--primary-foreground": text,
		"--color-primary-foreground": text,
		"--touch": shade,
		"--color-touch": shade,
		"--touch-foreground": text,
		"--color-touch-foreground": text,
	};
}

export const chatColorStyle = (color: ChatColor | undefined, theme: "light" | "dark") =>
	chatColorVariables(color, theme) as CSSProperties;

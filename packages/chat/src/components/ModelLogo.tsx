import chatglm from "@lobehub/icons-static-svg/icons/chatglm-color.svg";
import claude from "@lobehub/icons-static-svg/icons/claude-color.svg";
import deepseek from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import gemini from "@lobehub/icons-static-svg/icons/gemini-color.svg";
import mistral from "@lobehub/icons-static-svg/icons/mistral-color.svg";
import openai from "@lobehub/icons-static-svg/icons/openai.svg";
import qwen from "@lobehub/icons-static-svg/icons/qwen-color.svg";

import { cn } from "../ui/cn";

// The logos of LobeHub's icons (MIT), in colour where the brand has one: the
// build writes them into the chat's code, so an app has no image to serve
const LOGOS: Record<string, { src: string; monochrome: boolean }> = {
	claude: { src: claude, monochrome: false },
	gpt: { src: openai, monochrome: true },
	gemini: { src: gemini, monochrome: false },
	mistral: { src: mistral, monochrome: false },
	glm: { src: chatglm, monochrome: false },
	deepseek: { src: deepseek, monochrome: false },
	qwen: { src: qwen, monochrome: false },
};

/**
 * The logo of the family a model belongs to, small and bare; a black one turns
 * white on the dark theme. A family the chat doesn't know has none.
 */
export function ModelLogo({
	family,
	className,
}: {
	family: string | undefined;
	className?: string;
}) {
	const logo = family !== undefined && Object.hasOwn(LOGOS, family) ? LOGOS[family] : undefined;

	if (!logo) {
		return null;
	}

	return (
		<img
			src={logo.src}
			alt=""
			aria-hidden
			className={cn("size-4 shrink-0", logo.monochrome && "dark:invert", className)}
		/>
	);
}

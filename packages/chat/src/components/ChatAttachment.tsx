"use client";

import { AttachmentPrimitive, useAuiState } from "@assistant-ui/react";
import { FileIcon, XIcon } from "lucide-react";
import { useTranslations } from "use-intl";

export function ChatAttachment({ removable = false }: { removable?: boolean }) {
	const t = useTranslations("chat.composer");
	const name = useAuiState((s) => s.attachment.name);

	return (
		<AttachmentPrimitive.Root className="flex max-w-full items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs">
			<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="max-w-48 truncate">{name}</span>
			{removable && (
				<AttachmentPrimitive.Remove
					render={
						<button
							type="button"
							className="rounded-full text-muted-foreground hover:text-foreground"
							aria-label={t("removeAttachment", { name })}
						/>
					}
				>
					<XIcon className="size-3.5" />
				</AttachmentPrimitive.Remove>
			)}
		</AttachmentPrimitive.Root>
	);
}

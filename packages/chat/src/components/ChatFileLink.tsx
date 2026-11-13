"use client";

import { DownloadIcon, FileIcon } from "lucide-react";

import { useFormatter, useTranslations } from "../i18n/intl";
import { FILE_SIZE_FORMAT } from "../lib/file-size";
import type { ChatFile } from "../lib/messages";
import { hasPreview } from "../lib/preview";
import { useChatPreview } from "./ChatPreview";

/**
 * A file the agent delivered: it opens in the preview beside the chat and
 * downloads from its icon. A file of a type the chat cannot show, or where the
 * chat has no preview, only downloads: nothing opens to say there is nothing to see.
 */
export function ChatFileLink({ file }: { file: ChatFile }) {
	const t = useTranslations("chat.preview");
	const format = useFormatter();
	const { open } = useChatPreview();

	const details = (
		<>
			<FileIcon className="size-5 shrink-0 text-muted-foreground" />
			<span className="min-w-0">
				<span className="block truncate text-sm font-medium">{file.name}</span>
				<span className="block text-xs text-muted-foreground">
					{format.number(file.size / 1024, FILE_SIZE_FORMAT)}
				</span>
			</span>
		</>
	);

	if (!open || !hasPreview(file)) {
		return (
			<a
				href={file.url}
				download={file.name}
				target="_blank"
				rel="noreferrer"
				className="my-2 flex w-fit max-w-full min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-muted"
				aria-label={t("downloadFile", { name: file.name })}
			>
				{details}
				<DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
			</a>
		);
	}

	return (
		<div className="my-2 flex w-fit max-w-full items-center rounded-lg border bg-card">
			<button
				type="button"
				onClick={() => open(file)}
				className="flex min-w-0 items-center gap-3 rounded-s-lg px-3 py-2 text-start hover:bg-muted"
				aria-label={t("open", { name: file.name })}
			>
				{details}
			</button>
			<a
				href={file.url}
				download={file.name}
				target="_blank"
				rel="noreferrer"
				className="flex items-center self-stretch rounded-e-lg border-s px-3 text-muted-foreground hover:bg-muted"
				aria-label={t("download")}
				title={t("download")}
			>
				<DownloadIcon className="size-4" />
			</a>
		</div>
	);
}

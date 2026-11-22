"use client";

import { createContext, type MouseEvent, useContext, useEffect, useState } from "react";

import type { ChatFile } from "./messages";

/**
 * How the chat opens its files. With the installation's cookie a file's own
 * address works as it is; on another site, whose requests carry a token, the
 * address is exchanged for a signed link first.
 */
export type FileLinks = ((address: string) => Promise<string>) | null;

const FileLinksContext = createContext<FileLinks>(null);

export const FileLinksProvider = FileLinksContext.Provider;

export const useFileLinks = () => useContext(FileLinksContext);

export type OpenableFile =
	| { state: "ready"; file: ChatFile }
	| { state: "loading" }
	| { state: "failed" };

// The file with links the page can open: at once without a token
export function useOpenableFile(file: ChatFile): OpenableFile {
	const links = useFileLinks();
	const [resolved, setResolved] = useState<{ id: string; result: OpenableFile } | null>(null);

	useEffect(() => {
		if (!links) {
			return;
		}

		let active = true;

		Promise.all([
			links(file.url),
			file.previewUrl ? links(file.previewUrl) : Promise.resolve(undefined),
		]).then(
			([url, previewUrl]) => {
				if (active) {
					setResolved({
						id: file.id,
						result: {
							state: "ready",
							file: { ...file, url, ...(previewUrl && { previewUrl }) },
						},
					});
				}
			},
			() => {
				if (active) {
					setResolved({ id: file.id, result: { state: "failed" } });
				}
			},
		);

		return () => {
			active = false;
		};
	}, [links, file]);

	if (!links) {
		return { state: "ready", file };
	}

	return resolved?.id === file.id ? resolved.result : { state: "loading" };
}

/**
 * The click of a file's download: with a token the link is asked for then,
 * and opens in a new tab, so the page that holds the chat stays.
 */
export function useFileDownload(file: ChatFile) {
	const links = useFileLinks();

	return (event: MouseEvent<HTMLAnchorElement>) => {
		if (!links) {
			return;
		}

		event.preventDefault();

		// Opened at once, as the click allows, then sent to the link; the file's
		// tab has no hold on the page
		const tab = window.open("", "_blank");

		if (tab) {
			tab.opener = null;
		}

		links(file.url).then(
			(link) => {
				if (tab) {
					tab.location.href = link;
				} else {
					window.open(link, "_blank", "noreferrer");
				}
			},
			() => tab?.close(),
		);
	};
}

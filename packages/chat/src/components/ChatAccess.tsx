"use client";

import { type ToolApprovalResponse, useAuiState } from "@assistant-ui/react";
import { Building2Icon } from "lucide-react";
import { useState } from "react";

import { useTranslations } from "../i18n/intl";
import type { ChatStep } from "../lib/messages";
import type { ChatExtras } from "../lib/use-chat-runtime";
import { Button } from "../ui/button";

type Access = NonNullable<ChatStep["access"]>;

/**
 * A tool's system waiting for the user's account at the tenant's identity
 * provider: the context, and the provider's login button as on the tenant's
 * login page. Once the user signs in, in a window of the installation, the
 * agent goes on; a window that ends without the account leaves the card as it
 * is, to try again.
 */
export function ChatAccess({
	access,
	respondToApproval,
}: {
	access: Access;
	respondToApproval: (response: ToolApprovalResponse) => Promise<void>;
}) {
	const t = useTranslations("chat.access");
	const linkAccess = useAuiState(
		(s) => (s.thread.extras as Partial<ChatExtras> | undefined)?.linkAccess,
	);
	const [isLinking, setIsLinking] = useState(false);

	// The window opens at once, in the click, or the browser blocks it
	const signIn = async () => {
		if (!linkAccess) {
			return;
		}

		setIsLinking(true);

		try {
			if (await linkAccess(access.provider.id)) {
				await respondToApproval({ approved: true });
				return;
			}
		} catch {
			// The button stays usable to try again
		}

		setIsLinking(false);
	};

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<p className="truncate text-sm font-medium">{access.context}</p>
				<p className="text-xs text-muted-foreground">{t("title")}</p>
			</div>
			{linkAccess && (
				<Button
					variant="primary"
					size="sm"
					onClick={() => void signIn()}
					loading={isLinking}
					disabled={isLinking}
				>
					<Building2Icon className="size-3.5" />
					{access.provider.label ?? t("signIn")}
				</Button>
			)}
		</div>
	);
}

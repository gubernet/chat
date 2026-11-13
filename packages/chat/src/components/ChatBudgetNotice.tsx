"use client";

import { CircleAlertIcon } from "lucide-react";
import { useId, useState } from "react";

import type { ChatBudget } from "../client/client";
import { useTranslations } from "../i18n/intl";
import { useNotify } from "../lib/notify";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const WARNING_PERCENT = 80;

/**
 * Above the chat, about the user's own budget only: a notice at 80%, and once
 * it is used up the models left; both with the request for more when the
 * user's profile allows it.
 */
export function ChatBudgetNotice({
	budget,
	onRequest,
}: {
	budget: ChatBudget;
	// Sends the request for more budget, with the user's note
	onRequest: (note: string | null) => Promise<void>;
}) {
	const t = useTranslations("chat.budget");
	const [requesting, setRequesting] = useState(false);

	if (budget.percent === null || budget.percent < WARNING_PERCENT) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center justify-center gap-3 border-b bg-muted px-4 py-2 text-sm text-muted-foreground">
			<CircleAlertIcon className="size-4 shrink-0" />
			<span>
				{budget.exhausted ? t("exhausted") : t("warning", { percent: WARNING_PERCENT })}
			</span>
			{budget.canRequestIncrease &&
				(budget.hasPendingRequest ? (
					<span className="font-medium">{t("requestSent")}</span>
				) : (
					<Button variant="outline" size="sm" onClick={() => setRequesting(true)}>
						{t("request")}
					</Button>
				))}
			{requesting && (
				<RequestDialog onRequest={onRequest} onClose={() => setRequesting(false)} />
			)}
		</div>
	);
}

function RequestDialog({
	onRequest,
	onClose,
}: {
	onRequest: (note: string | null) => Promise<void>;
	onClose: () => void;
}) {
	const t = useTranslations("chat.budget");
	const tActions = useTranslations("chat.history.actions");
	const notify = useNotify();
	const noteId = useId();
	const [note, setNote] = useState("");
	const [sending, setSending] = useState(false);

	const send = async () => {
		setSending(true);

		try {
			await onRequest(note.trim() || null);
			notify({ title: t("requestSent"), type: "info" });
			onClose();
		} catch {
			notify({ title: t("requestError"), type: "error" });
			setSending(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent closeLabel={tActions("cancel")}>
				<DialogHeader>
					<DialogTitle>{t("request")}</DialogTitle>
					<DialogDescription>{t("requestDescription")}</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2">
					<Label htmlFor={noteId}>{t("note")}</Label>
					<Textarea
						id={noteId}
						rows={3}
						maxLength={1000}
						value={note}
						onChange={(event) => setNote(event.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button variant="primary" onClick={() => void send()} loading={sending}>
						{t("send")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

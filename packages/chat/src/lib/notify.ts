"use client";

import { createContext, useContext } from "react";

import { toast } from "../ui/toast";

// A short notice to the user, as a file refused or a dictation that failed
export type ChatNotification = { title: string; type: "error" | "info" };

export type Notify = (notification: ChatNotification) => void;

// The chat's own toasts, unless the app shows the notices with its own
export const defaultNotify: Notify = (notification) => {
	toast.add(notification);
};

export const NotifyContext = createContext<Notify>(defaultNotify);

export const useNotify = () => useContext(NotifyContext);

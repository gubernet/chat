"use client";

import { createContext, useContext } from "react";

/**
 * Where menus and toasts are drawn: an element of the chat at the end of the
 * page, so they keep the chat's styles. None: the page's body.
 */
export const PortalContext = createContext<HTMLElement | undefined>(undefined);

export const usePortalContainer = () => useContext(PortalContext);

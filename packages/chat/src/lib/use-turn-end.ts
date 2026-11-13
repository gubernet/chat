"use client";

import { useEffect, useRef } from "react";

// Runs once each time the agent finishes a turn
export function useTurnEnd(isRunning: boolean, onTurnEnd: () => void) {
	const wasRunning = useRef(isRunning);

	useEffect(() => {
		if (wasRunning.current && !isRunning) {
			onTurnEnd();
		}

		wasRunning.current = isRunning;
	}, [isRunning, onTurnEnd]);
}

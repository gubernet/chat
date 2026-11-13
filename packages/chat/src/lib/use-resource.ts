"use client";

import { useCallback, useEffect, useState } from "react";

export interface Resource<T> {
	data: T | undefined;
	error: unknown;
	// Only until the first answer: read again, the last value stays meanwhile
	isLoading: boolean;
	reload: () => void;
}

/**
 * What a request gives, read when its key changes and again when asked.
 * Without a key nothing is read. `load` is the same function while it reads
 * the same thing: wrap it in `useCallback`.
 */
export function useResource<T>(
	key: string | null,
	load: (signal: AbortSignal) => Promise<T>,
): Resource<T> {
	const [state, setState] = useState<{ key: string | null; data?: T; error?: unknown }>({
		key: null,
	});
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (key === null) {
			return;
		}

		const controller = new AbortController();

		load(controller.signal).then(
			(data) => {
				if (!controller.signal.aborted) {
					setState({ key, data });
				}
			},
			(error: unknown) => {
				if (!controller.signal.aborted) {
					// A failed reload keeps what was read before
					setState((current) => ({
						key,
						data: current.key === key ? current.data : undefined,
						error,
					}));
				}
			},
		);

		return () => controller.abort();
	}, [key, load, version]);

	const reload = useCallback(() => setVersion((current) => current + 1), []);
	const isCurrent = key !== null && state.key === key;

	return {
		data: isCurrent ? state.data : undefined,
		error: isCurrent ? state.error : undefined,
		isLoading: key !== null && !isCurrent,
		reload,
	};
}

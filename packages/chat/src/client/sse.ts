/**
 * A text/event-stream body as the API writes the events of a turn: "message"
 * events carry one JSON value each, "done" ends the stream, "error" ends it
 * with an error, and comment lines only keep the connection alive.
 */

export interface ServerEvent {
	event: string | undefined;
	data: string | undefined;
}

// A blank line, in any of the line endings the format allows
const MESSAGE_END = /\r\n\r\n|\n\n|\r\r/;
const LINE_END = /\r\n|\n|\r/;

export function parseServerEvent(block: string): ServerEvent {
	let event: string | undefined;
	let data: string | undefined;

	for (const line of block.split(LINE_END)) {
		const colon = line.indexOf(":");

		// A line that starts with a colon is a comment
		if (line === "" || colon === 0) {
			continue;
		}

		const name = colon === -1 ? line : line.slice(0, colon);
		const value =
			colon === -1 ? "" : line.slice(line[colon + 1] === " " ? colon + 2 : colon + 1);

		if (name === "event") {
			event = value;
		} else if (name === "data") {
			data = data === undefined ? value : `${data}\n${value}`;
		}
	}

	return { event, data };
}

// The events of a stream, as its chunks arrive, however they are cut
export async function* readServerEvents(
	stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerEvent> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		for (;;) {
			const { done, value } = await reader.read();

			buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

			for (let end = MESSAGE_END.exec(buffer); end; end = MESSAGE_END.exec(buffer)) {
				const block = buffer.slice(0, end.index);

				buffer = buffer.slice(end.index + end[0].length);
				yield parseServerEvent(block);
			}

			if (done) {
				return;
			}
		}
	} finally {
		// Closing the stream tells the server the page stopped listening
		await reader.cancel().catch(() => undefined);
	}
}

/**
 * The values of an event iterator of the API. `toError` makes the error an
 * "error" event ends the stream with.
 */
export async function* readEventIterator<T>(
	stream: ReadableStream<Uint8Array>,
	toError: (data: unknown) => Error,
): AsyncGenerator<T> {
	for await (const { event, data } of readServerEvents(stream)) {
		const name = event ?? (data === undefined ? undefined : "message");

		if (name === "message") {
			yield JSON.parse(data ?? "null") as T;
		} else if (name === "error") {
			throw toError(data ? JSON.parse(data) : undefined);
		} else if (name === "done" || name === "close") {
			return;
		}
	}
}

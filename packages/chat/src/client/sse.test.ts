import { describe, expect, it } from "vitest";

import { parseServerEvent, readEventIterator } from "./sse";

const streamOf = (chunks: string[]) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();

			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}

			controller.close();
		},
	});

const collect = async (chunks: string[]) => {
	const values: unknown[] = [];

	for await (const value of readEventIterator(streamOf(chunks), () => new Error("failed"))) {
		values.push(value);
	}

	return values;
};

describe("server events", () => {
	it("reads the event and its data, joining the lines of the data", () => {
		expect(parseServerEvent('event: message\ndata: {"a":1}')).toEqual({
			event: "message",
			data: '{"a":1}',
		});
		expect(parseServerEvent("data: one\ndata: two")).toEqual({
			event: undefined,
			data: "one\ntwo",
		});
		expect(parseServerEvent(": keep alive")).toEqual({ event: undefined, data: undefined });
	});

	it("gives the values of the messages until the stream is done", async () => {
		const values = await collect([
			": \n\n",
			'event: message\ndata: {"type":"text","delta":"Ciao"}\n\n',
			": \n\n",
			'event: message\ndata: {"type":"end","reason":"completed"}\n\n',
			"event: done\n\n",
			'event: message\ndata: {"type":"text","delta":"dopo"}\n\n',
		]);

		expect(values).toEqual([
			{ type: "text", delta: "Ciao" },
			{ type: "end", reason: "completed" },
		]);
	});

	it("reads messages cut anywhere between two chunks", async () => {
		const whole = 'event: message\r\ndata: {"type":"text","delta":"à è"}\r\n\r\n';
		const bytes = new TextEncoder().encode(whole);
		const values: unknown[] = [];
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				// One byte at a time: also inside a character and inside the blank line
				for (const byte of bytes) {
					controller.enqueue(new Uint8Array([byte]));
				}

				controller.close();
			},
		});

		for await (const value of readEventIterator(stream, () => new Error("failed"))) {
			values.push(value);
		}

		expect(values).toEqual([{ type: "text", delta: "à è" }]);
	});

	it("ends with the error of an error event", async () => {
		const read = async () => {
			for await (const _ of readEventIterator(
				streamOf(['event: error\ndata: {"code":"INTERNAL_SERVER_ERROR"}\n\n']),
				(data) => new Error((data as { code: string }).code),
			)) {
				// Nothing comes before the error
			}
		};

		await expect(read()).rejects.toThrow("INTERNAL_SERVER_ERROR");
	});
});

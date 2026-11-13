import { describe, expect, it } from "vitest";

import { encodeWav } from "./dictation";

describe("encodeWav", () => {
	it("writes 16-bit mono PCM with the length in its header", async () => {
		const samples = new Float32Array(16_000).fill(0.5);
		samples[0] = 2;
		samples[1] = -2;

		const wav = encodeWav(samples, 16_000);
		const view = new DataView(await wav.arrayBuffer());
		const text = (at: number) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4));

		expect(wav.type).toBe("audio/wav");
		expect(wav.size).toBe(44 + 32_000);
		expect([text(0), text(8), text(12), text(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
		// PCM, mono, 16 kHz, 32 kB a second
		expect(view.getUint16(20, true)).toBe(1);
		expect(view.getUint16(22, true)).toBe(1);
		expect(view.getUint32(24, true)).toBe(16_000);
		expect(view.getUint32(28, true)).toBe(32_000);
		expect(view.getUint32(40, true)).toBe(32_000);
		// Out-of-range samples are clipped
		expect(view.getInt16(44, true)).toBe(0x7fff);
		expect(view.getInt16(46, true)).toBe(-0x8000);
	});
});

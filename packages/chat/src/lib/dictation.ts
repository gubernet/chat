import type { DictationAdapter } from "@assistant-ui/react";

// A dictation stops by itself after 5 minutes, as the server allows
export const MAX_DICTATION_SECONDS = 300;

// What Whisper works on: 16 kHz mono
const SAMPLE_RATE = 16_000;

// In the composer, where the text will go, while the audio is transcribed
const TRANSCRIBING_MARK = "…";

export type DictationError = "microphone" | "failed" | "limit";

export type Transcribe = (audio: Blob, signal: AbortSignal) => Promise<string>;

/**
 * 16-bit PCM WAV of mono samples: the server reads the recording's length from
 * its header, and the gateway can measure it too.
 */
export function encodeWav(samples: Float32Array, sampleRate: number) {
	const buffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);
	const write = (at: number, text: string) => {
		for (let index = 0; index < text.length; index++) {
			view.setUint8(at + index, text.charCodeAt(index));
		}
	};

	write(0, "RIFF");
	view.setUint32(4, 36 + samples.length * 2, true);
	write(8, "WAVE");
	write(12, "fmt ");
	view.setUint32(16, 16, true);
	// PCM, mono
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	write(36, "data");
	view.setUint32(40, samples.length * 2, true);

	samples.forEach((sample, index) => {
		const clamped = Math.max(-1, Math.min(1, sample));
		view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
	});

	return new Blob([buffer], { type: "audio/wav" });
}

// The browser's recording (WebM or MP4) as 16 kHz mono WAV, at most 5 minutes of it
async function toWav(recording: Blob) {
	const context = new AudioContext();

	try {
		const decoded = await context.decodeAudioData(await recording.arrayBuffer());
		const frames = Math.min(
			Math.ceil(decoded.duration * SAMPLE_RATE),
			MAX_DICTATION_SECONDS * SAMPLE_RATE,
		);
		const offline = new OfflineAudioContext(1, Math.max(frames, 1), SAMPLE_RATE);
		const source = offline.createBufferSource();

		source.buffer = decoded;
		source.connect(offline.destination);
		source.start();

		const rendered = await offline.startRendering();

		return encodeWav(rendered.getChannelData(0), SAMPLE_RATE);
	} finally {
		void context.close();
	}
}

const listen = <T>(listeners: Set<T>, listener: T) => {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
};

/**
 * Dictation as the chats of ChatGPT, Claude or Le Chat: the browser records
 * until the user stops, or for 5 minutes, then the whole recording is
 * transcribed and its text goes in the composer, to be read before sending.
 */
export function createRecordingDictationAdapter({
	transcribe,
	onError,
}: {
	transcribe: Transcribe;
	onError: (error: DictationError) => void;
}): DictationAdapter {
	return {
		listen() {
			const onSpeech = new Set<(result: DictationAdapter.Result) => void>();
			const onSpeechStart = new Set<() => void>();
			const onSpeechEnd = new Set<(result: DictationAdapter.Result) => void>();
			const controller = new AbortController();
			const chunks: Blob[] = [];
			let stream: MediaStream | null = null;
			let recorder: MediaRecorder | null = null;
			let limit: ReturnType<typeof setTimeout> | undefined;
			let finishing: Promise<void> | null = null;
			let resolveRecording: (recording: Blob) => void = () => undefined;
			const recording = new Promise<Blob>((resolve) => {
				resolveRecording = resolve;
			});

			const session: DictationAdapter.Session = {
				status: { type: "starting" },
				stop: () => finish(),
				cancel: () => {
					controller.abort();
					release();
					session.status = { type: "ended", reason: "cancelled" };
				},
				onSpeechStart: (callback) => listen(onSpeechStart, callback),
				onSpeechEnd: (callback) => listen(onSpeechEnd, callback),
				onSpeech: (callback) => listen(onSpeech, callback),
			};

			const release = () => {
				clearTimeout(limit);

				if (recorder?.state === "recording") {
					recorder.stop();
				}

				for (const track of stream?.getTracks() ?? []) {
					track.stop();
				}
			};

			const speak = (transcript: string, isFinal: boolean) => {
				for (const callback of onSpeech) {
					callback({ transcript, isFinal });
				}
			};

			const finish = () => {
				finishing ??= (async () => {
					// Stopped before the microphone opened: nothing was said
					if (!recorder) {
						controller.abort();
						release();
						session.status = { type: "ended", reason: "cancelled" };
						return;
					}

					release();
					speak(TRANSCRIBING_MARK, false);

					try {
						const text = await transcribe(
							await toWav(await recording),
							controller.signal,
						);

						// An empty final result takes the mark away and leaves the text as it was
						speak(text, true);

						for (const callback of onSpeechEnd) {
							callback({ transcript: text });
						}

						session.status = { type: "ended", reason: "stopped" };
					} catch {
						speak("", true);

						if (!controller.signal.aborted) {
							onError("failed");
						}

						session.status = { type: "ended", reason: "error" };
					}
				})();

				return finishing;
			};

			navigator.mediaDevices
				.getUserMedia({
					audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
				})
				.then((media) => {
					stream = media;

					if (controller.signal.aborted) {
						release();
						return;
					}

					recorder = new MediaRecorder(media);
					recorder.addEventListener("dataavailable", (event) => {
						if (event.data.size > 0) {
							chunks.push(event.data);
						}
					});
					recorder.addEventListener("stop", () =>
						resolveRecording(new Blob(chunks, { type: recorder?.mimeType })),
					);
					recorder.start();
					session.status = { type: "running" };

					for (const callback of onSpeechStart) {
						callback();
					}

					limit = setTimeout(() => {
						onError("limit");
						void finish();
					}, MAX_DICTATION_SECONDS * 1000);
				})
				.catch(() => {
					release();
					session.status = { type: "ended", reason: "error" };
					onError("microphone");
				});

			return session;
		},
	};
}

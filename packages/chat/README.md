# @gubernet/chat

Open-source React components for chatting with AI agents built on [Gubernet](https://gubernet.ai).

> Version 0.x, in development: the API can change between minor versions.

## Install

```bash
npm install @gubernet/chat
```

Requires React 19.

## Use

```tsx
"use client";

import {
	ChatProvider,
	ChatRuntimeProvider,
	ChatThread,
	type ChatTransport,
	useChatRuntime,
} from "@gubernet/chat";

import "@gubernet/chat/styles.css";

function Chat({ transport }: { transport: ChatTransport }) {
	const { runtime } = useChatRuntime({ transport, suggestions: [] });

	return (
		<ChatRuntimeProvider runtime={runtime}>
			<ChatThread />
		</ChatRuntimeProvider>
	);
}

export function AgentChat({ transport }: { transport: ChatTransport }) {
	return (
		<ChatProvider>
			<div style={{ height: 600 }}>
				<Chat transport={transport} />
			</div>
		</ChatProvider>
	);
}
```

`ChatProvider` goes around every chat. The chat fills the height of its container.

A `ChatTransport` connects the chat to an agent: `send`, `respond` and `stop`, plus the optional
`regenerate`, `load` and `follow`. Each call returns the events of a turn, typed in
`@gubernet/chat/contract`.

## Components

### `ChatProvider`

| Prop     | Default  | What it does                                                                                                 |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `locale` | browser  | A language tag, as `it` or `it-IT`. English, German, Spanish, French and Italian are included.               |
| `theme`  | `"auto"` | `"light"`, `"dark"`, or `"auto"`: dark when the page's `<html>` has the class `dark` or `data-theme="dark"`. |
| `notify` | —        | Shows the chat's notices with your own toasts, in place of the chat's.                                       |

### `ChatThread`

| Prop            | Default | What it does                                                                   |
| --------------- | ------- | ------------------------------------------------------------------------------ |
| `welcome`       | —       | What the chat shows before the first message.                                  |
| `centeredStart` | `false` | Before the first message, the text box in the middle instead of at the bottom. |
| `preview`       | `true`  | The delivered files open beside the chat; without it they download.            |
| `form`          | —       | An agent's form, in place of the text box before the first message.            |

`ChatElaborato` is the page of an agent whose form gives only files: the form on one side, the
files on the other.

### `useChatRuntime`

| Option            | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `transport`       | How the chat reaches the agent.                                        |
| `suggestions`     | The messages offered before the first one.                             |
| `initialMessages` | A saved conversation opens with its messages.                          |
| `isDisabled`      | A conversation that can only be read.                                  |
| `showUsage`       | Tokens and cost under each answer; off by default.                     |
| `transcribe`      | Turns the microphone on: it gets a 16 kHz WAV and gives back its text. |

## Styles

`@gubernet/chat/styles.css` is compiled and scoped to the chat. The chat inherits the page's font
and can be themed with CSS variables, set on `:root` or on any element around it:

```css
:root {
	--gubernet-primary: #1d4ed8;
	--gubernet-primary-foreground: #ffffff;
	--gubernet-background: #ffffff;
	--gubernet-foreground: #111827;
	--gubernet-border: #e5e7eb;
	--gubernet-radius: 0.5rem;
	--gubernet-font: "Inter", sans-serif;
}
```

## Contract

`@gubernet/chat/contract` has no React and runs on a server too: the events of a turn, the
messages they build, the agents' forms and the limits on attachments, as
[Zod](https://zod.dev) schemas.

## License

[Apache-2.0](https://github.com/gubernet/chat/blob/main/LICENSE)

# @gubernet/chat

Open-source React components for chatting with AI agents built on [Gubernet](https://gubernet.ai).

> Version 0.x, in development: the API can change between minor versions.

## Install

```bash
npm install @gubernet/chat
```

Requires React 19. For Vue, [`@gubernet/chat-vue`](https://www.npmjs.com/package/@gubernet/chat-vue);
for any other site, [`@gubernet/chat-element`](https://www.npmjs.com/package/@gubernet/chat-element).

## Use

```tsx
"use client";

import { GubernetChat } from "@gubernet/chat";

import "@gubernet/chat/styles.css";

export function AgentChat() {
	return (
		<div style={{ height: 600 }}>
			<GubernetChat url="https://app.example.com" agentId="…" />
		</div>
	);
}
```

`GubernetChat` is the whole chat of an agent: a new chat or one of the user's conversations with
it, its model and the conversations had before. The chat fills the height of its container.

The user is the one signed in to the installation at `url`. See [Sign-in](#sign-in) for the chat
on your own site.

| Prop                   | Default  | What it does                                                                             |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `url`                  | —        | The address of the Gubernet installation.                                                |
| `agentId`              | —        | The agent to chat with.                                                                  |
| `getToken`             | —        | On your own site: the user's token in your app. See [Sign-in](#sign-in).                 |
| `conversationId`       | —        | The conversation to open; without it, a new chat.                                        |
| `onConversationChange` | —        | Called with the conversation the chat is on, `null` for a new chat.                      |
| `history`              | `"menu"` | Where the conversations are: `"menu"` in the bar, `"panel"` beside the chat, `"hidden"`. |
| `locale`               | browser  | A language tag, as `it` or `it-IT`.                                                      |
| `theme`                | `"auto"` | `"light"`, `"dark"`, or `"auto"`.                                                        |
| `hideTitle`            | `false`  | Without the agent's name in the bar.                                                     |
| `hideModel`            | `false`  | Without the choice of the model.                                                         |
| `color`                | —        | `"blue"`, `"indigo"`, `"violet"`, `"pink"`, `"red"`, `"orange"`, `"green"` or `"teal"`.  |
| `notify`               | —        | Shows the chat's notices with your own toasts, in place of the chat's.                   |
| `barEnd`               | —        | What your app puts at the end of the bar, as its user's menu.                            |

The bar on top has the agent's name, the new chat, the conversations and the model on the left.
Its right end is your app's.

## Sign-in

On the installation's own site the chat uses its session. On your site, which the browser does not
send that session to, the chat signs the user in one of two ways. Either way, the session opens
only the chat of the agent's organization, and the user is the same as in Gubernet: same
conversations, same access rules, same budget.

**With your app's token.** If your users sign in to your app with the organization's identity
provider (OpenID Connect), pass the token your app already has:

```tsx
<GubernetChat url="https://app.example.com" agentId="…" getToken={() => auth.getAccessToken()} />
```

The installation checks the token against the organization's identity provider: its signature,
issuer, expiry and audience. The audience must be one of the provider's _Accepted audiences_, which
the organization's admins set in Gubernet. The chat calls `getToken` again before each message,
so it should give a valid token, renewed when needed. Return `null` when the user is not signed
in.

**With the "Sign in" window.** Without `getToken`, a visitor sees a _Sign in_ button: a small
window of Gubernet opens on the organization's identity provider (OpenID Connect or SAML), then
closes. The session lasts as long as the tab, 12 hours at most. Your site must be one of the
organization's _Sites where agents can be embedded_, set by its admins in Gubernet, and the
organization must have an identity provider.

Files open through signed links of the installation, valid for 15 minutes.

## Access to the organization's systems

An agent's tool may call a system with the user's own account at one of the organization's identity
providers. When the user has not linked that account yet, the agent stops and the chat shows the
tool's context with the provider's sign-in button. The button opens a small window of Gubernet on
the provider's sign-in; once the user signs in, the window closes and the agent goes on. On your
site the window hands the account back only if your site is one of the organization's _Sites where
agents can be embedded_.

`GubernetChat` does it by itself. With your own transport, pass `linkAccess` to `useChatRuntime`,
made with `createAccessLink` from the installation's calls.

## Your own transport

The chat alone, connected to an agent by a transport of yours:

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

`ChatProvider` goes around every chat.

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
| `linkAccess`      | Opens the window where the user links an account a tool needs.         |

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

## PDF previews

The chat draws PDFs, and Word documents and presentations shown as PDF, in a worker of its own:
nothing to set up in your build. A site with a Content Security Policy allows it with
`worker-src blob:`.

## Contract

`@gubernet/chat/contract` has no React and runs on a server too: the events of a turn, the
messages they build, the agents' forms, the limits on attachments and the messages of the
windows, as [Zod](https://zod.dev) schemas.

## License

[Apache-2.0](https://github.com/gubernet/chat/blob/main/LICENSE)

The logos of the models come from [LobeHub Icons](https://github.com/lobehub/lobe-icons) (MIT).

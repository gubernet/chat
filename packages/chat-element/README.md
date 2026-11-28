# @layeral/chat-element

The chat of AI agents built on [Layeral](https://layeral.com) as a web component,
`<layeral-chat>`, for any site: with or without a build, with any framework.

> Version 0.x, in development: the API can change between minor versions.

## Install

```bash
npm install @layeral/chat-element
```

```js
import "@layeral/chat-element";
import "@layeral/chat-element/styles.css";
```

```html
<layeral-chat url="https://app.example.com" agent-id="…" style="height: 600px"></layeral-chat>
```

Without a build, from a CDN:

```html
<link
	rel="stylesheet"
	href="https://cdn.jsdelivr.net/npm/@layeral/chat-element@0.7.0/dist/styles.css"
/>
<script
	type="module"
	src="https://cdn.jsdelivr.net/npm/@layeral/chat-element@0.7.0/dist/index.js"
></script>
```

React and the chat are inside the element: the page needs nothing else. The chat fills the height
of the element.

For Vue, use [`@layeral/chat-vue`](https://www.npmjs.com/package/@layeral/chat-vue); for React,
[`@layeral/chat`](https://www.npmjs.com/package/@layeral/chat).

## Attributes and properties

| Attribute         | Property         | Default  | What it does                                                                             |
| ----------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------- |
| `url`             | `url`            | —        | The address of the Layeral installation.                                                 |
| `agent-id`        | `agentId`        | —        | The agent to chat with.                                                                  |
| `conversation-id` | `conversationId` | —        | The conversation to open; without it, a new chat.                                        |
| `history`         | `history`        | `"menu"` | Where the conversations are: `"menu"` in the bar, `"panel"` beside the chat, `"hidden"`. |
| `locale`          | `locale`         | browser  | A language tag, as `it` or `it-IT`.                                                      |
| `theme`           | `theme`          | `"auto"` | `"light"`, `"dark"`, or `"auto"`.                                                        |
| `color`           | `color`          | —        | `"blue"`, `"indigo"`, `"violet"`, `"pink"`, `"red"`, `"orange"`, `"green"` or `"teal"`.  |
| `hide-title`      | `hideTitle`      | `false`  | Without the agent's name in the bar.                                                     |
| `hide-model`      | `hideModel`      | `false`  | Without the choice of the model.                                                         |
| `hide-effort`     | `hideEffort`     | `false`  | Without the choice of the reasoning level.                                               |
| —                 | `getToken`       | —        | On your own site: the user's token in your app. See [Sign-in][sign-in].                  |
| —                 | `notify`         | —        | Shows the chat's notices with your own toasts, in place of the chat's.                   |

Functions are properties:

```js
const chat = document.querySelector("layeral-chat");

chat.getToken = () => auth.getAccessToken();
chat.addEventListener("conversation-change", (event) => {
	saveConversation(event.detail.conversationId);
});
```

`conversation-change` comes when the chat is on another conversation: `event.detail.conversationId`,
`null` for a new chat.

## The end of the bar

A child with `slot="bar-end"` goes at the end of the bar on top, as your user's menu:

```html
<layeral-chat url="https://app.example.com" agent-id="…">
	<button slot="bar-end">Account</button>
</layeral-chat>
```

## Sign-in, styles and PDF previews

As in [`@layeral/chat`](https://www.npmjs.com/package/@layeral/chat): [Sign-in][sign-in],
[Styles](https://www.npmjs.com/package/@layeral/chat#styles) and
[PDF previews](https://www.npmjs.com/package/@layeral/chat#pdf-previews). The chat is drawn in the
page's own DOM: it takes the page's font, and its stylesheet keeps its rules under `.layeral-chat`.

## License

[Apache-2.0](https://github.com/layeral/chat/blob/main/LICENSE)

[sign-in]: https://www.npmjs.com/package/@layeral/chat#sign-in

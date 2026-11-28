# @layeral/chat-vue

The chat of AI agents built on [Layeral](https://layeral.com) as a Vue component.

> Version 0.x, in development: the API can change between minor versions.

## Install

```bash
npm install @layeral/chat-vue
```

Requires Vue 3.3 or later.

## Use

```vue
<script setup lang="ts">
import { LayeralChat } from "@layeral/chat-vue";
import { ref } from "vue";

import "@layeral/chat-vue/styles.css";

const conversationId = ref<string | null>(null);
</script>

<template>
	<div style="height: 600px">
		<LayeralChat
			url="https://app.example.com"
			agent-id="…"
			v-model:conversation-id="conversationId"
		>
			<template #bar-end>
				<UserMenu />
			</template>
		</LayeralChat>
	</div>
</template>
```

`LayeralChat` is the whole chat of an agent: a new chat or one of the user's conversations with
it, its model and the conversations had before. The chat fills the height of its container.

| Prop                      | Default  | What it does                                                                             |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `url`                     | —        | The address of the Layeral installation.                                                 |
| `agent-id`                | —        | The agent to chat with.                                                                  |
| `conversation-id`         | —        | The conversation to open; without it, a new chat.                                        |
| `v-model:conversation-id` | —        | The conversation the chat is on, `null` for a new chat.                                  |
| `history`                 | `"menu"` | Where the conversations are: `"menu"` in the bar, `"panel"` beside the chat, `"hidden"`. |
| `locale`                  | browser  | A language tag, as `it` or `it-IT`.                                                      |
| `theme`                   | `"auto"` | `"light"`, `"dark"`, or `"auto"`.                                                        |
| `color`                   | —        | `"blue"`, `"indigo"`, `"violet"`, `"pink"`, `"red"`, `"orange"`, `"green"` or `"teal"`.  |
| `hide-title`              | `false`  | Without the agent's name in the bar.                                                     |
| `hide-model`              | `false`  | Without the choice of the model.                                                         |
| `hide-effort`             | `false`  | Without the choice of the reasoning level.                                               |
| `get-token`               | —        | On your own site: the user's token in your app. See [Sign-in][sign-in].                  |
| `notify`                  | —        | Shows the chat's notices with your own toasts, in place of the chat's.                   |

The `bar-end` slot goes at the end of the bar on top, as your user's menu.

## Nuxt

The chat runs in the browser:

```vue
<ClientOnly>
	<LayeralChat url="https://app.example.com" agent-id="…" />
</ClientOnly>
```

## Sign-in, styles and PDF previews

As in [`@layeral/chat`](https://www.npmjs.com/package/@layeral/chat): [Sign-in][sign-in],
[Styles](https://www.npmjs.com/package/@layeral/chat#styles) and
[PDF previews](https://www.npmjs.com/package/@layeral/chat#pdf-previews).

The component draws [`@layeral/chat-element`](https://www.npmjs.com/package/@layeral/chat-element).

## License

[Apache-2.0](https://github.com/layeral/chat/blob/main/LICENSE)

[sign-in]: https://www.npmjs.com/package/@layeral/chat#sign-in

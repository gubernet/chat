# Gubernet chat

Open-source components for chatting with AI agents built on [Gubernet](https://gubernet.ai).

| Package                                           | What it is                                     |
| ------------------------------------------------- | ---------------------------------------------- |
| [`@gubernet/chat`](packages/chat)                 | The chat as React components                   |
| [`@gubernet/chat-element`](packages/chat-element) | The chat as a web component, `<gubernet-chat>` |
| [`@gubernet/chat-vue`](packages/chat-vue)         | The chat as a Vue component                    |

The three packages are released together, with the same version.

## Development

Node.js 22 or later and pnpm.

```bash
pnpm install
pnpm build
pnpm test
```

Before a commit: `pnpm format`, `pnpm lint`, `pnpm type-check` and `pnpm test`.

## License

[Apache-2.0](LICENSE)

# Layeral chat

Open-source components for chatting with AI agents built on [Layeral](https://layeral.com).

| Package                                          | What it is                                    |
| ------------------------------------------------ | --------------------------------------------- |
| [`@layeral/chat`](packages/chat)                 | The chat as React components                  |
| [`@layeral/chat-element`](packages/chat-element) | The chat as a web component, `<layeral-chat>` |
| [`@layeral/chat-vue`](packages/chat-vue)         | The chat as a Vue component                   |

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

# Changelog

All notable changes to `@gubernet/chat` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-13

### Added

- The chat of Gubernet agents as React components: `ChatThread`, `ChatElaborato`,
  `useChatRuntime` with its `ChatTransport`, and `ChatProvider` for the language, the theme and
  the notices.
- `@gubernet/chat/contract`: the events of a turn, the messages they build, the agents' forms and
  the limits on attachments, without React.
- `@gubernet/chat/styles.css`, compiled and written under the chat's own class, with the
  `--gubernet-*` variables for colours, corners and font; `@gubernet/chat/vendor.css` for an
  application that compiles the chat's classes with its own Tailwind.
- English, German, Spanish, French and Italian.

[Unreleased]: https://github.com/gubernet/chat/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gubernet/chat/releases/tag/v0.1.0

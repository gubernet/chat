# Changelog

All notable changes to `@layeral/chat-element` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), the same as `@layeral/chat`'s.

## [Unreleased]

## [0.8.0] - 2026-11-28

### Added

- On `@layeral/chat` 0.8.0: the reasoning level next to the model, and `hide-effort`
  (`hideEffort`) without its choice.

## [0.7.0] - 2026-11-27

### Changed

- **The package is now `@layeral/chat-element`**, on `@layeral/chat` 0.7.0;
  `@gubernet/chat-element` is deprecated. The element is `<layeral-chat>` (was `<gubernet-chat>`),
  its type `LayeralChatElement`.

## [0.6.0] - 2026-11-23

### Changed

- The chat of `@gubernet/chat` 0.6.0: a tool that needs the user's account at one of the
  organization's identity providers asks for it with the provider's sign-in button.

## [0.5.0] - 2026-11-22

### Added

- `<gubernet-chat>`: the chat of `@gubernet/chat` as a web component, with React inside, for any
  site and from a CDN. Attributes for the values that are text, properties for `getToken` and
  `notify`, the `conversation-change` event and the `bar-end` slot.

[Unreleased]: https://github.com/layeral/chat/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/layeral/chat/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/layeral/chat/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/layeral/chat/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/layeral/chat/releases/tag/v0.5.0

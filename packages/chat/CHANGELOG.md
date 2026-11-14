# Changelog

All notable changes to `@gubernet/chat` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-11-14

### Changed

- The choice of the model shows the logo of the model's family before its name, which is
  smaller. The installation says the family of each model (`family` on `ChatAgentModel`); one
  that doesn't yet shows the name alone.

## [0.3.0] - 2026-11-14

### Added

- **`barEnd`** on `GubernetChat`: what the app puts at the end of the bar on top, as its user's
  menu. The chat has nothing of its own there.

### Changed

- The choice of the model is on the left of the bar, after the agent's name, the new chat and the
  conversations: the right end of the bar is the app's.
- The notice of an agent the user cannot open is shorter, "Agent unavailable.", and sits in the
  middle of the chat's height.

## [0.2.0] - 2026-11-13

### Added

- **`GubernetChat`**: the whole chat of an agent of an installation, from the installation's
  address and the agent's id. A new chat or one of the user's conversations with the agent, its
  model with how much it costs to use, the notice on the user's budget, the microphone where the
  organization has it on, and the conversations had before: in a menu of the bar, in a panel
  beside the chat or hidden (`history`). The agent's name and the choice of the model can be
  left out of the bar (`hideTitle`, `hideModel`). The user is the one signed in to the
  installation.
- **Colours without codes**: `color` on `GubernetChat` and `ChatProvider` takes one of eight
  colours (`CHAT_COLORS`) for the buttons and what is selected, in the light and the dark theme.
- `createGubernetClient`: the API of an installation as the chat uses it.
- **Questions with options**: an agent ends its answer with questions the user answers by
  choosing among options or writing an answer of their own (`ChatQuestion`, shown by
  `ChatThread`). The answers are the user's next message: a `ChatTransport` receives them as
  `answers` in `send`.
- `@gubernet/chat/contract`: the `question` event and part, the `answers` part of a user's
  message, and their schemas and checks (`questionsSchema`, `answersSchema`, `readAnswers`).

### Fixed

- The chat paints its own background: on a page of another colour only the band of the text box
  had it.
- The chat takes the page's font, as documented; it fell back to the system's.
- `ChatProvider` keeps the chat's texts apart from the page's: in an application that uses
  next-intl or use-intl, what the page drew inside the chat lost its own translations.
- A Word document or a presentation opens as its PDF: the answer lost the preview its file came
  with (`previewUrl`).
- A file the chat cannot show downloads from its card and never opens the preview. Among the
  files of an elaborato it shows its name, its size and its download.

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

[Unreleased]: https://github.com/gubernet/chat/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/gubernet/chat/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/gubernet/chat/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/gubernet/chat/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gubernet/chat/releases/tag/v0.1.0

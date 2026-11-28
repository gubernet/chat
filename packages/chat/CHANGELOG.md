# Changelog

All notable changes to `@layeral/chat` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **The reasoning level.** Next to the model, the chat offers the reasoning levels the agent leaves
  on with it, on one scale for every model (`CHAT_EFFORT_LEVELS`: low, medium, high, xhigh, max),
  when they make a difference to the model. A new chat starts at the chosen level, a conversation
  goes on at a new one from the next answer. The client reads each model's `effort` and the
  conversation's, and gains `setConversationEffort`; `createConversation` takes an `effort`.
  `hideEffort` hides the level's choice, as `hideModel` the model's. An installation before the
  levels sends neither, and the chat shows no choice.

## [0.7.0] - 2026-11-27

### Changed

- **The package is now `@layeral/chat`**, in the repository `layeral/chat`; `@gubernet/chat` is
  deprecated. The names change with it: `LayeralChat` and `LayeralChatProps` (were `GubernetChat`
  and `GubernetChatProps`), `createLayeralClient`, `LayeralClient` and `LayeralApiError`, the root
  class `.layeral-chat` and the CSS variables `--layeral-*` (were `--gubernet-*`).
- The windows' messages are `layeral-identity-access` and `layeral-chat-session`
  (`IDENTITY_ACCESS_MESSAGE`, `EMBED_SESSION_MESSAGE`): an installation and its chats move to
  0.7.0 together. The session kept in the tab has a new key: a visitor signs in once more.

## [0.6.0] - 2026-11-23

### Added

- **Access to the organization's systems.** A tool whose system needs the user's account at one of
  the organization's identity providers waits for it: the `access` event, and the step's `access`,
  show the tool's context with the provider's sign-in button. The button opens the installation's
  window on the provider's sign-in; the account it gives goes back to the installation with the
  user's session, and the agent goes on. `GubernetChat` does it by itself; with your own transport,
  `linkAccess` of `useChatRuntime`, made with `createAccessLink`. `IDENTITY_ACCESS_MESSAGE` and its
  schema in `/contract`.
- `confirmation-expired` also closes an access nobody gave in time.

### Fixed

- A sub-agent's row opens by itself when one of its steps waits for the user: the card of a
  confirmation was hidden inside it.

## [0.5.0] - 2026-11-22

### Added

- The chat for any site and for Vue: `@gubernet/chat-element` (`<gubernet-chat>`) and
  `@gubernet/chat-vue`, released with the same version as this package.

## [0.4.0] - 2026-11-22

### Added

- **The chat on your own site.** `GubernetChat` works on a site other than the installation's: its
  requests carry a session of the chat alone, never the installation's cookie.
    - **`getToken`**: your app's token of the user, an OpenID Connect token of the organization's
      identity provider, exchanged for the chat's session and given again before each message.
    - Without it, a visitor sees **Sign in**: the installation's window, through the organization's
      identity provider, hands the session to your site if it is among the organization's sites. The
      session stays in the page's `sessionStorage` until the tab closes, 12 hours at most.
    - Files open through signed links of the installation (`link` on the file's address).
    - `EMBED_SESSION_MESSAGE` and the session's schemas in `/contract`.

- The card of a tool that writes shows what the tool does (`description` on the `confirmation`
  event) and lets the user change the agent's values before allowing the call: texts, numbers,
  yes/no, and lists or objects as JSON. A long text shows as it reads, with its source to edit
  (Preview / Source). The values the user changed go with the answer (`values` on
  `respondToConfirmation` and on `ChatTransport.respond`) and stay on the step.
- **`confirmation-expired`** event: nobody answered in time and the agent went on without the
  call; the card closes as expired.

### Changed

- The card stays in the conversation once answered, with the outcome: allowed, allowed with the
  changed values, refused or expired.

### Fixed

- PDF previews, and Word documents and presentations shown as PDF, open with any build, as Vite:
  the PDF worker is inside the package and starts from the page. A site with a Content Security
  Policy allows it with `worker-src blob:`.

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

[Unreleased]: https://github.com/layeral/chat/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/layeral/chat/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/layeral/chat/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/layeral/chat/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/layeral/chat/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/layeral/chat/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/layeral/chat/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/layeral/chat/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/layeral/chat/releases/tag/v0.1.0

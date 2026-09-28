# web2

The Game Test Space site. The site (`dist/`) and its API (`worker/src`, under `/api/*`) ship together as the `gtspace` Cloudflare Worker (`wrangler.jsonc`); pushing to `main` deploys it.

## Events and the admin page

Events are stored in Firestore at `events/{slug}`. Only the Worker reads and writes them (with the service account), so `firestore.rules` keeps clients out. Admins manage them at `/admin`.

To make someone an admin, open Firestore in the Firebase console and add a document to the `admins` collection. The document ID is their uid (`discord:<Discord user ID>`), and the document can be empty. Anyone who signs in and opens `/admin` without access sees their uid there, ready to copy.

## Games

Members of the Discord server (遊戲測試的地方 GameTestSpace) list their own games: they sign in with Discord, fill in the form at `/games/new`, and later add to the update log and edit the description at `/games/<slug>/edit` (their list is at `/my/games`). A game goes on the site as soon as it is saved. Games are stored in Firestore at `games/{slug}`, and, like events, only the Worker (`worker/src/games.ts`) reads and writes them.

- Nothing but text and a cover image is uploaded. The one link a game may carry is its thread in the Discord server; builds are shared in Discord, never through the site.
- Whether someone is in the server is asked of Discord by the app's bot each time they list or edit a game (cached for a minute). The bot must be a member of the server, and its token must be the Worker secret `DISCORD_BOT_TOKEN` (`npx wrangler secret put DISCORD_BOT_TOKEN`). Without it no one but admins can list games; the form says the check is unavailable. Someone who joined but hasn't agreed to the server's rules yet counts as not a member.
- Each account can list up to 10 games (admins have no limit), since every listed game is read each time the public list refreshes.
- Admins manage games at `/admin/games`: pin one game, which then comes first on the games page and fills the home page's hero, and hide games that shouldn't be on the site. Admins can also edit any game. The pinned game is kept at `settings/games`.

## Languages

The site is in Traditional Chinese (at `/`), English (`/en`), Japanese (`/ja`) and Korean (`/ko`): every page has the same path under each prefix, and the header's language menu links the same page in the others. The language comes from the URL alone; nothing redirects by browser language, so search engines index all four.

- `src/i18n/messages/zh-TW.ts` holds every string and is the source: add a key there first, then to `en.ts`, `ja.ts` and `ko.ts` (type-checking fails until all four have it). Templates call `t('key')`; a message with elements in it goes through `I18nT`.
- The Worker writes each page's `<html lang>`, title, description and links to its other languages from the same files (`worker/src/meta.ts`), and the sitemap lists every language.
- Event text is shown as the admin wrote it, in every language; a game's, as its owner wrote it. The admin pages are Chinese only: `/en/admin` and the like go to `/admin`.

## Sample data

`src/mocks/` holds fictional games and events. They are used only by `npm run dev`: when the API returns nothing, or can't be reached, the page shows the samples instead and labels them 示範資料. Production builds leave them out.

## Local API

`npm run dev` proxies `/api` to the deployed Worker. To try Worker changes, including the admin page, without touching production, use the Firebase emulators. In the Claude desktop app these are the `firebase-emulators`, `worker-emulated` and `web-local-api` configurations in `.claude/launch.json`. By hand:

```sh
npx firebase emulators:start --only auth,firestore --project demo-gtspace
npx wrangler dev --port 8787 --var FIRESTORE_EMULATOR_HOST:localhost:8085 --var FIREBASE_AUTH_EMULATOR_HOST:localhost:9099 \
  --var 'FIREBASE_SERVICE_ACCOUNT:{"project_id":"demo-gtspace","client_email":"dev@demo-gtspace.iam.gserviceaccount.com","private_key":""}' \
  --var DISCORD_CLIENT_SECRET:unused --var DEV_DISCORD_MEMBERS:100000000000000001
API_TARGET=http://localhost:8787 npm run dev -- --port 5198
```

Discord sign-in does not work against the emulators. To test the admin page there, sign the page in to the Auth emulator from the browser console (`connectAuthEmulator` and `signInWithCustomToken` with an unsigned token), and create `admins/<uid>` in the Firestore emulator. The bot can't be asked either: with the emulators, the Worker treats the Discord user IDs in `DEV_DISCORD_MEMBERS` (comma-separated; `worker-emulated` sets `100000000000000001`) as members of the server, so `discord:100000000000000001` can list games. To try the real check instead, put the bot's token in `.dev.vars` (`DISCORD_BOT_TOKEN=…`; git ignores the file) and use the `worker-emulated-bot` configuration (port 8788), which has no such list and asks Discord. If the check fails, the Worker's log says why: no token, a token Discord rejects, or the bot not being in the server.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

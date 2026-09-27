# web2

The Game Test Space site. The site (`dist/`) and its API (`worker/src`, under `/api/*`) ship together as the `gtspace` Cloudflare Worker (`wrangler.jsonc`); pushing to `main` deploys it.

## Events and the admin page

Events are stored in Firestore at `events/{slug}`. Only the Worker reads and writes them (with the service account), so `firestore.rules` keeps clients out. Admins manage them at `/admin`.

To make someone an admin, open Firestore in the Firebase console and add a document to the `admins` collection. The document ID is their uid (`discord:<Discord user ID>`), and the document can be empty. Anyone who signs in and opens `/admin` without access sees their uid there, ready to copy.

## Sample data

`src/mocks/` holds fictional games and events. They are used only by `npm run dev`: when the API returns nothing, or can't be reached, the page shows the samples instead and labels them 示範資料. Production builds leave them out.

## Local API

`npm run dev` proxies `/api` to the deployed Worker. To try Worker changes, including the admin page, without touching production, use the Firebase emulators. In the Claude desktop app these are the `firebase-emulators`, `worker-emulated` and `web-local-api` configurations in `.claude/launch.json`. By hand:

```sh
npx firebase emulators:start --only auth,firestore --project demo-gtspace
npx wrangler dev --port 8787 --var FIRESTORE_EMULATOR_HOST:localhost:8085 --var FIREBASE_AUTH_EMULATOR_HOST:localhost:9099 \
  --var 'FIREBASE_SERVICE_ACCOUNT:{"project_id":"demo-gtspace","client_email":"dev@demo-gtspace.iam.gserviceaccount.com","private_key":""}' \
  --var DISCORD_CLIENT_SECRET:unused
API_TARGET=http://localhost:8787 npm run dev -- --port 5198
```

Discord sign-in does not work against the emulators. To test the admin page there, sign the page in to the Auth emulator from the browser console (`connectAuthEmulator` and `signInWithCustomToken` with an unsigned token), and create `admins/<uid>` in the Firestore emulator.

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

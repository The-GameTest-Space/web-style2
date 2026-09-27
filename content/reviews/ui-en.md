# Review record: ui-en

- Section: ui-en, the English UI dictionary `src/i18n/messages/en.ts` (source `src/i18n/messages/zh-TW.ts`)
- Reviewer: gpt-6-sol via Codex CLI (`codex exec`, read-only, cwd `/Users/attitude/Developer/GTSpace/web2`)
- Thread: 01a0e49a-f63a-7a82-b6a2-b4cb50b6c8db (one session for both rounds)
- Rounds: 2 (round 1: 9 findings, CHANGES REQUESTED; round 2: CONSENSUS)
- Validator: `node $SP/reviews/check-messages.mjs en` passes (197 messages OK)

## Findings

1. `meta.admin` “Admin” → **fixed**: “Manage Events”.
2. `sample.events` “Sample data: real events coming” → **fixed**: “Sample data: we’re still gathering events”.
3. `home.join.meet` “Team up for game jams, meetups and expos” → **fixed**: “Get a group together for game jams, meetups and expos”.
4. `game.sampleCover` “Sample cover, to be replaced with the real game” → **fixed**: “Sample cover, to be replaced with a screenshot of the real game”.
5. `game.build` “Build” → **fixed**: “Version”.
6. `ongoing.mark` / `events.ongoing` / `event.longRunning` “Ongoing”, `event.since` “Since {date}”:
   - `event.since` → **fixed**: “From {date}” (works for a future start date).
   - “Ongoing” (three keys) → **defended, withdrawn**. The proposed “Long-term” measured 166px against a fixed 120px D-day column (“Ongoing” is 133px). “Ongoing” is the idiomatic label for open-ended listings, and the page shows the start date under the mark when the start is in the future.
7. `signIn.cancelled` “You cancelled on Discord, so you weren’t signed in.” → **fixed**: “You canceled authorization on Discord, so you weren’t signed in.”
8. `event.missing` “This event may have ended or been cancelled.” → **fixed**: “This event may have ended or been canceled.”
9. `intro.skip` “Skip →” → **fixed**: “Skip intro →”.

Author’s extra change, accepted by the reviewer: `signIn.checking` “Checking who you are with Discord” → “Confirming your identity with Discord”.

Held findings overridden: none.

## Source issues (for the product owner; not changed)

- `meta.events.title` / `meta.events.description`: the zh-TW source says events “in Taiwan” / for Taiwan’s developers, but the page lists events in Japan, Korea, China and Southeast Asia too. The English follows the source (“Game Dev Events in Taiwan”). The reviewer suggests “Game Dev Events Across Asia” and a description that names the wider coverage.
- `games.noMatch` tells people to pick another genre even when only the “seeking playtesters” filter is active. `events.noMatchFilter` says “this category” when the active filter may be a country or online-only. Both follow the source, which should instead say something about changing the active filters.

<!-- cross-model-review: approved by gpt-6-sol (codex exec, thread 01a0e49a-f63a-7a82-b6a2-b4cb50b6c8db) -->

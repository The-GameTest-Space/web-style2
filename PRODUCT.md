# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Taiwan's game-development community: indie developers (solo and small teams, students, hobbyists) who need other people to play their builds and give feedback, plus players and industry folks who want to discover local indie games and industry events. Visitors arrive from social posts, Discord shares, or event word-of-mouth, usually wanting one of three things: see what games are being made, find out what events are coming up, or join the Discord to get a game tested.

## Product Purpose

The Game Test Space (GTSpace) is a community hub. The website does three jobs:

1. **Promote indie games** — a showcase where community games are shared and discovered.
2. **Publish industry event information** — game jams, meetups, exhibitions, talks, deadlines.
3. **Funnel people into the Discord** — where developers find each other to playtest games.

Success: visitors understand what the community is for within seconds and join the Discord; developers see a reason to share their game here.

## Positioning

A space built around *playtesting*: developers testing each other's games. The site is the public face; the Discord is where the testing actually happens.

## Operating Context

- Primary interaction happens on Discord: https://discord.gg/yXfKQpAPN (the only confirmed real link).
- The site is read-mostly: browse games, browse events, open a detail page, click through to Discord.

## Capabilities and Constraints

- Stack: Vue 3 + Vite + vue-router + TypeScript. The site and its `/api/*` ship together as one Cloudflare Worker; events are stored in Firestore, which only the Worker touches.
- Pages: home, game list, event list, game detail, event detail, and `/admin` where admins (listed in Firestore `admins/{uid}`) create, edit, publish and delete events.
- Games have no store yet, so production shows none. Sample games and events exist only in local development (`npm run dev`), as a fallback when the API has nothing.
- Undecided: where games are stored, and a submission flow for games/events.

## Brand Commitments

- Name: **The Game Test Space** (short: GTSpace).
- Logo: four dots in a diamond (one orange `#FF6B2B`-ish at top, three near-black) framed by rounded camera/viewfinder corner brackets, on a warm off-white ground. Wordmark in a heavy, tightly-set grotesque.
- Language: Traditional Chinese (Taiwan) as primary; brand name and proper nouns stay in English.

## Evidence on Hand

- Discord invite: https://discord.gg/yXfKQpAPN
- Logo images supplied in chat (mark + horizontal lockup).
- No real games, member counts, partners, or testimonials exist yet. Events are real once an admin publishes them. Sample games/events appear only in local development and are always labeled 示範資料. Never invent member counts, stats, partner logos, or quotes presented as real.

## Product Principles

1. Discord is the destination — every path should make joining easy and obvious.
2. The games are the stars — the showcase gives indie work room and respect.
3. Events must be scannable — dates, place, and deadlines first.
4. Honest community — no fake numbers or manufactured social proof.

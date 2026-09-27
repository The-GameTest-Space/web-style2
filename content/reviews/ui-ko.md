# Review record: ui-ko

- Section: ui-ko — Korean UI dictionary, `src/i18n/messages/ko.ts` (source `src/i18n/messages/zh-TW.ts`)
- Author: Claude (Opus 5.5); reviewer: gpt-6-sol via Codex CLI (`codex exec`, read-only, cwd `/Users/attitude/Developer/GTSpace/web2`)
- Thread: 01a0e49b-c22e-74b2-a22b-ec612f1d76ea (one thread for both rounds)
- Rounds: 2 (r1: CHANGES REQUESTED, 8 findings; r2: CONSENSUS)
- Validator: `node check-messages.mjs ko` → `ko: 197 messages OK` after the edits

## Findings

1. `ongoing.mark` ‘상시’, `events.ongoing` ‘상시 행사’, `event.longRunning` ‘상시 진행’ (medium) — 상시 reads as "join anytime"; the ongoing entries are irregular/monthly series; source 長期. → **fixed**: ‘장기’ / ‘장기 행사’ / ‘장기 진행’ (author kept 진행 in the date cell instead of the proposed ‘장기 행사’; reviewer agreed).
2. `home.events` ‘다가오는 행사’ (low) — list also holds ongoing series; proposed ‘진행 중·예정 행사’. → **defended-withdrawn**: source 近期活動 (en "Upcoming events", ja 近日開催); dated events come first, ongoing series only fill remaining rows with their own 장기 mark and still have sessions ahead.
3. `games.seekingOnly` ‘테스터 모집 중만 보기’ (low) — ‘중만’ awkward, object missing. → **fixed**: ‘테스터 모집 중인 게임만 보기’.
4. `events.byType` ‘종류별로 행사 거르기’, `events.byCountry` ‘국가별로 행사 거르기’ (low) — inconsistent with 필터 elsewhere. → **fixed**: ‘종류별 행사 필터’ / ‘국가별 행사 필터’.
5. `events.noMatchFilter` ‘이 종류의 행사는 지금 없어요.’ (medium) — shown for any filter (country, online), not only type; source 此分類 is generic. → **fixed**: ‘선택한 조건에 맞는 행사가 지금은 없어요.’
6. `event.fee` ‘참가비’ (medium) — narrower than 費用; fee values include tickets, business passes, exhibitor terms. → **fixed**: ‘비용’.
7. `game.mark` ‘플레이했어요 스티커 붙이기’ (low) — sentence used as a sticker name needs quotes. → **fixed**: ‘‘플레이했어요’ 스티커 붙이기’.
8. `intro.skip` ‘건너뛰기 →’ (low) — source 跳過動畫 names what is skipped. → **fixed**: ‘애니메이션 건너뛰기 →’.

Totals: 7 fixed, 1 defended-withdrawn, 0 defended-held.

Reviewer's answers on the author's 10 judgement calls: the 스티커 metaphor, `discord.title` ‘지금 커뮤니티는’, `event.audience` ‘이런 분께 추천해요’, `event.until` ‘~ {date}’, `games.count` ‘게임 {n}개’, 《》 vs “” in the cover alts, `home.title`, and `event.untranslated` were judged sound; ‘거르기’ and ‘테스터 모집 중만 보기’ became findings 4 and 3. Particles after placeholders (`{n}명이`, `{date}부터`, `“{q}”에` …) judged correct.

## Source issues (zh-TW)

- `meta.events.title` 台灣遊戲開發活動 and `meta.events.description` 為台灣遊戲開發者整理的… scope the events page to Taiwan, but the site lists events in Japan, Korea, China and Southeast Asia too. ko follows the source (‘대만 게임 개발 행사’); reviewer's suggested Korean if the source changes: ‘아시아 게임 개발 행사’ / ‘아시아 각지의 게임잼…’.
- `games.noMatch` 目前沒有符合篩選條件的遊戲，請選擇其他類型。 tells people to pick another genre even when only the "seeking testers" filter is on; ko follows it faithfully. A fix at the source would point at the filters generally (e.g. ko ‘필터를 바꿔 보세요.’).

<!-- cross-model-review: approved by gpt-6-sol (codex exec, thread 01a0e49b-c22e-74b2-a22b-ec612f1d76ea) -->

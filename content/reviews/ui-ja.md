# Review record: ui-ja

- Section: ui-ja (Japanese UI dictionary)
- File under review: /Users/attitude/Developer/GTSpace/web2/src/i18n/messages/ja.ts (source: src/i18n/messages/zh-TW.ts)
- Reviewer model: gpt-6-sol (Codex CLI `codex exec`, read-only, cwd /Users/attitude/Developer/GTSpace/web2)
- Thread id: 01a0e49a-dfb0-7dc2-bd64-2b247857589d (one session for both rounds)
- Rounds: 2 (r1: CHANGES REQUESTED, 9 findings; r2: CONSENSUS)
- Validator: `node check-messages.mjs ja` → "ja: 197 messages OK" after the edits

## Findings

1. `home.join.title` (medium) 「テストプレイの感想は{br}Discord で。」 read as a request to send feedback; source means receiving it → fixed: 「Discord で受け取る{br}テストプレイの感想」
2. `home.join.lede` (medium) 「このサイトはゲームとイベントの紹介用で、実際のテストプレイは Discord でやりとりしています。…」 unnatural 「テストプレイはやりとり」 → fixed (split into two sentences): 「このサイトではゲームとイベントを紹介しています。テストプレイの募集や感想のやりとりは、Discord で行っています。参加すると、こんなことができます。」
3. `events.noMatchFilter` (medium) 「この種類のイベントは今のところありません。」 wrong when the country/online filter empties the list → fixed: 「今のところ、条件に合うイベントはありません。」
4. `meta.games.description` (low) 「最新のビルドを遊んで」 → fixed: 「最新のビルドをプレイして」
5. `game.plusYours` (low) 「、さらにあなたのシール」 doesn't join 「{n}人がプレイ」 → fixed: 「、あなたもプレイ済み」
6. `home.join.post` (low) 「メンバーにテストを頼む」 off-term → fixed: 「メンバーにテストプレイを頼む」
7. `header.skip` (low) 「本文へスキップ」 → defended (established Japanese skip-link wording; 本文 = main content) → withdrawn by reviewer
8. `events.suggestText` (low) 「掲載にふさわしいイベントがあれば…内容を確認して、このページに掲載します。」 stiff; 確認 not in source → fixed: 「紹介したいイベントがあれば、Discord で教えてください。情報を整理して、このページに掲載します。」
9. `event.today`／`event.closesToday` (low) 「本日開催」／「本日締め切り」 vs 「今日」 on the same screen → fixed: 「今日開催」／「今日締め切り」 (file now uses 今日 only)

Totals: 8 fixed, 1 defended-withdrawn, 0 defended-held.

## Source issues (zh-TW.ts; not changed)

- `meta.events.title` / `meta.events.description`: describe the events page as Taiwan-only (「台灣遊戲開發活動」「為台灣遊戲開發者整理的…」), but it now lists events in Japan, Korea, China and Southeast Asia. ja follows the source (「台湾の」).
- `games.noMatch`: 「請選擇其他類型」 doesn't fit a zero result caused by the 「僅顯示徵求測試中」 toggle alone.
- `event.sampleNote`: asserts every real event will carry the organizer's sign-up page, though an event's `url` is optional and may point to a details/ticket page.
- `events.noMatchFilter`: 「此分類目前沒有活動」 says "category" though the message also covers the country and online filters.

<!-- cross-model-review: approved by gpt-6-sol (codex exec, thread 01a0e49a-dfb0-7dc2-bd64-2b247857589d) -->

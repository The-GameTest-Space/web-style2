# Review record: events-ko

- Section: events-ko (Korean translation of 35 event entries)
- File: `/private/tmp/claude-501/-Users-attitude-Developer-GTSpace-web2/f32a4666-85a3-43df-b8df-505924e32180/scratchpad/i18n-ko.json` (generated from `build_ko.py`, checked by `validate_ko.py`)
- Reviewer model: gpt-6-sol (Codex CLI `codex exec`, read-only)
- Thread id: 01a0e498-aaf7-7fa3-8f37-6eefb9478ce6 (single session, 2 rounds)
- Result: validator passes after every edit (35 slugs, conditional fields, lengths, HTML tag sequence and whitespace nodes identical to source)

## Findings

1. `gameworks-exchange-day-2026` summary (medium): “한 번도 해 본 적 없는 사람들에게 현장에서 플레이와 피드백을 받아요.” → fixed: “개발 중인 게임으로 부스를 열어, 그 게임을 처음 접하는 사람들이 현장에서 직접 플레이해 보게 하고 피드백을 받아요.” Reviewer withdrew.
2. `g-con-2026` deadlineLabel (medium): “사전 등록 마감” → fixed: “사전 등록가 적용 마감” (source 預售價截止 refers to the presale price). Reviewer withdrew.
3. `kimu-meetups` description (low): “Global Game Jam과 Faust Game Jam의 남부 행사장을 주최해 왔고” → fixed: “…남부 지역 행사를 주최해 왔고”. Reviewer withdrew.
4. `tigg-meetups` summary + description (low): “Faust Game Jam 2026 타이중 행사장도 이들이 주최해요.” → fixed wording in both: “Faust Game Jam 2026의 타이중 지역 행사도 이들이 주최해요.”; repetition kept because the zh-TW source repeats it in both fields (reviewer agreed). Reviewer withdrew.
5. `indie-developers-conference-2026` description (low): “이번 주제는 인디 게임이 앞으로도 계속 ‘작품’으로 여겨지게 하는 것이고, …” → fixed: “이번 행사는 인디 게임을 앞으로도 계속 ‘작품’으로 바라보자는 주제를 내걸었어요. …”. Reviewer withdrew.

Totals: 5 fixed, 0 defended, 0 held.

## Judgement calls the reviewer confirmed

Descriptive names (핵융합(核聚变) 게임 카니발, 2026 스포트라이트 21일 게임 제작 챌린지, WePlay 문화 전시회, 중부 인디 게임 용사 교류회); `異校` left untranslated; addresses in Hangul; `·` (U+00B7) middle dot; `도시, 국가` city format; rebuilt titles (지스타 2026, 도쿄 게임쇼 2027, 비버롹스 2026, Hangul titles for Japanese-script events with the original name kept in the description).

## Source issues (zh-TW source, not the translation; left as the source has them)

- `unreal-fest-tokyo-2026`: source address 有明 3-11-1 vs official 3-4-10; source day-2 start 09:00 vs official doors 09:30.
- `tokyo-game-dungeon-14`: source says only 先行入場預售票 holders enter at 11:00; official page also lets business tickets in at 11:00.

<!-- cross-model-review: approved by gpt-6-sol (codex exec, thread 01a0e498-aaf7-7fa3-8f37-6eefb9478ce6) -->

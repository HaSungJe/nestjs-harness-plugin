---
description: 기획된 work.md 또는 change.md 기반으로 구현·테스트·리포트 진입 (신규/수정 자동 감지)
argument-hint: [<featureName>] (선택 — 생략 시 미구현 플랜 자동 탐색)
---

`.harness/docs/feature-implement/index.md` 의 절차를 그대로 따른다. 신규·수정 양쪽을 한 명령으로 처리하며, 모드는 인자와 파일 상태로 자동 판별한다.

- `$ARGUMENTS` 가 비어 있으면 → `.harness/output/` 전체를 스캔해 **미구현 플랜** (work.md / change-*.md) 자동 탐색. 후보 1개면 그대로 진행, 2개 이상이면 사용자에게 선택 요청, 0개면 중단·안내.
- `$ARGUMENTS` 가 기능명이면 → 해당 기능 디렉터리 내에서 신규(work.md) / 수정(change-*.md) 모드 자동 결정.

이 슬래시 커맨드는 한국어 키워드 `작업 시작` 또는 `<featureName> 작업 시작` 과 동등한 진입점이다.

⚠️ **전제 조건** (모드별 분리) 이 깨지면 구현 진입 금지 — 무엇이 부족한지 사용자에게 안내 후 중단.
- 신규 모드: `work.md` 존재 + request 결정사항 답변 + 사전 구현 항목 완료 + validator 통과
- 수정 모드: `change.md` 존재 + 결정사항 답변 + 사전 구현 항목 완료

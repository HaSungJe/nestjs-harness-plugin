---
description: 기존 기능에 대한 변경 기획 단계 진입 (change 문서 작성)
argument-hint: <featureName>
---

`$ARGUMENTS` 를 기능명(featureName)으로 보고, `.harness/docs/feature-modify-plan/index.md` 의 절차를 그대로 따른다.

이 슬래시 커맨드는 한국어 키워드 `<featureName> 기능 수정` 과 동등한 진입점이다.

원본 work.md / report.md 가 존재해야 하며 (전제 조건), 변경 사항을 담은 `change-<YYMMDD>-<N>.md` 초안을 작성한다. 다음 단계인 구현은 `/feature-implement` (또는 `작업 시작`) 로 진행 — 미추기 change.md 가 있으면 자동으로 "수정 모드" 로 라우팅된다.

---
description: 신규 기능 기획 단계 진입 (브랜치 분기 → request 초안 → work 작성)
argument-hint: <featureName>
---

`$ARGUMENTS` 를 기능명(featureName)으로 보고, `.harness/docs/feature-plan/index.md` 의 절차를 그대로 따른다.

이 슬래시 커맨드는 한국어 키워드 `<featureName> 기능 생성` 과 동등한 진입점이다. 인자가 비어 있으면 사용자에게 기능명·도메인을 되묻는다.

워크플로의 ①~④ 단계 (구두 설명 → 브랜치 분기 결정 → request.md → work.md) 를 처리하며, 다음 단계인 구현은 `/feature-implement` 로 진행. 브랜치 분기는 사전 검사로 자동 생략될 수 있음 — 같은 자동 브랜치 위에서 추가 work 를 누적할 때 질의 없이 이어감.

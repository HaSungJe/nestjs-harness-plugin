# 기능 수정 — 변경 기획 단계 (change.md 작성)

기존에 만들어진 기능에 대한 **변경 기획 단계** — 영향 범위 분석 후 회차별 `change-<YYMMDD>-<N>.md` 문서를 작성한다. 한국어 키워드 `<featureName> 기능 수정` 또는 슬래시 `/feature-modify-plan` 으로 진입.

이후 구현·테스트·리포트 추기는 **신규 구현과 같은 명령** 으로 진행:
- 한국어: `작업 시작` 또는 `<featureName> 작업 시작` (인자 생략 시 미구현 플랜 자동 탐색)
- 슬래시: `/feature-implement` 또는 `/feature-implement <featureName>`
- 상세: [../feature-implement/index.md](../feature-implement/index.md) — 수정 모드 섹션 참고

## 전체 단계 개요 (참고)

```
─── 변경 기획 단계 (이 문서) ───
① 사람 → "xxx 기능 수정" + 변경사항 구두 설명
①.5 Claude → 전제 검증 (원본 work.md / report.md 존재 확인)
①.6-a Claude → 브랜치 사전 검사: 현재 브랜치가 이미 자동 생성 feature 브랜치면
              질의 생략하고 그대로 ② 진입 (feature-plan 패턴 재사용)
①.6-b Claude → (사전 검사 통과 못 한 경우) 브랜치 분기 질의
② Claude → 기존 request/work/report 읽고 영향 범위 파악
③ Claude → change-<YYMMDD>-<N>.md 초안 작성
           (모호한 결정사항 있으면 "확정 설계 결정사항" 섹션에 [ ] 로 나열)
④ 사람 → change 파일 검토 + 결정사항 답변 → "작업 시작" 또는 "/feature-implement"

─── 구현 단계 (feature-implement 의 "수정 모드") ───
⑤ 사람 → change 파일 검토 후 Claude에게 직접 구현 지시 ("작업 시작" 또는 /feature-implement)
         ※ 위 ④ 의 "다음 단계 진입" 과 동일 시점 — Claude 측에서 ⓪ 모드 결정 자동 실행
⑥ Claude → 구현 + spec 수정/추가
⑦ Claude → 테스트 실행 → 자가 수복 (최대 10회)
⑧ Claude → 기존 report.md 끝에 "## 수정 - <YYMMDD>-<N>" 섹션 추가
```

---

## ⚠️ ①.5 단계 전제 조건 (필수 사전 검증)

`xxx 기능 수정` 명령을 받으면 change.md 작성 **전에** 아래를 순서대로 확인:

1. **원본 work.md 존재 여부** — `.harness/output/work/<domain>/<featureName>-work.md` 가 실제로 존재하는가?
   - 존재하지 않으면 **즉시 중단** 하고 안내:
     > "해당 기능의 work 파일이 없습니다. 기존에 만들어진 기능이 아닙니다. `<featureName> 기능 생성` 으로 신규 생성하세요."
2. **원본 report.md 존재 여부** — `.harness/output/report/<domain>/<featureName>-report.md` 가 존재하는가?
   - 존재하지 않으면 **즉시 중단** 하고 안내:
     > "해당 기능의 report 파일이 없습니다. 구현이 완료되지 않은 기능에 대한 수정은 `xxx 작업 시작` 으로 처리하세요."

전제 위반이면 ①.5 단계 이하 진입 금지.

## ①.6 브랜치 분기 질의

전제 검증 통과 후 change.md 작성 **직전** 에 [feature-plan/index.md](../feature-plan/index.md) 의 "브랜치 자동화" 섹션 절차를 그대로 따른다 — **사전 검사 → 질의 → 분기** 3단계.

요약:

1. **사전 검사** — 현재 브랜치가 `.harness/.auto-branch-state.json` 의 키로 등록되어 있으면 (= 이전 단계에서 자동 생성된 feature 브랜치) **질의 생략 후 그대로 이어간다**. 다중 work / 다중 change 를 한 사이클에 쌓을 때 매번 묻지 않기 위함.
2. **질의** (사전 검사 통과 못 한 경우):
   > "이 수정 작업을 위한 새 작업 브랜치를 만들까요? (예 / 아니오)
   >  - 예 → `feature/<domain>-<랜덤6>` 브랜치 생성 후 그 위에서 진행. 푸쉬 시 자동으로 현재 브랜치(`<base>`) 로 머지.
   >  - 아니오 → 현재 브랜치(`<base>`) 에서 그대로 진행. 푸쉬 시 일반 절차."
3. **분기 처리** — state 파일 갱신·푸쉬 시 머지 동작은 feature-plan 과 동일.

## ② 단계 — 영향 범위 파악

다음 파일을 읽어 변경요청이 닿는 범위를 식별:

- `.harness/output/request/<domain>/<featureName>-request.md`
- `.harness/output/work/<domain>/<featureName>-work.md`
- `.harness/output/report/<domain>/<featureName>-report.md`
- 같은 도메인 내 이전 회차 change 파일 (있을 경우)

식별 시 확인 항목:
- 어떤 DTO / Repository 메서드 / Service 메서드 / Controller 엔드포인트가 영향받는지
- `affected_tables` 가 바뀌는지 (duplicate 테스트 케이스 수에 영향)
- 새 service throw 분기 / repository catch 블록이 추가되는지
- 응답 코드가 바뀌는지

## ③ 단계 — change 파일 초안 작성

- 템플릿: `.harness/templates/change.md`
- 저장 위치: `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md`
- 파일 작성 규칙 상세 → [change-file.md](./change-file.md)
- "확정 설계 결정사항" 작성 가이드는 feature-plan 의 [design-decisions.md](../feature-plan/design-decisions.md) 와 동일

## ④ 단계 — 사용자 검토 + 다음 단계 진입

사용자가 change 파일 검토 + "확정 설계 결정사항" 답변 후, `작업 시작` (또는 `<featureName> 작업 시작`) / `/feature-implement` 로 구현 단계 진입. 구현 명령은 신규/수정을 자동 라우팅 — change.md 가 미구현 상태로 존재하므로 자동으로 **수정 모드** 진입.

---

## 관련 규칙

- change 파일 작성 규칙 → [change-file.md](./change-file.md)
- 확정 설계 결정사항 작성 가이드 → [../feature-plan/design-decisions.md](../feature-plan/design-decisions.md)
- 브랜치 자동화 (state 파일 형식·푸쉬 동작) → [../feature-plan/index.md](../feature-plan/index.md) 의 "브랜치 자동화" 섹션
- 구현 단계 (다음) → [../feature-implement/index.md](../feature-implement/index.md) — "수정 모드" 섹션

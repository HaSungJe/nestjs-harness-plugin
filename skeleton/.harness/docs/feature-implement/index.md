# 작업 시작 — 구현 단계 (신규 / 수정 자동 라우팅)

"작업 시작" / `/feature-implement` 명령을 받으면 이 문서를 따른다. **한 명령으로 신규 구현·기존 기능 수정 구현 양쪽을 처리** 하며, 모드는 인자와 파일 상태로 자동 판별한다. 워크플로 **⓪ (인자 파싱·모드 결정) + ⑤~⑧ (구현·테스트·자가수복·리포트)** 를 수행한다.

이전 단계 (모드에 따라 다름):
- **신규 모드** ← `<featureName> 기능 생성` / `/feature-plan` → [../feature-plan/index.md](../feature-plan/index.md) 가 만든 `work.md`
- **수정 모드** ← `<featureName> 기능 수정` / `/feature-modify-plan` → [../feature-modify-plan/index.md](../feature-modify-plan/index.md) 가 만든 `change-<YYMMDD>-<N>.md`

---

## ⓪ 단계 — 인자 파싱 + 모드 자동 결정

### A. 인자 있음 — `<featureName>` 제공된 경우

해당 기능에 한정해 모드 결정. **수정 모드 우선** 으로 검사 (수정 작업 도중에 또 다른 수정을 막기 위함):

1. **수정 모드 후보 검사** — `.harness/output/change/<domain>/<featureName>-change-*.md` 가 존재하는가?
   - Bash: `ls .harness/output/change/*/<featureName>-change-*.md 2>/dev/null`
   - 가장 큰 `<YYMMDD>-<N>` 조합 = 최신 회차
   - 그 회차가 `report.md` 끝의 `## 수정 - <YYMMDD>-<N>` 헤더로 이미 추기되어 있으면 → 미구현 아님 (다음 단계 검사)
   - 추기 안 된 최신 회차가 있으면 → **수정 모드 확정**
2. **신규 모드 후보 검사** — `.harness/output/work/<domain>/<featureName>-work.md` 존재 + 같은 경로의 `report/<domain>/<featureName>-report.md` 부재?
   - Bash: `ls .harness/output/work/*/<featureName>-work.md 2>/dev/null`
   - 짝이 되는 report 가 아직 없으면 → **신규 모드 확정**
   - report 까지 이미 있다면 → 신규 미구현 아님
3. 1·2 모두 해당 없음 → 즉시 중단:
   > "<featureName> 의 미구현 플랜이 없습니다. `<featureName> 기능 생성` (`/feature-plan`) 또는 `<featureName> 기능 수정` (`/feature-modify-plan`) 으로 먼저 작성하세요."
4. **드문 경우 — 둘 다 미구현** (예: 신규 work 가 아직 구현 안 됐는데 수정 change 가 작성됨) → 비정상 상태이므로 사용자에게 어느 쪽을 진행할지 명시적으로 묻고 답변받은 뒤 진행.

### B. 인자 없음 — 자동 탐색

`.harness/output/` 전체를 스캔해 **미구현 플랜 후보** 수집:

- **신규 후보** — `work/<domain>/*-work.md` 파일 중 짝이 되는 `report/<domain>/*-report.md` 가 없는 항목
- **수정 후보** — `change/<domain>/*-change-<YYMMDD>-<N>.md` 의 가장 최신 회차가 `report.md` 끝 섹션에 추기 안 된 항목 (도메인·기능 별로 회차 그룹핑 후 max 회차 검사)

후보 처리:
- **0개** → 중단:
  > "구현할 플랜이 없습니다. `/feature-plan <featureName>` (신규 기획) 또는 `/feature-modify-plan <featureName>` (변경 기획) 으로 먼저 작성하세요."
- **1개** → 그대로 진행. 진입 직전에 사용자에게 어떤 기능·모드인지 한 줄 안내 후 곧바로 ⑤단계 진입:
  > "`<featureName>` 의 [신규 / 수정] 구현을 진행합니다. 다른 작업을 원하시면 지금 중단 지시해주세요."
- **N개 (N ≥ 2)** → 사용자에게 목록 표시 후 선택 요청. **자동으로 N건을 연달아 처리하지 않는다** — 한 번에 1건씩이 안전:
  ```
  [미구현 플랜이 N개 있습니다]
  1) 회원상세정보-api  (신규, work.md, user 도메인, 04-30 14:21)
  2) 회원가입-api      (수정, change-260430-1.md, user 도메인, 04-30 15:02)
  ...
  번호를 선택하세요. 선택한 1건만 이번 작업으로 진행합니다.
  ```
  → 선택 결과로 모드·기능명 확정 후 진행

### C. 모드 결정 후 분기

이후 절차는 모드별로 분기. **각 모드 섹션의 전제 조건을 반드시 먼저 검증** 한 뒤 ⑥단계로 진입:

- **신규 모드** → 아래 [신규 모드] 섹션
- **수정 모드** → 아래 [수정 모드] 섹션

---

## 신규 모드 — work.md 기반 신규 구현

### ⚠️ 전제 조건 (필수 사전 검증)

신규 구현 시작 **전에** Claude 는 반드시 아래를 순서대로 확인:

1. **work.md 존재 여부** — `.harness/output/work/<domain>/<featureName>-work.md` 가 실제로 존재하는가?
   - 없으면 즉시 중단:
     > "해당 기능의 work 파일이 없습니다. 먼저 `<featureName> 기능 생성` 으로 request/work 를 작성하세요."
2. **request.md '확정 설계 결정사항' 미답 항목 없음** — request.md 의 `[ ]` 체크리스트가 모두 채워져 있어야 함. 미답 시 중단·재질의.
3. **work.md '사전 구현 필요 항목' 전부 완료** — 섹션이 존재하면 모든 체크박스가 `[x]` 상태여야 함. 미완료 항목 하나라도 있으면 중단:
   > "아래 사전 구현 항목이 아직 완료되지 않았습니다: <항목 나열>. 별도 작업으로 구현 후 work.md 에서 체크박스를 [x] 로 업데이트한 뒤 다시 시도하세요."
4. **work.md validator 통과** — `node .harness/validators/validate-work.js <path>` 실행해 구조·섹션 검증 통과 확인.

위 4조건 모두 만족하지 않으면 **⑥단계 이하로 진입하지 않는다.** 사용자가 "강제로 진행" 을 지시해도 어떤 전제가 깨졌는지 먼저 안내한 뒤 명시적 승인 후에만 진행.

### 브랜치

브랜치 분기 결정은 **기능 생성 ①.5 단계 (사전 검사 → 질의) 시점에 이미 끝나 있음** — [../feature-plan/index.md](../feature-plan/index.md) 의 "브랜치 자동화" 섹션 참고. 구현 시점에 별도 브랜치 질의/체크 없이 현재 브랜치에서 그대로 진행.

### 단계

```
⑤ 사람 → work 파일 검토 후 Claude에게 직접 구현 지시 ("xxx 작업 시작" 또는 /feature-implement)
⑥ Claude → 구현 코드 + spec 파일 동시 생성 (spec 경로: harness-config.json 의 test_spec_path 설정값)
⑦ Claude → Bash로 해당 기능 spec만 실행 (npm test -- --testPathPatterns=<featureName>)
           → 실패 시 에러 분석 후 수정 (최대 10회)
⑧ Claude → 리포트 생성: .harness/output/report/<domain>/<featureName>-report.md
```

### 리포트 규칙

- 템플릿: `.harness/templates/report.md`
- 저장 위치: `.harness/output/report/<domain>/<featureName>-report.md`
- 생성 타이밍: ⑧ 단계 — `npm test` 전체 통과 직후 (⑦ 자가수복 통과)
- 포함 내용:
  - 기능 요약 (feature_goal, domain, API)
  - 생성/수정된 파일 목록
  - 테스트 결과 (스위트 수, 통과/실패)
  - 자가 수복 이력 (재시도가 있었을 경우 원인·수정 내용)
  - 잔여 이슈

---

## 수정 모드 — change.md 기반 수정 구현

### ⚠️ 전제 조건 (필수 사전 검증)

수정 구현 시작 **전에** Claude 는 반드시 아래를 순서대로 확인:

1. **change.md 존재 여부** — `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md` 의 가장 최신 회차 파일이 존재하는가?
   - Bash: `ls .harness/output/change/*/<featureName>-change-*.md` → 가장 큰 `<YYMMDD>-<N>` 조합이 이번 회차
   - 없으면 즉시 중단:
     > "해당 기능의 change 파일이 없습니다. 먼저 `<featureName> 기능 수정` (`/feature-modify-plan`) 으로 change 문서를 작성하세요."
2. **change.md '확정 설계 결정사항' 미답 항목 없음** — `[ ]` 체크리스트가 모두 채워져 있어야 함. 미답 시 중단·재질의.
3. **change.md '사전 구현 필요 항목' 전부 완료** — 섹션이 존재하면 모든 체크박스가 `[x]` 상태여야 함. 미완료 시 중단.

위 3조건 모두 만족하지 않으면 **⑥단계 이하로 진입하지 않는다.**

### 브랜치

브랜치 분기 결정은 **`<featureName> 기능 수정` (`/feature-modify-plan`) 의 ①.6 단계 (사전 검사 → 질의) 시점에 이미 끝나 있음** — 구현 시점에 별도 브랜치 질의/체크 없이 현재 브랜치에서 그대로 진행.

### 단계

```
⑤ 사람 → change 파일 검토 후 Claude에게 직접 구현 지시 ("작업 시작" 또는 /feature-implement)
⑥ Claude → 구현 (change.md 의 "변경 후 스펙" 반영) + spec 수정/추가
⑦ Claude → 해당 기능 spec + 도메인 회귀 테스트 (npm test -- --testPathPatterns=<featureName>) 실행
           → 실패 시 자가 수복 (최대 10회)
⑧ Claude → 기존 report.md 끝에 "## 수정 - <YYMMDD>-<N>" 섹션 추기
```

### ⑥~⑦ — 구현 / 테스트 상세

- **구현**: change.md 의 "변경 후 스펙" 그대로 반영
- **spec 파일 수정/추가**: 새 분기 발생 시 해당 카테고리 케이스 추가, 제거된 분기는 케이스 삭제
- **테스트 실행**: `npm test -- --testPathPatterns=<featureName>`
  - 실패 시 에러 분석 후 수정 (최대 10회)
- **도메인 회귀 테스트**: `npm test -- --testPathPatterns=src/api/v1/<domain>` 으로 본 기능 외 spec 영향 확인
  - 수정에 의한 회귀 발견 시 즉시 처리 (기존 실패라며 떠넘기지 않음)
- 테스트 강도 규칙은 신규 모드와 동일 → [test-file.md](./test-file.md)

### ⑧ — report 추기 (수정 모드 전용)

원본 report 파일은 **삭제·재작성하지 않고**, 끝에 회차별 섹션을 누적 추가:

- 위치: `.harness/output/report/<domain>/<featureName>-report.md` (기존 파일에 append)
- 헤더 형식: `## 수정 - <YYMMDD>-<N>` (change 파일과 같은 회차 키 사용)
- 포함 내용:
  - **변경사항 요약** — change.md 의 "변경요청 사유" 한두 줄 요약
  - **수정/추가/삭제된 파일 목록** — change.md 의 "영향받는 파일" 표 기반
  - **테스트 결과** — 스위트 수, 통과/실패
  - **자가 수복 이력** — 재시도가 있었을 경우 원인·수정 내용
  - **잔여 이슈** — 없으면 "없음"

추기 예시:

```markdown
## 수정 - 260428-1

### 변경사항 요약
관리자 회원가입 시 `nickname` 길이 제약을 2~12자에서 2~20자로 확장.

### 수정/추가/삭제된 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/api/v1/user/dto/admin-sign.dto.ts` | 수정 | nickname 의 @MaxLength 12 → 20 |
| `src/api/v1/user/test/admin-sign.spec.ts` | 수정 | nickname 길이 경계 케이스 갱신 |

### 테스트 결과
- 스위트: 1 / 전체: 12 / 통과: 12 / 실패: 0

### 자가 수복 이력
없음 — 최초 실행 통과

### 잔여 이슈
없음
```

### 원본 보존 정책 (수정 모드)

- **request.md / work.md** — 수정 금지, 참조만
- **change.md** — 회차별로 분리되어 초기 설계 ↔ 현재 설계 비교 가능. 한 번 작성한 회차는 수정 금지
- **report.md** — 수정 대신 끝에 추기. 한 기능의 전체 이력을 한 파일에서 추적

---

## 관련 규칙

- 테스트 파일 규칙 + 강도 규칙 → [test-file.md](./test-file.md)
- change 파일 작성 규칙 (수정 모드 입력) → [../feature-modify-plan/change-file.md](../feature-modify-plan/change-file.md)
- 신규 기획 단계 → [../feature-plan/index.md](../feature-plan/index.md)
- 변경 기획 단계 → [../feature-modify-plan/index.md](../feature-modify-plan/index.md)

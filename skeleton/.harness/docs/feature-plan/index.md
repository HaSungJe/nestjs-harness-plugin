# 기능 생성 — 기획 단계 (request → work)

"xxx 기능 생성" 명령을 받으면 이 문서를 따른다.
워크플로의 **①~④ 단계**를 수행한다 (구두 설명 → 브랜치 분기 결정 → request.md → work.md 작성까지). 브랜치 분기는 사전 검사 (자동 생성 브랜치 위면 질의 생략) → 질의 → 처리의 3단계로 진행.

## 단계

```
① 사람 → 기능을 구두로 설명
①.5-a Claude → 사전 검사: 현재 브랜치가 이미 자동 생성 feature 브랜치 (state JSON 키 매칭) 이면
              질의 생략하고 그대로 ② 진입 (멀티 work 한 사이클에 쌓는 케이스)
①.5-b Claude → (사전 검사 통과 못 한 경우) "새 작업 브랜치를 만들까요?" 사용자에게 질의
              예: feature/<domain>-<rand6> 생성·체크아웃 + base 브랜치 state 파일에 기록
              아니오: 현재 브랜치 유지
              상세: 아래 [브랜치 자동화] 섹션
② Claude → .harness/output/request/<domain>/<featureName>-request.md 초안 작성 (.harness/templates/request.md 기반).
           코드 컨벤션만으로 판단이 애매한 항목은 request.md "확정 설계 결정사항" 섹션에 질문으로 나열 (답은 비워둠)
③ 사람 → request 파일 보완 + "확정 설계 결정사항" 답변 후 Claude에게 work 작성 지시
④ Claude → "확정 설계 결정사항" 답변 반영하여 .harness/output/work/<domain>/<featureName>-work.md 작성
           (.harness/templates/work.md 기반). 미답 항목이 있으면 작성 중단하고 사용자에게 재질의
```

## 브랜치 자동화

기능 생성 요청을 받으면 request.md 작성 **직전** 에 다음 절차로 브랜치를 결정한다.

### ①.5-a 사전 검사 — 이미 자동 생성 브랜치 위인가?

질의 **전에** 다음을 확인:

1. 현재 브랜치명 = `git branch --show-current`
2. `.harness/.auto-branch-state.json` 읽기 (없으면 `{}`)
3. 현재 브랜치명이 state JSON 의 **키로 존재하는가?**
   - **YES → 질의 생략** + 사용자에게 한 줄 안내:
     > "현재 자동 생성 브랜치 `<feature/...>` 에서 작업을 이어갑니다 (base: `<base>`). 새 브랜치 생성·질의 없이 그대로 ② 단계 진입."
     → 즉시 ② 단계로 진입 (state JSON 갱신 불필요 — 이미 항목 존재)
   - **NO → ①.5-b 질의** 진행

### ①.5-b 질의 (사전 검사 통과 못 한 경우)

> "이 기능을 위한 새 작업 브랜치를 만들까요? (예 / 아니오)
>  - 예 → `feature/<domain>-<랜덤6>` 브랜치 생성 후 그 위에서 진행. 푸쉬 시 자동으로 현재 브랜치(`<base>`) 로 머지.
>  - 아니오 → 현재 브랜치(`<base>`) 에서 그대로 진행. 푸쉬 시 일반 절차."

현재 브랜치는 `git branch --show-current` 로 확인해 `<base>` 자리에 표시.

#### "예" 분기
1. base 브랜치 = 현재 브랜치 (`git branch --show-current` 결과)
2. 브랜치명 생성: `feature/<domain>-<6자리 16진수>`
   - `<domain>` 은 사용자 구두 설명에서 추출 (request.md 의 `domain` 과 동일 값)
   - 6자리 hex 생성 예: `node -p "require('crypto').randomBytes(3).toString('hex')"`
3. `git checkout -b <feature브랜치>` 실행
4. **state 파일 갱신** — `.harness/.auto-branch-state.json` 에 `{"<feature브랜치>": "<base>"}` 항목 추가
   - 파일이 없으면 `{}` 로 생성 후 추가
   - 항목은 push 가 정상 완료되면 자동 삭제됨 ([git-push/index.md](../git-push/index.md) 참고)
5. 이후 ② 단계 진입 — request.md 는 새 feature 브랜치 위에서 작성됨

#### "아니오" 분기
브랜치 변경 없이 현재 브랜치에서 그대로 ② 단계 진입. 푸쉬 시점엔 [git-push/index.md](../git-push/index.md) 의 "일반 푸쉬" 절차 적용.

### state 파일 형식
- 위치: `.harness/.auto-branch-state.json` (gitignore 됨, 세션 로컬)
- 형식:
  ```json
  {
    "feature/user-a3f9c2": "main",
    "feature/order-x1y2z3": "develop"
  }
  ```
- 키: 자동 생성된 feature 브랜치명
- 값: 그 브랜치를 만들 당시의 base 브랜치명
- 푸쉬 절차에서 lookup 후 머지·삭제됨 → 푸쉬 직후 새 사이클 시작 시점에서는 다시 질의가 뜸 (의도된 동작 — 한 사이클 안에서만 질의 생략)

### state 파일 갱신 예시 (Node 사용)

```bash
node -e "
const fs = require('fs');
const p = '.harness/.auto-branch-state.json';
const s = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
s['$FEATURE'] = '$BASE';
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
"
```

## 파일 명명 규칙

- request 파일: `<featureName>-request.md` → `.harness/output/request/<domain>/`
- work 파일: `<featureName>-work.md` → `.harness/output/work/<domain>/`
- 구두 요청 시 work 파일만 생성 가능

## 관련 규칙

- 확정 설계 결정사항 (request.md 질문 작성 시) → [design-decisions.md](./design-decisions.md)
- work 파일 작성 규칙 → [work-file.md](./work-file.md)

## 이후 단계

work 파일 검토 완료 후 사용자가 "xxx 작업 시작" 으로 다음 단계 지시 → [../feature-implement/index.md](../feature-implement/index.md)

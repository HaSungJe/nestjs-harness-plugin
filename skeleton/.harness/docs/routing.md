# Harness 인덱스

각 명령은 **두 가지 진입점**을 가진다:

- **한국어 키워드** — 자연어 채팅에서 인식. 트리거 시 Claude 가 이 인덱스를 읽고 상세 문서로 점프.
- **슬래시 커맨드** — `.claude/commands/<name>.md` 에 등록된 Claude Code 슬래시. 사용자가 명시적으로 `/<name>` 입력 시 동일한 상세 문서로 점프.

두 진입점은 **완전히 동일한 동작**을 한다. 슬래시는 Claude Code 환경에서 디스커버리·인자 전달이 깔끔한 대안이고, 한국어 키워드는 자연어 흐름에 통합되는 방식.

CLAUDE.md 의 명령어 라우팅이 이 파일을 가리키면, 아래 표에서 요청에 해당하는 항목을 찾아 링크된 문서를 읽고 그 규칙대로 실행한다. **해당 항목을 찾지 못하면 하네스 외의 요청으로 판단해 일반 채팅/작업으로 처리**한다.

## 도메인 생성

| 한국어 키워드 | 슬래시 커맨드 | 상세 문서 |
| --- | --- | --- |
| `<domain> 도메인 생성` | `/domain-create <domain>` | [domain-create/index.md](./domain-create/index.md) |

## 기능 — 신규 기획

| 한국어 키워드 | 슬래시 커맨드 | 상세 문서 |
| --- | --- | --- |
| `<featureName> 기능 생성` | `/feature-plan <featureName>` | [feature-plan/index.md](./feature-plan/index.md) |

## 기능 — 변경 기획

| 한국어 키워드 | 슬래시 커맨드 | 상세 문서 |
| --- | --- | --- |
| `<featureName> 기능 수정` | `/feature-modify-plan <featureName>` | [feature-modify-plan/index.md](./feature-modify-plan/index.md) |

## 기능 — 구현 (신규·수정 자동 라우팅)

신규 기획(`work.md`) 과 변경 기획(`change-*.md`) **둘 다 동일한 명령으로 진입**한다. 모드는 인자·파일 상태로 자동 판별 — 인자를 생략하면 미구현 플랜을 자동 탐색.

| 한국어 키워드 | 슬래시 커맨드 | 상세 문서 |
| --- | --- | --- |
| `작업 시작` 또는 `<featureName> 작업 시작` | `/feature-implement` 또는 `/feature-implement <featureName>` | [feature-implement/index.md](./feature-implement/index.md) |

## 배포

| 한국어 키워드 | 슬래시 커맨드 | 상세 문서 |
| --- | --- | --- |
| `작업내용 커밋해줘` | `/git-commit` | [git-commit/index.md](./git-commit/index.md) |
| `작업내용 푸쉬해줘` | `/git-push` | [git-push/index.md](./git-push/index.md) |

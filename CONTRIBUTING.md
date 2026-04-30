# Contributing

플러그인 **메인테이너** 용 가이드. 사용자 프로젝트로 배포되지 않음.

## Dev 환경 — 이 repo 에서 슬래시 커맨드 테스트하기

이 repo (`nestjs-harness-plugin`) 의 `skeleton/.claude/commands/*.md` 는 **사용자 프로젝트로 복사되는 템플릿** 이라 이 dev repo 자체에는 슬래시가 등록 안 됨. Claude Code 에서 직접 `/feature-implement` 같은 명령을 테스트하려면:

```bash
npm run dev:sync
```

위 스크립트가 `skeleton/.claude/commands/` → `.claude/commands/` 로 복사 (전량 wipe 후 재복사). 사본은 `.gitignore` 처리되어 커밋되지 않음.

> 슬래시 커맨드를 수정한 뒤 다시 테스트하려면 매번 `npm run dev:sync` 재실행. Claude Code 도 reload 필요할 수 있음.

대안: 빈 디렉터리에서 `node bin/cli.js init` 실행해 정상 install 경로로 검증.

## 새 명령 추가

각 명령은 **두 진입점** 을 가져야 한다 — 한국어 키워드 + 슬래시 커맨드. 둘은 동일한 `docs/<command>/index.md` 를 가리키므로 결과 동작은 같다. **5곳을 모두 갱신** 해야 사용자가 어느 경로로 들어와도 막히지 않는다.

> **네이밍 규칙**: 슬래시 이름과 docs 폴더 이름을 **1:1 매칭** 시킨다. 예: `/feature-plan` ↔ `docs/feature-plan/`. 기획·구현이 분리되는 명령은 `-plan` / `-implement` 접미어로 명명. git 관련은 `git-` 접두어 (`/git-commit`, `/git-push`).
>
> **모드 통합 패턴**: 같은 후속 단계(예: 구현·테스트·리포트)를 여러 기획 줄기가 공유한다면, **단일 슬래시 + 자동 모드 라우팅** 으로 통합한다. 예: `/feature-implement` 가 신규(`work.md`) / 수정(`change-*.md`) 둘을 인자·파일 상태로 자동 판별. 사용자 인지 부담을 줄이고 명령 표면적을 작게 유지하기 위함.

### ① `skeleton/.harness/docs/<command>/index.md` 생성

명령 1개당 **폴더 1개, index.md 1개**. 하위 규칙이 없는 명령도 동일 구조 유지 (일관성).

```
skeleton/.harness/docs/<command>/
├── index.md           # 메인 실행 규칙 (필수)
└── <sub-rule>.md      # (선택) 단계별 세부 규칙
```

index.md 권장 섹션:

````markdown
# <명령 이름> — 한 줄 설명

한국어 키워드 `xxx <키워드>` 또는 슬래시 `/<command>` 로 진입.

## 단계
1. ...
2. ...

## 관련 규칙 (하위 규칙이 있을 때만)
- <역할> → [sub-rule.md](./sub-rule.md)

## 이후 단계 (다음 명령으로 이어질 때만)
→ [../<next-command>/index.md](../<next-command>/index.md)
````

### ② `skeleton/.claude/commands/<command>.md` 생성 (슬래시 진입점)

폴더명과 동일한 파일명. 본문은 `docs/<command>/index.md` 로 위임하는 얇은 wrapper.

````markdown
---
description: <한 줄 설명 — Claude Code 슬래시 메뉴에 표시됨>
argument-hint: <인자 형식 — 예: <featureName> 또는 (선택) ...>
---

`$ARGUMENTS` 를 <역할> 로 보고, `.harness/docs/<command>/index.md` 의 절차를 그대로 따른다.

이 슬래시 커맨드는 한국어 키워드 `xxx <키워드>` 와 동등한 진입점이다.

⚠️ <전제 조건이 있으면 한 줄 요약>
````

### ③ `skeleton/.harness/docs/routing.md` 에 1행 추가

현재 routing.md 는 5개 섹션으로 나뉨 — `## 도메인 생성` / `## 기능 — 신규 기획` / `## 기능 — 변경 기획` / `## 기능 — 구현 (신규·수정 자동 라우팅)` / `## 배포`. 적절한 섹션의 표에 한 행을 추가 (없으면 섹션 신설). **3컬럼 형식** 유지:

````markdown
| `<자연어 트리거>` | `/<slash> <args>` | [<command>/index.md](./<command>/index.md) |
````

### ④ `skeleton/.harness/samples/starter/CLAUDE.sample.md` 두 곳 갱신

"## 플러그인 설정 > 명령어 라우팅" 블록 안에서:

**(a) 한국어 키워드 bullet 리스트** (`**1) 한국어 키워드**` 아래) 에 1줄 추가:

````markdown
- `키워드N` (예: `xxx 키워드N`) — 설명
````

**(b) 슬래시 bullet 리스트** (`**2) 슬래시 커맨드**` 아래) 에 1개 추가 — 같은 그룹의 다른 슬래시들과 함께 한 줄에:

````markdown
- `/<slashN> <args>` · ...
````

### ⑤ `README.md` 워크플로 표 / 전제 조건 표에 새 행 추가

새 명령이 워크플로 단계 중 어디에 들어가는지 사용자가 한눈에 보게:
- "단계별 워크플로" 표의 "관련 명령" 컬럼에 한국어/슬래시 병기
- "전제 조건" 표에 새 행 (전제가 있는 명령만)
- "설치되는 것" 표의 "커스텀 슬래시 커맨드" 행에 새 슬래시 추가

### ⑥ 검증 체크리스트

- [ ] 키워드·슬래시 이름이 기존 명령과 겹치지 않는가
- [ ] 슬래시 이름이 docs 폴더명과 1:1 매칭인가 (예: `/feature-plan` ↔ `docs/feature-plan/`)
- [ ] 이전·이후 단계가 있는 명령이면 양방향 링크 걸었는가 (`이후 단계` / `전제`)
- [ ] `docs/routing.md` 의 키워드·슬래시 표기가 `CLAUDE.sample.md` 와 일치하는가
- [ ] `.claude/commands/<name>.md` frontmatter 의 `description` 이 routing.md 의 표 설명과 의미 일치하는가
- [ ] 두 진입점 모두 실제 동작 테스트 — 한국어 키워드 입력 + `/<slash>` 입력 모두 같은 결과인지

### 키워드 작성 요령

- 전체 키워드는 3~7개 내외 유지 — 너무 많으면 일반 요청까지 오인
- 한국어 동사/명사 중심이 잘 동작 (예: `커밋`, `푸쉬`, `도메인 생성`)
- 기존 명령과 키워드 중복 금지

---

## 명령 제거 / 이름 변경

새 구조에서 명령 변경 시 **7곳을 모두** 갱신:

- [ ] `skeleton/.harness/docs/<command>/` 폴더 삭제 또는 rename
- [ ] `skeleton/.claude/commands/<command>.md` 슬래시 파일 삭제 또는 rename (폴더명과 매칭 유지)
- [ ] `skeleton/.harness/docs/routing.md` 해당 행 삭제/수정 (3컬럼 모두)
- [ ] `skeleton/.harness/samples/starter/CLAUDE.sample.md` 의 한국어 bullet + 슬래시 bullet **양쪽** 삭제/수정
- [ ] 다른 `docs/<x>/index.md` 에서 `../<old>/index.md` 링크 검색·갱신
- [ ] `README.md` 워크플로 표·전제 조건 표·설치 표의 해당 슬래시/키워드 갱신
- [ ] `CHANGELOG.md` 에 변경 사유 + 마이그레이션 영향 기록

---

## skeleton merge 규칙 (CLI 구현 시 참고)

`skeleton/` 하위 파일들은 CLI `init` / `update` 명령이 사용자 프로젝트에 주입하는 원본.

### `skeleton/claude-settings.partial.json` → 사용자 `.claude/settings.json`

사용자 기존 settings.json 이:
- **없음** → 파셜 내용 그대로 `.claude/settings.json` 생성
- **있음** → 다음 규칙으로 merge:
  - `hooks.PostToolUse[]` — matcher 동일한 항목이 있으면 `hooks[]` 에 append (중복 command 는 skip)
  - `permissions.allow[]` — array union (중복 제거)
  - `permissions.deny[]` — **건드리지 않음** (사용자 주권)

### `skeleton/husky-pre-commit.sh` → 사용자 `.husky/pre-commit`

`# === harness-block-start ===` ~ `# === harness-block-end ===` 블록 단위로 관리.

- **없음** → `.husky/` 생성 + 이 파일 그대로 복사 + `chmod +x`
- **있음, 블록 미존재** → 파일 끝에 블록 append
- **있음, 블록 존재** → skip (재실행 idempotent)

### `skeleton/gitignore-entries.txt` → 사용자 `.gitignore`

각 줄별로 존재 여부 확인 후 미존재 라인만 append. 주석(`#` 로 시작) 은 함께 넣지 말고 라인 자체만.

### `skeleton/.harness/harness-config.json` → 사용자 `.harness/harness-config.json`

- init: 없으면 `{{PROJECT_NAME}}` 치환 후 복사
- update: deep-merge — 사용자 값 보존, 새 키만 추가

### `skeleton/.harness/**` (나머지) → 사용자 `.harness/**`

- init: 존재 시 skip, 없으면 복사 (`--force` 로 덮어쓰기)
- update: `docs/` · `hooks/` · `templates/` · `validators/` · `samples/` 는 wipe 후 재복사. `output/` · `memory/` 는 불변

### `skeleton/.claude/commands/*.md` → 사용자 `.claude/commands/*.md`

플러그인이 제공하는 슬래시 커맨드 파일. init/update 로 설치·갱신, uninstall 로 제거.

- init: 존재 시 skip, 없으면 복사 (`--force` 로 덮어쓰기)
- update: 플러그인 소유 커맨드만 wipe + 재복사 (사용자 추가 커맨드는 절대 안 건드림 — 파일명 매칭)
- uninstall: 플러그인 소유 커맨드만 제거, 디렉터리 비면 폴더도 삭제

CLI 는 `walk(skeleton/.claude/commands)` 로 모든 `.md` 파일을 자동 발견 — 매니페스트 따로 없음. 새 슬래시 추가/제거는 파일을 만들거나 지우면 자동 반영.

> **워크플로 명령**(`/feature-plan` 등) 추가 시엔 위 "새 명령 추가" 섹션의 5단계 절차를 따른다 (슬래시 + 키워드 + routing.md + CLAUDE.sample.md + README 5곳 갱신).
>
> **워크플로 외 보조 슬래시**(예: `/harness-init`) 추가 시엔 슬래시 파일 + README 갱신만 하면 충분. routing.md / CLAUDE.sample.md 라우팅 블록은 워크플로 명령 전용.

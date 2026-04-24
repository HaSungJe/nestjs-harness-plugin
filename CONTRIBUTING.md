# Contributing

플러그인 **메인테이너** 용 가이드. 사용자 프로젝트로 배포되지 않음.

## 새 명령 추가

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

"xxx <키워드>" 명령을 받으면 이 문서를 따른다.

## 단계
1. ...
2. ...

## 관련 규칙 (하위 규칙이 있을 때만)
- <역할> → [sub-rule.md](./sub-rule.md)

## 이후 단계 (다음 명령으로 이어질 때만)
→ [../<next-command>/index.md](../<next-command>/index.md)
````

### ② `skeleton/.harness/docs/routing.md` 인덱스에 1행 추가

````markdown
| 키워드N (예: `xxx 키워드N`) | [<commandN>/index.md](./<commandN>/index.md) |
````

적절 카테고리가 없으면 섹션 신설.

### ③ `skeleton/.harness/samples/starter/CLAUDE.sample.md` 라우팅 블록에 키워드 1줄 추가

"## 플러그인 설정 > 명령어 라우팅" 아래 bullet 에:

````markdown
- `키워드N` (예: `xxx 키워드N`) — 설명
````

### ④ 검증 체크리스트

- [ ] 키워드가 기존 명령과 겹치지 않는가
- [ ] 이전·이후 단계가 있는 명령이면 양방향 링크(`이후 단계` / `전제`) 걸었는가
- [ ] `docs/routing.md` 트리거 문구가 `CLAUDE.sample.md` 키워드와 일치하는가 (Claude 가 찾을 수 있어야 함)

### 키워드 작성 요령

- 전체 키워드는 3~7개 내외 유지 — 너무 많으면 일반 요청까지 오인
- 한국어 동사/명사 중심이 잘 동작 (예: `커밋`, `푸쉬`, `도메인 생성`)
- 기존 명령과 키워드 중복 금지

---

## 명령 제거 / 이름 변경

- [ ] `skeleton/.harness/docs/<command>/` 폴더 삭제 또는 rename
- [ ] `skeleton/.harness/docs/routing.md` 해당 행 삭제 / 수정
- [ ] `skeleton/.harness/samples/starter/CLAUDE.sample.md` 해당 키워드 bullet 삭제 / 수정
- [ ] 다른 `index.md` 에서 `../<old>/index.md` 링크 검색·갱신

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

새 슬래시 커맨드 추가 시:
1. `skeleton/.claude/commands/<name>.md` 생성 (frontmatter `description` 필수)
2. README.md 에 `/<name>` 사용법 1문단 추가

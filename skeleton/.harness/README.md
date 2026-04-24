# 하네스 구조 및 셋업 가이드

이 프로젝트는 사용자 명령(`도메인 생성`, `기능 생성`, `커밋` 등)을 `.harness/` 하위 상세 문서로 연결하는 **명령어 라우팅 패턴**을 사용한다. 이 문서는 **구조 전체, 라우팅 동작 원리, 명령 추가·제거 절차**를 모두 담는다.

---

## 1. `.harness/` 디렉터리 구조

```
.harness/
├── harness-config.json     # 하네스 전역 규칙 (step 필수 필드, 재시도 한계, 테스트 경로 등)
├── README.md               # (이 파일) 구조·셋업·명령 관리 가이드
├── docs/                   # 라우팅 인덱스 + 명령 규칙
│   ├── routing.md          # 명령어 ↔ 상세 문서 라우팅 인덱스 (CLAUDE.md 가 이 파일부터 읽음)
│   ├── <command>/          # 명령 1개당 폴더 1개, index.md 필수
│   │   ├── index.md        # 메인 실행 규칙
│   │   └── <sub-rule>.md   # (선택) 단계별 세부 규칙
│   └── ...
├── templates/              # 생성물 양식
│   ├── request.md          # request 파일 템플릿
│   ├── work.md             # work 파일 템플릿
│   └── report.md           # 리포트 템플릿
├── output/                 # 생성 결과물
│   ├── request/<domain>/   # 도메인별 request 파일
│   ├── work/<domain>/      # 도메인별 work 파일
│   └── report/<domain>/    # 도메인별 리포트 (자동 생성)
├── validators/             # JSON Schema + 검증 스크립트
│   ├── request.schema.json
│   ├── validate-request.js
│   └── validate-work.js
├── hooks/                  # Claude Code hook 스크립트
│   ├── on-request-written.sh
│   ├── on-work-written.sh
│   └── run-tests.sh
├── samples/                # 참고용 샘플
│   ├── workflow-*.md        #   워크플로 샘플 (request/work/report) + 스크린샷
│   ├── CLAUDE.sample.md     #   프로젝트 규칙 샘플 (루트에 복사 후 .sample. 제거)
│   └── docs/                #   CLAUDE.sample.md 가 링크하는 상세 문서
├── skeleton/               # 타 프로젝트로 "설치" 될 때 복사·merge 될 원본 파일
│   ├── claude-settings.partial.json  # .claude/settings.json 에 merge 할 하네스 항목
│   ├── husky-pre-commit.sh           # .husky/pre-commit 에 append 할 하네스 블록
│   └── gitignore-entries.txt         # .gitignore 에 append 할 라인
└── memory/                 # 프로젝트 공유 메모리 (MEMORY.md + 항목별 md)
```

> `templates/` (런타임에 Claude 가 사용하는 컨텐츠 양식) 과 `skeleton/` (install 시 타 프로젝트로 복사되는 셋업 파일) 은 용도가 완전히 다르므로 분리.

### 각 층의 역할

| 층 | 위치 | 역할 |
| --- | --- | --- |
| 트리거 선언 | CLAUDE.md 의 "명령어 라우팅" 블록 | 어떤 키워드를 명령으로 볼지 |
| 매핑 인덱스 | `docs/routing.md` | 키워드 → 상세 문서 매핑 |
| 실행 규칙 | `docs/<command>/index.md` | 실제 명령 처리 절차 |
| 서브 규칙 | `docs/<command>/<sub-rule>.md` | 단계 내 세부 규칙 (선택) |

---

## 2. ⚠️ 필수 — CLAUDE.md / AGENTS.md 에 라우팅 블록

이 블록이 없으면 **명령어 기반 기능이 전혀 동작하지 않는다.** Claude 는 `.harness/docs/routing.md` 가 존재한다는 사실조차 모르기 때문.

새 프로젝트에 이 하네스를 도입하거나, 기존 CLAUDE.md / AGENTS.md 에 명령어 라우팅을 추가할 때 **가장 먼저** 아래 블록을 파일 최상단(또는 다른 규칙 위)에 복사해 붙여넣는다.

### 복사용 블록 (현재 이 프로젝트 기준)

````markdown
## 명령어 라우팅

사용자 요청에 아래 키워드/상황이 포함되면 **먼저 `.harness/docs/routing.md` 를 읽고** 그 인덱스를 따라 해당 상세 문서를 읽어 규칙대로 실행한다.

- `도메인 생성` (예: `user 도메인 생성`)
- `기능 생성` (예: `xxx 기능 생성`) — request/work 기획 단계
- `작업 시작` (예: `xxx 작업 시작`) — 구현·테스트·리포트 단계
- `커밋` (예: `작업내용 커밋해줘`)
- `푸쉬` (예: `작업내용 푸쉬해줘`)

`.harness/docs/routing.md` 에서도 해당 항목을 찾지 못하면 하네스 외 요청으로 간주하고 일반 채팅/작업으로 처리한다. 파일 자체가 없으면 무시하고 아래 코드 규칙만 따른다.
````

키워드 목록은 `docs/routing.md` 의 라우팅 테이블과 **항상 동기화**돼 있어야 함 — 테이블에 있는 트리거가 이 목록에 없으면 Claude 가 해당 명령을 감지하지 못한다.

---

## 3. 라우팅 흐름

```
CLAUDE.md 또는 AGENTS.md (항상 로드)
   └─ [명령어 라우팅 블록] — 트리거 키워드 감지
         │
         ▼
.harness/docs/routing.md — 키워드 ↔ 상세 문서 매핑 인덱스
         │
         ▼
.harness/docs/<command>/index.md — 실제 실행 규칙
   └─ (필요 시) 같은 폴더 내 sub-rule.md 참조
```

세 층은 각각 독립 수정 가능:
- **CLAUDE.md 라우팅 블록** — 무엇을 트리거로 볼지 선언
- **docs/routing.md** — 트리거 → 문서 매핑
- **docs/\<command\>/** — 실제 실행 상세 (명령 1개당 폴더 1개 캡슐화)

---

## 4. 새 명령 추가

### ① `docs/<command>/index.md` 생성

명령 1개당 **폴더 1개, index.md 1개**. 하위 규칙이 없는 명령도 동일 구조 유지 (일관성).

```
docs/<command>/
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

### ② `docs/routing.md` 인덱스에 1행 추가

````markdown
| 키워드N (예: `xxx 키워드N`) | [<commandN>/index.md](./<commandN>/index.md) |
````

적절 카테고리가 없으면 섹션 신설.

### ③ CLAUDE.md / AGENTS.md 라우팅 블록에 키워드 1줄 추가

````markdown
- `키워드N` (예: `xxx 키워드N`) — 설명
````

### ④ 검증 체크리스트

- [ ] 키워드가 기존 명령과 겹치지 않는가
- [ ] 이전·이후 단계가 있는 명령이면 양방향 링크(`이후 단계` / `전제`) 걸었는가
- [ ] `docs/routing.md` 트리거 문구가 CLAUDE.md 키워드와 일치하는가 (Claude 가 찾을 수 있어야 함)

### 키워드 작성 요령

- 전체 키워드는 3~7개 내외 유지 — 너무 많으면 일반 요청까지 오인
- 한국어 동사/명사 중심이 잘 동작 (예: `커밋`, `푸쉬`, `도메인 생성`)
- 기존 명령과 키워드 중복 금지

---

## 5. 명령 제거 / 이름 변경

- [ ] `docs/<command>/` 폴더 삭제 또는 rename
- [ ] `docs/routing.md` 해당 행 삭제 / 수정
- [ ] CLAUDE.md / AGENTS.md 해당 키워드 bullet 삭제 / 수정
- [ ] 다른 `index.md` 에서 `../<old>/index.md` 링크 검색·갱신

---

## 6. 타 프로젝트로 설치 (플러그인화 대비)

`skeleton/` 하위 파일들은 장래 **npm 패키지 `init` 명령이 타 프로젝트에 주입**할 원본이다. 각 파일의 merge 규칙:

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

### 업데이트 시 (`sync` 등 재실행)

모든 merge 는 **idempotent** — 이미 있는 항목은 skip, 신규만 추가. `--force` 플래그 주면 덮어쓰기 가능.

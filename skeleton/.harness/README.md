# 하네스 구조 및 동작 가이드

`nestjs-harness-plugin` 이 이 프로젝트에 설치해둔 하네스의 **구조와 동작 원리**를 설명한다. 명령 자체는 플러그인이 제공 — 사용자는 두 가지 방식 중 하나로 트리거:

- **한국어 키워드** — `"xxx 기능 생성"`, `"작업 시작"` (또는 `"xxx 작업 시작"`), `"커밋해줘"`, `"푸쉬해줘"` 같은 자연어 (CLAUDE.md 의 라우팅 블록 필요)
- **슬래시 커맨드** — `/feature-plan`, `/feature-implement`, `/git-commit`, `/git-push` 등 (Claude Code 환경, 라우팅 블록과 무관하게 동작)

> **구현 명령 통합**: 신규 기획(`work.md`) 과 변경 기획(`change-*.md`) 의 구현은 **모두 `/feature-implement` (또는 `작업 시작`)** 한 명령으로 진입한다. 모드는 인자·파일 상태로 자동 판별 — 인자를 생략하면 `.harness/output/` 의 미구현 플랜을 자동 탐색.

---

## 1. `.harness/` 디렉터리 구조

```
.harness/
├── harness-config.json     # 프로젝트별 설정 (test 경로 · 필수 섹션 등)
├── README.md               # (이 파일)
├── docs/                   # 명령별 실행 규칙 — 폴더명이 슬래시 커맨드 이름과 1:1 매칭
│   ├── routing.md          # 키워드/슬래시 ↔ 상세 문서 매핑 인덱스 (5섹션)
│   ├── domain-create/      # /domain-create
│   ├── feature-plan/       # /feature-plan        — 신규 기능 기획
│   ├── feature-modify-plan/# /feature-modify-plan — 기능 변경 기획
│   ├── feature-implement/  # /feature-implement   — 구현 (신규/수정 자동 라우팅)
│   ├── git-commit/         # /git-commit
│   └── git-push/           # /git-push
├── templates/              # 생성물 양식 (request · work · change · report)
├── output/                 # 생성 결과물 (사용자 작업물)
│   ├── request/<domain>/
│   ├── work/<domain>/
│   ├── change/<domain>/
│   └── report/<domain>/
├── validators/             # JSON Schema + 검증 스크립트 (request · work)
├── hooks/                  # Claude Code hook 스크립트 (자동 검증 · 테스트 자가수복)
├── samples/                # 참고용 샘플 (두 종류로 분리)
│   ├── workflow/           #   실제 워크플로 결과물 예시 (읽기 전용)
│   │   ├── workflow-request.md / workflow-work.md / workflow-report.md
│   │   └── workflow-step*.jpg  (단계별 스크린샷)
│   └── starter/            #   프로젝트 컨벤션 참고용 샘플 (한 NestJS 프로젝트의 실제 예시)
│       ├── CLAUDE.sample.md
│       └── docs/
└── memory/                 # 프로젝트 공유 메모리
```

### 각 층의 역할

| 층 | 위치 | 역할 |
| --- | --- | --- |
| 트리거 (한국어) | 프로젝트 루트 `CLAUDE.md` 의 "명령어 라우팅" 블록 | 어떤 키워드를 명령으로 볼지 |
| 트리거 (슬래시) | `.claude/commands/<name>.md` | `/<name>` 입력 시 본문이 프롬프트로 로드 |
| 매핑 인덱스 | `docs/routing.md` | 키워드/슬래시 → 상세 문서 매핑 (5섹션: 도메인 / 기능 신규 기획 / 기능 변경 기획 / 기능 구현 / 배포) |
| 실행 규칙 | `docs/<command>/index.md` | 실제 명령 처리 절차 — 두 진입점 모두 결국 이 파일을 읽음 |
| 서브 규칙 | `docs/<command>/<sub-rule>.md` | 단계 내 세부 규칙 (선택) — 예: `feature-modify-plan/change-file.md` |

---

## 2. ⚠️ 한국어 키워드 진입점 — 루트 `CLAUDE.md` 에 라우팅 블록 필요

**한국어 키워드** (예: `"회원가입 기능 생성"`) 로 트리거하려면 루트 `CLAUDE.md` 에 라우팅 블록이 있어야 한다. 없으면 Claude 는 `.harness/docs/routing.md` 가 존재한다는 사실조차 모름.

> **슬래시 커맨드** (`/feature-plan` 등) 는 이 블록 없이도 동작한다 — Claude Code 가 `.claude/commands/<name>.md` 를 직접 로드하기 때문. 두 진입점 모두 결국 같은 `.harness/docs/<command>/index.md` 를 읽으므로 **결과는 동일**.

`.harness/samples/starter/CLAUDE.sample.md` 에 **이미 라우팅 블록이 포함** 되어 있음:
- 루트에 `CLAUDE.md` 가 없다면 → `.sample.` 을 떼고 루트로 복사 (또는 `/harness-init` 슬래시로 본인 스택에 맞게 자동 생성 — 권장)
- 루트에 `CLAUDE.md` 가 이미 있다면 → 샘플에서 "## 플러그인 설정" 섹션만 발췌해 기존 파일 상단에 병합

---

## 3. 라우팅 흐름

```
[ 한국어 경로 ]                        [ 슬래시 경로 ]

사용자 자연어 입력                     사용자 /<name> 입력
        │                                      │
        ▼                                      ▼
루트 CLAUDE.md (항상 로드)             .claude/commands/<name>.md
        │                                      │
[명령어 라우팅 블록]                   (본문이 프롬프트로 로드)
   트리거 키워드 감지                          │
        │                                      │
        ▼                                      ▼
.harness/docs/routing.md ─── 매핑 인덱스 (참고용)
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
        .harness/docs/<command>/index.md  ← 실제 실행 규칙
              └─ (필요 시) sub-rule.md 참조
```

두 경로 모두 **동일한 실행 규칙**(`docs/<command>/index.md`)으로 수렴한다. 어느 경로로 들어와도 결과·전제 조건·자동 검증은 같다.

# nestjs-harness-plugin

> NestJS 프로젝트에서 **AI 에게 "이런 기능 만들어줘" 한 줄만 던져도** 스펙 작성 → 구현 → 테스트 → 회귀 검사까지 일관된 절차로 흘러가게 잡아주는 하네스.

---

## 명령 일람

각 명령은 **한국어 키워드** 와 **슬래시 커맨드** 두 진입점을 가지며, 동작은 동일합니다. 자연어로 흘리거나 슬래시로 명시하거나 취향대로.

| 그룹 | 한국어 키워드 | 슬래시 | 설명 |
|---|---|---|---|
| **도메인** | `<domain> 도메인 생성` | `/domain-create <domain>` | NestJS 도메인 스캐폴드 생성 |
| **기능 생성** | `<featureName> 기능 생성` | `/feature-plan <featureName>` | 기획 단계 — request → work 작성 |
|  | `<featureName> 작업 시작` | `/feature-implement <featureName>` | 구현 + 테스트 + 자가수복 + 리포트 |
| **기능 수정** | `<featureName> 기능 수정` | `/feature-modify-plan <featureName>` | 변경요청 단계 — change.md 작성 |
|  | `<featureName> 수정 시작` | `/feature-modify-implement <featureName>` | 수정 구현 + 테스트 + 리포트 추기 |
| **배포** | `작업내용 커밋해줘` | `/git-commit` | 커밋 메시지 자동 생성 + 사용자 승인 |
|  | `작업내용 푸쉬해줘` | `/git-push` | 자동 브랜치 모드 ff-only 머지 / 일반 모드 분기 |
| **초기 설정** | — | `/harness-init` | 루트 `CLAUDE.md` + `docs/` 를 본인 스택 기준으로 자동 생성 |

---

## 작업 흐름

한 기능 라이프사이클은 **도메인 생성 → 기획 → 구현 → 커밋 → 푸쉬** 5국면으로 구성됩니다. 각 국면은 한 줄 명령으로 진입하고 (아래 표의 ①~⑨ 는 사람↔Claude 가 번갈아 처리하는 세부 단계), 이전 산출물이 없으면 자동으로 중단·안내합니다.

### 단계별 워크플로

시간 순서 기준. 사람↔Claude 가 번갈아 이어갑니다. 키워드와 슬래시는 한 쌍 — 어느 쪽으로 호출해도 동일하게 동작.

| 단계 | 담당 | 작업 | 키워드 · 슬래시 |
|---|---|---|---|
| ① | **사람** | 기능을 구두로 설명 | — |
| ② | Claude | **"새 작업 브랜치 만들까요?" 질의** → 예: `feature/<domain>-<rand6>` 생성·체크아웃, 푸쉬 시 자동 머지. 이어서 `request.md` 초안 — 기능 설명 / API / "확정 설계 결정사항" Y/N 질문 | `기능 생성` · `/feature-plan` |
| ③ | **사람** | request.md 보완 + 결정사항 답변 후 work 작성 지시 | — |
| ④ | Claude | `work.md` 작성 → 저장 즉시 validator 자동 실행 | (이어짐) |
| ⑤ | **사람** | work.md 검토 (사전 구현 항목 있으면 먼저 처리) | `작업 시작` · `/feature-implement` |
| ⑥ | Claude | 전제 검증 → 구현 코드 + `spec.ts` 생성 (브랜치 결정은 ②에서 끝남) | (이어짐) |
| ⑦ | Claude | spec 실행 → 실패 시 자가수복 (최대 10회) | (이어짐) |
| ⑧ | Claude | 리포트 생성 (`.harness/output/report/<domain>/<feature>-report.md`) | (이어짐) |
| ⑨ | **사람** | 커밋 → husky 전체 테스트 → 푸쉬 | `커밋` · `/git-commit` <br> `푸쉬` · `/git-push` |

> 실제 request/work/report 산출물 예시 + 스크린샷: 설치 후 `.harness/samples/workflow/`

### 안전장치

각 명령은 이전 단계 산출물이 있어야 진입하며, 저장·커밋 시점마다 자동 검증이 걸립니다.

**전제 조건** — 파일 존재 기반 state. 위반 시 Claude 가 "뭐가 부족한지" 안내 후 중단.

| 명령 (키워드 · 슬래시) | 전제 |
|---|---|
| `도메인 생성` · `/domain-create` | 없음 (어느 상태든 진입) |
| `기능 생성` · `/feature-plan` | 없음 |
| `기능 수정` · `/feature-modify-plan` | 없음 |
| `작업 시작` · `/feature-implement` | `work.md` 존재 + request 결정사항 전부 답변 + 사전 구현 항목 전부 완료(`- [x]`) + validator 통과 |
| `수정 시작` · `/feature-modify-implement` | `change.md` 존재 + 결정사항 답변 + 사전 구현 항목 완료 |
| `커밋` · `/git-commit` | `git status` 에 변경분 존재 |
| `푸쉬` · `/git-push` | 원격 대비 ahead 커밋 존재. 자동 브랜치 모드(`기능 생성` 시 "예") 면 `<feature>` → `<base>` ff-only 머지 후 `<base>` push + 로컬 feature 삭제. 일반 모드면 사용자에게 대상 브랜치 질의 |

→ 끼어들기·재개 안전: A 기획 중 급한 B 를 완결 후 A 로 복귀해도 A 파일 상태가 유효하면 그대로 이어감.

**자동 검증**
- `request.md` / `work.md` 저장 시 — validator 가 필수 필드·섹션·테스트 마커 검증 (PostToolUse 훅)
- `spec.ts` 저장 시 — `npm test` 자동 실행, 실패 시 `.retry-count` 기록 후 구현 파일 재저장 때 재시도 (최대 10회)
- `src/` 변경 커밋 시 — husky pre-commit 이 전체 테스트 강제 → 다른 기능 회귀 방지

**사전 구현 필요 항목** (선택)
CLAUDE.md 규칙이 있지만 실제 `src/` 에 해당 인프라가 없는 경우(예: 큐 규칙은 있는데 큐 모듈이 없음, 공용 util 규칙 있는데 파일 없음), work.md 에 체크리스트로 flag:

```markdown
## 사전 구현 필요 항목
- [ ] 큐 인프라 — src/modules/queue/ 생성 필요
- [ ] 공용 Audit Util — src/common/utils/audit.ts 생성 필요
```

모든 항목이 `- [x]` 완료 체크되기 전엔 `작업 시작` 진입 불가. 본 기능 구현과 인프라 작업이 섞이는 것 방지.

> Markdown 체크박스: `- [ ]` 미완료 / `- [x]` 완료 (GitHub 에서 ☐/☑ 로 렌더링).

---

## 설치

```bash
npx github:HaSungJe/nestjs-harness-plugin init             # 기본
npx github:HaSungJe/nestjs-harness-plugin init --dry-run   # 미리보기
npx github:HaSungJe/nestjs-harness-plugin init --force     # 기존 파일 덮어쓰기
```

`init` 이 devDependency 등록 + 파일 배치까지 자동 처리. 별도 `npm install` 불필요. 기존 파일 존재 시 덮어쓰지 않고 merge/append (중복 체크).

**요구사항**: Node.js ≥ 18 · 기존 NestJS 프로젝트(`package.json` 필수) · (선택) Claude Code

**설치되는 것**:

| 항목 | 경로 | 역할 |
|---|---|---|
| 하네스 워크플로 | `.harness/` | 명령별 실행 규칙 · 템플릿 · validator · hook |
| 프로젝트 규칙 샘플 | `.harness/samples/starter/` | 실제 NestJS 프로젝트의 코드 컨벤션을 정리한 `CLAUDE.sample.md` + `docs/` 예시. **형식·톤 참고용** — `/harness-init` 이 본인 스택을 스캔해 실제 규약으로 치환 생성 (직접 복사도 가능) |
| 워크플로 예시 | `.harness/samples/workflow/` | 실제 산출물 예시 + 스크린샷 (읽기 전용) |
| 커스텀 슬래시 커맨드 | `.claude/commands/` | `/harness-init` + 워크플로 7종 (위 [명령 일람](#명령-일람) 표 참조). 한국어 키워드와 동등한 진입점, docs 폴더명과 1:1 매칭 |
| Claude Code 훅 | `.claude/settings.json` | 파일 저장 시 validator · 자가수복 자동 발동 |
| Husky pre-commit | `.husky/pre-commit` | `src/` / `*.spec.ts` 변경 시 전체 테스트 |
| .gitignore | `.gitignore` | 세션 로컬 상태 파일 제외 |

---

## 첫 사용 — `CLAUDE.md` 자동 생성

Claude Code 에서:
```
/harness-init
```

샘플(`.harness/samples/starter/`)의 섹션 구조·톤을 템플릿 삼아 루트 `CLAUDE.md` + `docs/` 생성. 프로젝트 실제 스택·디렉터리를 스캔해 샘플의 규칙을 실제 의존성·컨벤션에 맞게 치환 (쓰지 않는 섹션은 생략). 기존 파일 있으면 덮어쓰기 전 확인.

> Claude Code 내장 `/init` 과 별개 — 하네스 규약 CLAUDE.md 를 만들 때만 사용.

---

## 관리 명령

### update

이미 설치된 프로젝트에 최신 버전을 반영:

```bash
npx github:HaSungJe/nestjs-harness-plugin update             # 로직만 교체
npx github:HaSungJe/nestjs-harness-plugin update --dry-run   # 미리보기
```

| 대상 | 동작 |
|---|---|
| `.harness/` 로직 폴더 (`docs/` · `hooks/` · `templates/` · `validators/` · `samples/`) | **전량 삭제 후 재복사** — orphan 파일 자동 정리 |
| `.harness/harness-config.json` | **딥 머지** — 사용자 값 보존, 새 필드만 추가 |
| `.claude/` · `.husky/` · `.gitignore` | idempotent 머지 재실행 |
| `.harness/output/` · `.harness/memory/` · 루트 `CLAUDE.md` · `docs/` | **절대 불변** |

> 캐시 이슈로 최신이 안 받아지면: `npm cache clean --force` 후 재실행.

### uninstall

```bash
npx github:HaSungJe/nestjs-harness-plugin uninstall           # 기본 — 사용자 산출물 보존
npx github:HaSungJe/nestjs-harness-plugin uninstall --purge   # 산출물 포함 전부 삭제
```

| 대상 | 기본 | `--purge` |
|---|---|---|
| `.harness/` 로직 폴더 | 삭제 | 삭제 |
| `.harness/output/` · `memory/` · `harness-config.json` | **보존** | 삭제 |
| `.claude/settings.json` 의 하네스 훅·권한 | 제거 (사용자 다른 항목 유지) | 동일 |
| `.claude/commands/` 의 플러그인 소유 슬래시 8종 | 제거 (사용자 추가 커맨드는 보존) | 동일 |
| `.husky/pre-commit` 의 하네스 블록 | 제거 (다른 훅 있으면 파일 유지) | 동일 |
| `.gitignore` 의 하네스 라인 | 제거 | 동일 |
| devDep `nestjs-harness-plugin` | `npm uninstall` | 동일 |

---

## 더 자세히

- 하네스 내부 구조 · 라우팅 동작 — 설치 후 `.harness/README.md`
- 플러그인 수정 (명령 추가/제거 등 메인테이너 작업) — [CONTRIBUTING.md](CONTRIBUTING.md)
- 변경 이력 — [CHANGELOG.md](CHANGELOG.md)

## License

MIT — [LICENSE](./LICENSE)

# nestjs-harness-plugin

> NestJS 프로젝트에서 **AI 에게 "이런 기능 만들어줘" 한 줄만 던져도** 스펙 작성 → 구현 → 테스트 → 회귀 검사까지 일관된 절차로 흘러가게 잡아주는 하네스.

---

## 작업 흐름

한 기능을 **도메인 생성 → 기획 → 구현 → 커밋 → 푸쉬** 5단계로 처리합니다. 각 단계는 한 줄 명령으로 진입하고, 이전 단계가 끝나지 않으면 자동으로 중단·안내합니다.

### 단계별 워크플로

시간 순서 기준. 사람↔Claude 가 번갈아 이어갑니다.

| 단계 | 담당 | 작업 | 관련 명령 |
|---|---|---|---|
| ① | **사람** | 기능을 구두로 설명 | — |
| ② | Claude | `request.md` 초안 — 기능 설명 / API / "확정 설계 결정사항" Y/N 질문 | `회원가입 기능 생성` |
| ③ | **사람** | request.md 보완 + 결정사항 답변 후 work 작성 지시 | — |
| ④ | Claude | `work.md` 작성 → 저장 즉시 validator 자동 실행 | (이어짐) |
| ⑤ | **사람** | work.md 검토 (사전 구현 항목 있으면 먼저 처리) | `회원가입 작업 시작` |
| ⑥ | Claude | 전제 검증 → **통합 브랜치면 `feature/<featureName>` 브랜치 생성 확인** → 구현 코드 + `spec.ts` 생성 | (이어짐) |
| ⑦ | Claude | spec 실행 → 실패 시 자가수복 (최대 10회) | (이어짐) |
| ⑧ | Claude | 리포트 생성 (`.harness/output/report/<domain>/<feature>-report.md`) | (이어짐) |
| ⑨ | **사람** | 커밋 → husky 전체 테스트 → 푸쉬 | `커밋해줘` / `푸쉬해줘` |

> 실제 request/work/report 산출물 예시 + 스크린샷: 설치 후 `.harness/samples/workflow/`

### 안전장치

각 명령은 이전 단계 산출물이 있어야 진입하며, 저장·커밋 시점마다 자동 검증이 걸립니다.

**전제 조건** — 파일 존재 기반 state. 위반 시 Claude 가 "뭐가 부족한지" 안내 후 중단.

| 명령 | 전제 |
|---|---|
| `도메인 생성` · `기능 생성` | 없음 (어느 상태든 진입) |
| `작업 시작` | `work.md` 존재 + request 결정사항 전부 답변 + 사전 구현 항목 전부 완료(`- [x]`) + validator 통과. 통합 브랜치(main/master/develop) 인 경우 `feature/<featureName>` 브랜치 생성 확인 |
| `커밋해줘` | `git status` 에 변경분 존재 |
| `푸쉬해줘` | 원격 대비 ahead 커밋 존재 |

→ 끼어들기·재개 안전: A 기획 중 급한 B 를 완결 후 A 로 복귀해도 A 파일 상태가 유효하면 그대로 이어감.

**자동 검증**
- `request.md` / `work.md` 저장 시 — validator 가 필수 필드·섹션·테스트 마커 검증 (PostToolUse 훅)
- `spec.ts` 저장 시 — `npm test` 자동 실행, 실패 시 `.retry-count` 기록 후 구현 파일 재저장 때 재시도 (최대 10회)
- `src/` 변경 커밋 시 — husky pre-commit 이 전체 테스트 강제 → 다른 기능 회귀 방지

**사전 구현 필요 항목** (선택)
CLAUDE.md 규칙이 있지만 실제 `src/` 에 해당 인프라가 없는 경우(예: BullMQ 규칙 있는데 큐 모듈 없음), work.md 에 체크리스트로 flag:

```markdown
## 사전 구현 필요 항목
- [ ] BullMQ Queue 인프라 — src/modules/queue/ 생성 필요
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
| 프로젝트 규칙 스타터 | `.harness/samples/starter/` | NestJS 11 + TypeORM + BullMQ 기준 `CLAUDE.sample.md` + `docs/`. `.sample.` 제거해 루트 복사 후 커스터마이즈 |
| 워크플로 예시 | `.harness/samples/workflow/` | 실제 산출물 예시 + 스크린샷 (읽기 전용) |
| 커스텀 슬래시 커맨드 | `.claude/commands/harness-init.md` | `/harness-init` — 루트 `CLAUDE.md` + `docs/` 자동 생성 |
| Claude Code 훅 | `.claude/settings.json` | 파일 저장 시 validator · 자가수복 자동 발동 |
| Husky pre-commit | `.husky/pre-commit` | `src/` / `*.spec.ts` 변경 시 전체 테스트 |
| .gitignore | `.gitignore` | 세션 로컬 상태 파일 제외 |

---

## 첫 사용 — `CLAUDE.md` 자동 생성

Claude Code 에서:
```
/harness-init
```

샘플(`.harness/samples/starter/`)의 섹션 구조·톤을 템플릿 삼아 루트 `CLAUDE.md` + `docs/` 생성. 프로젝트 실제 스택·디렉터리를 스캔해 샘플의 NestJS/BullMQ 규칙을 실상에 맞게 치환. 기존 파일 있으면 덮어쓰기 전 확인.

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
| `.claude/commands/harness-init.md` | 제거 | 동일 |
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

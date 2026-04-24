# nestjs-harness-plugin

> NestJS 프로젝트에서 **AI 에게 "이런 기능 만들어줘" 한 줄만 던져도** 스펙 작성 → 구현 → 테스트 → 회귀 검사까지 일관된 절차로 흘러가게 잡아주는 하네스.

## 작업 흐름

한 기능은 **도메인 생성 → 기획 → 구현 → 커밋 → 푸쉬** 순서를 따릅니다. 각 단계는 한 줄 명령으로 진입하고, 이전 단계가 완료되지 않으면 자동으로 중단·안내합니다.

### 요약

| 명령 (당신) | 뒤에서 일어나는 일 | 산출물 |
|---|---|---|
| `user 도메인 생성` | `src/api/<domain>/` 스캐폴드 + `app.module.ts` 등록 | 모듈·심볼·빈 엔티티 폴더 |
| `회원가입 기능 생성` | **① request 초안** (결정사항 질문 포함) → **② 당신이 답변** → **③ work 작성** (파일 목록·DTO·Service·테스트 케이스) | `request.md` + `work.md` |
| `회원가입 작업 시작` | 전제 검증 → 구현 코드 + spec 생성 → `npm test` → 실패 시 **최대 10회 자가수복** → 리포트 | 실제 코드 + `report.md` |
| `작업내용 커밋해줘` | 변경 존재 검증 → `git add` → request 의 `feature_goal` 로 메시지 생성 → pre-commit 이 **전체 테스트 강제** → 커밋 | 커밋 1개 |
| `작업내용 푸쉬해줘` | unpushed 커밋 존재 검증 → 대상 브랜치 확인 → push | 원격 반영 |

### 단계별 워크플로

명령 단위가 아닌 **시간 순서**로 본 전체 흐름. 사람↔Claude 가 번갈아 이어갑니다.

| 단계 | 담당 | 작업 |
|------|------|------|
| ① | **사람** | 기능을 구두로 설명 |
| ② | Claude | `request.md` 초안 작성 — 기능 설명 / API / "확정 설계 결정사항" Y/N 질문 포함 |
| ③ | **사람** | request.md 보완 + 결정사항 답변 후 Claude에게 work 작성 지시 |
| ④ | Claude | `work.md` 작성 → 저장 즉시 `validate-work.js` 자동 실행 (구조 검증) |
| ⑤ | **사람** | work.md 검토 (+ "사전 구현 필요 항목" 있으면 별도 구현 후 체크) → `"작업 시작"` 명령 |
| ⑥ | Claude | 전제 검증 → 구현 코드 + `spec.ts` 동시 생성 |
| ⑦ | Claude | 해당 기능 spec 실행 → 실패 시 에러 분석 후 수정 (최대 10회) |
| ⑧ | Claude | 리포트 생성 (`.harness/output/report/<domain>/<feature>-report.md`) |
| ⑨ | **사람** | `"커밋해줘"` → husky 가 전체 테스트 강제 → `"푸쉬해줘"` |

→ ①-④ 가 `기능 생성` 명령의 내부 흐름, ⑤-⑧ 이 `작업 시작` 내부 흐름.

### 사전 구현 필요 항목 (자주 간과되는 포인트)

예: CLAUDE.md 에 BullMQ 규칙이 있는데 프로젝트엔 큐 인프라가 아직 없음. 이 경우 work.md 가 생성되면서:

```markdown
## 사전 구현 필요 항목
- [ ] BullMQ Queue 인프라 — src/modules/queue/ 생성 필요 (CLAUDE.md 'BullMQ' 기준)
```

당신이 큐 인프라를 먼저 구현해 체크박스를 **완료 상태(`- [x]`)** 로 바꾼 후에만 `"작업 시작"` 이 진입 가능. **본 기능 구현과 인프라 구현이 섞이는 것을 방지**합니다.

> Markdown 체크박스 표기: `- [ ]` 미완료 / `- [x]` 완료 (GitHub 에서 ☐/☑ 로 렌더링).

### 전제 조건 (file-existence based state)

각 명령은 이전 단계 산출물이 있어야 진입합니다. 전제 위반 시 Claude 가 "뭐가 부족한지" 안내 후 중단:

| 명령 | 전제 |
|---|---|
| `도메인 생성` | 없음 (어느 상태든 진입 가능) |
| `기능 생성` | 없음 (해당 `request.md` 이미 있으면 이어서 보완 모드) |
| `작업 시작` | `work.md` 존재 + request 결정사항 전부 답변 + 사전 구현 항목 전부 완료 체크(`- [x]`) + validator 통과 |
| `커밋해줘` | `git status` 에 변경분 존재 |
| `푸쉬해줘` | 원격 대비 ahead 커밋 존재 |

덕분에 작업을 **끼어들기·재개** 해도 깨지지 않습니다 — 예: A 기획 중 → 급한 B 를 완결 → 돌아와서 A 작업 시작. A 의 파일 상태가 유효하면 그대로 이어감.

### 자동 검증·안전장치

- **request.md / work.md 저장 시** — Claude Code PostToolUse 훅이 validator 자동 실행 (필수 필드/섹션/테스트 마커 누락 즉시 STOP)
- **spec.ts 저장 시** — `run-tests.sh` 가 자동으로 `npm test`. 실패 시 `.retry-count` 기록 + 구현 파일 재저장 때 재시도 (최대 10회)
- **`src/` 변경 커밋 시** — husky pre-commit 이 전체 테스트 강제 (다른 기능 회귀 방지)

> 실제 request/work/report 예시와 스크린샷은 설치 후 `.harness/samples/workflow/` 에서 볼 수 있습니다.

---

## 설치

```bash
npx github:HaSungJe/nestjs-harness-plugin init
```

끝. 별도의 `npm install` 단계 불필요 — init 이 자기 자신을 devDependency 로 추가 후 필요한 파일들을 프로젝트에 배치합니다.

## 요구사항

- Node.js >= 18
- 기존 NestJS 프로젝트 (`package.json` 이 있는 폴더에서 실행)
- (선택) Claude Code — `.claude/settings.json` 훅을 활용하려면

## 설치 항목

| 항목 | 경로 | 역할 |
|---|---|---|
| 하네스 워크플로 | `.harness/` | request/work 스펙 · validator · hook 스크립트 · 템플릿 |
| 프로젝트 규칙 샘플 | `.harness/samples/starter/CLAUDE.sample.md`, `.harness/samples/starter/docs/` | NestJS 11 + TypeORM + BullMQ 기준 코드 컨벤션 예시. 필요 시 `.sample.` 제거 후 루트에 복사해 커스터마이즈 |
| 워크플로 예시 | `.harness/samples/workflow/` | 실제 request/work/report 산출물 + 단계별 스크린샷 (읽기 전용 참고) |
| 커스텀 슬래시 커맨드 | `.claude/commands/harness-init.md` | `/harness-init` — 샘플을 템플릿 삼아 루트 `CLAUDE.md` + `docs/` 자동 생성 |
| Claude Code 훅 | `.claude/settings.json` | work/request 파일 저장 시 validator 자동 실행 |
| Husky pre-commit | `.husky/pre-commit` | `src/` 또는 `*.spec.ts` 변경 시 `npm test` (회귀 보장) |
| .gitignore | `.gitignore` | 하네스 세션 로컬 상태 파일 (`.retry-count` 등) 제외 |

기존 파일이 있으면 **덮어쓰지 않고 merge/append** (중복 체크). `--force` 로 강제 가능.

## 첫 사용 — `CLAUDE.md` 자동 생성

설치 후 Claude Code 에서:

```
/harness-init
```

하네스 샘플(`.harness/samples/starter/`) 의 섹션 구조·톤을 템플릿 삼아 루트 `CLAUDE.md` + `docs/` 를 자동 생성합니다. 프로젝트의 실제 스택·디렉터리를 스캔해 샘플의 NestJS/BullMQ 규칙을 실상에 맞게 치환. 기존 파일이 있으면 덮어쓰기 전 확인.

> Claude Code 내장 `/init` 과 별개입니다. 하네스 규약을 따르는 CLAUDE.md 를 만들고 싶을 때 이걸 사용하세요.

## 옵션

```bash
npx github:HaSungJe/nestjs-harness-plugin init             # 기본 동작
npx github:HaSungJe/nestjs-harness-plugin init --dry-run   # 실제 변경 없이 예정 작업만 출력
npx github:HaSungJe/nestjs-harness-plugin init --force     # 기존 파일 덮어쓰기 (주의)
```

## 업데이트

이미 설치된 프로젝트에 최신 버전을 반영할 때:

```bash
npx github:HaSungJe/nestjs-harness-plugin update             # 로직 파일만 새 버전으로 교체
npx github:HaSungJe/nestjs-harness-plugin update --dry-run   # 예정 변경만 확인
```

`update` 가 하는 일 / 안 하는 일:

| 대상 | 동작 |
|---|---|
| `.harness/docs/`, `hooks/`, `templates/`, `validators/`, `samples/` | **전량 삭제 후 재복사** — skeleton 에서 삭제된 파일(orphan) 도 자동 정리 |
| `.harness/harness-config.json` | **딥 머지** — 사용자 값 보존, 새 필드만 추가 |
| `.claude/settings.json`, `.husky/pre-commit`, `.gitignore` | 기존 idempotent 머지 재실행 (새 훅·권한·라인 누락분만 추가) |
| `.harness/output/`, `.harness/memory/` | **절대 건드리지 않음** (사용자 작업물·메모리 보존) |
| 루트 `CLAUDE.md`, `docs/` | **절대 건드리지 않음** (샘플은 `.harness/samples/` 에만 배치) |

> 캐시 이슈로 최신이 안 받아지면: `npm cache clean --force` 후 재실행.

## 더 자세한 워크플로

하네스 구조와 라우팅 동작은 설치 후 `.harness/README.md`. 명령 추가·제거 등 플러그인 수정 작업은 [CONTRIBUTING.md](CONTRIBUTING.md).

## 제거

```bash
npx github:HaSungJe/nestjs-harness-plugin uninstall             # 기본 — 사용자 산출물 보존
npx github:HaSungJe/nestjs-harness-plugin uninstall --dry-run   # 예정 작업만 확인
npx github:HaSungJe/nestjs-harness-plugin uninstall --purge     # 산출물 포함 전부 삭제
```

`uninstall` 동작:

| 대상 | 기본 | `--purge` |
|---|---|---|
| `.harness/docs/`, `hooks/`, `templates/`, `validators/`, `samples/`, `README.md` | 삭제 | 삭제 |
| `.harness/output/`, `memory/`, `harness-config.json` | **보존** (작업물) | 삭제 |
| `.claude/settings.json` 의 하네스 훅·권한 | 삭제 (사용자 다른 항목은 유지) | 동일 |
| `.husky/pre-commit` 의 하네스 블록 | 제거 (다른 훅 있으면 파일 유지, 없으면 파일 삭제) | 동일 |
| `.gitignore` 의 하네스 라인 | 제거 (사용자 다른 라인 유지) | 동일 |
| `package.json` devDep `nestjs-harness-plugin` | `npm uninstall` 실행 | 동일 |

## License

MIT — 자세한 내용은 [LICENSE](./LICENSE).

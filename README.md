# nestjs-harness-plugin

> NestJS 프로젝트에서 **AI 에게 "이런 기능 만들어줘" 한 줄만 던져도** 스펙 작성 → 구현 → 테스트 → 회귀 검사까지 일관된 절차로 흘러가게 잡아주는 하네스.

## 작업 흐름

한 기능을 만들 때 **도메인 만들기 → 기획 → 구현 → 커밋·푸쉬** 네 단계를 각 한 줄 명령으로 처리합니다. 각 단계에서 당신이 쓰는 명령과, 하네스가 그 뒤에서 대신 처리해주는 일은 다음과 같습니다.

| 당신이 쓰는 한 줄 | 하네스가 대신 해주는 일 |
|---|---|
| `user 도메인 생성` | NestJS 규약에 맞는 모듈 폴더·파일 스캐폴드 |
| `회원가입 기능 생성` | **request 스펙** 초안 작성 → 당신이 비즈니스 규칙 보완 → **work 스펙** (테이블/API/에러 케이스까지) 확정 |
| `회원가입 작업 시작` | work 스펙대로 구현 + 유닛/E2E 테스트 생성 + 실패 시 **자가 수복** + 결과 리포트 |
| `작업내용 커밋해줘` / `푸쉬해줘` | staged 변경에서 feature goal 추출 → 커밋 메시지 생성 → 브랜치 확인 후 push |

여기에 **pre-commit 훅이 `src/` 변경 시 자동으로 전체 테스트를 돌려** 다른 기능이 깨진 채로 커밋되는 일을 막아줍니다.

> 실제 request/work/report 예시와 스크린샷은 설치 후 `.harness/samples/` 에서 볼 수 있습니다.

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
| Claude Code 훅 | `.claude/settings.json` | work/request 파일 저장 시 validator 자동 실행 |
| Husky pre-commit | `.husky/pre-commit` | `src/` 또는 `*.spec.ts` 변경 시 `npm test` (회귀 보장) |
| .gitignore | `.gitignore` | 하네스 세션 로컬 상태 파일 (`.retry-count` 등) 제외 |

기존 파일이 있으면 **덮어쓰지 않고 merge/append** (중복 체크). `--force` 로 강제 가능.

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

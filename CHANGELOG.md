# Changelog

## [0.1.0] - 2026-04-24

### Added
- `init` / `update` / `uninstall` CLI 명령 (설치·갱신·제거 전체 라이프사이클)
- `.harness/` 워크플로 스캐폴드 — docs (명령별 실행 규칙) · templates · validators · hooks
- PostToolUse 훅 3개 전부 wiring — `on-request-written.sh` · `on-work-written.sh` · `run-tests.sh`
- husky pre-commit 회귀 테스트 블록
- 작업시작·커밋·푸쉬 커맨드에 **전제 조건** 명시 (파일 존재 기반 state)
- `.harness/output/work/<domain>/<featureName>-work.md` 존재 + request 결정사항 전부 답변 + validator 통과 — 3중 검증
- work.md 에 **사전 구현 필요 항목** 선택 섹션 — CLAUDE.md 규칙 적용에 필요한 인프라가 src/ 에 없을 때 별도 작업 유도
- `domain-create` 에 Architecture fallback — CLAUDE.md 가 없거나 부실할 때 최소 `src/api/<domain>/` 스캐폴드 생성
- 자가 수복 루프 — 테스트 실패 시 최대 10회 재시도
- `.harness/samples/` — 참고용 샘플
  - `samples/starter/` — 프로젝트 규칙 스타터 (`CLAUDE.sample.md` + `docs/`, NestJS 11 + TypeORM + BullMQ 기준)
  - `samples/workflow/` — 실제 워크플로 산출물 + 단계별 스크린샷
- `harness-config.json` — 프로젝트별 조정 포인트 (test 경로 · 필수 섹션 · 참조 docs)
- `update` 시 `harness-config.json` 딥 머지로 사용자 값 보존 + 새 필드만 추가
- `uninstall` `--purge` 옵션 — 기본은 사용자 산출물(`output/` · `memory/`) 보존
- 샘플 `CLAUDE.sample.md` 에 "## 플러그인 설정" (명령어 라우팅 + 메모리 시스템) 섹션 포함
- 문서 분리 — 사용자용 [README.md](README.md) / 메인테이너용 [CONTRIBUTING.md](CONTRIBUTING.md)

# Work Plan 승인 체크리스트

work 파일을 검토한 후 아래 항목을 확인하고 구현을 승인하세요.

이 체크리스트는 **하네스 워크플로 관점의 구조 검증**만 포함합니다. 프로젝트별 코드 규칙(디렉터리 구조, 데코레이터, Entity, Repository, 에러 처리, Swagger 등) 준수 여부는 프로젝트 `CLAUDE.md` 와 그에 링크된 `docs/*.md` 를 열어 **직접 대조**하세요.

## 워크플로 구조

- [ ] 파일 저장 위치가 `.harness/output/work/<domain>/<featureName>-work.md` 규약을 따름
- [ ] frontmatter 없음 (work 파일은 frontmatter 미사용)
- [ ] work 파일의 9개 필수 섹션 모두 존재: 기능 요약 / 파일 목록 / DTO / Repository Interface / Repository 구현 / Service / Controller / 테스트 케이스 / Response 코드
- [ ] 모든 코드 블록이 실제 구현 가능한 수준 (대략적 스케치 금지)

## request.md 반영

- [ ] request.md "확정 설계 결정사항" 의 모든 [ ] 항목에 답이 채워져 있음
- [ ] 답변 내용이 work 파일의 해당 섹션에 실제로 반영됨 (예: "큐 적용 Y" → Service 데코레이터에 반영)
- [ ] request.md `affected_tables` 가 테스트 케이스 `[FAIL:duplicate]` 수와 일치

## 사전 구현 필요 항목 (해당 시만)

- [ ] CLAUDE.md 규칙 중 이 기능이 의존하는 인프라·데코레이터·모듈이 `src/` 에 실제 존재함을 확인했는가
- [ ] 존재하지 않는 것이 있다면 `## 사전 구현 필요 항목` 섹션에 `[ ]` 로 나열했는가 (1~7번 섹션에 섞어넣지 말 것)
- [ ] 전부 `src/` 에 이미 존재하는 경우 `## 사전 구현 필요 항목` 섹션 자체를 삭제했는가

## 프로젝트 규칙 준수 (CLAUDE.md + docs/ 대조)

Claude 는 work 작성 직후 아래 항목을 프로젝트 CLAUDE.md · docs 와 대조해 ✅/❌ 로 출력한다. 미충족 항목은 즉시 work 수정 후 재출력.

- [ ] **아키텍처** — 파일 경로·모듈 구조가 CLAUDE.md "Architecture" 및 `docs/architecture.md` 규칙과 일치
- [ ] **Entity** — PK/UK/IDX/FK constraint 명명, 데코레이터 선택이 CLAUDE.md "Entity Rules" 및 `docs/entity.md` 규칙과 일치 (해당 있을 때)
- [ ] **Repository** — 메서드 시그니처·try/catch·관계 로딩이 CLAUDE.md "Repository" 및 `docs/repository.md` 규칙과 일치
- [ ] **DTO / Swagger** — 네이밍·파일 구성·데코레이터 순서가 CLAUDE.md "Naming" / "Swagger" 및 `docs/swagger-dto.md` 규칙과 일치
- [ ] **Error Handling** — throw 패턴·에러 메시지 키가 CLAUDE.md "Error Handling" 및 `docs/error-handling.md` 규칙과 일치
- [ ] **Service / 공통 로직** — private 헬퍼 금지·util 분리·DI 패턴이 CLAUDE.md "Service 계층 규칙" / "공통 로직 분리 규칙" 과 일치
- [ ] **큐·트랜잭션·인증** — CLAUDE.md 의 해당 섹션이 있고 기능이 적용 대상이면, request.md 결정사항과 CLAUDE.md 규칙대로 구현 반영 (없으면 생략)

## 테스트 케이스

- [ ] `[SUCCESS]` × 1 포함
- [ ] `[FAIL:validation]` × 1 이상 포함
- [ ] `[FAIL:duplicate]` — `affected_tables` 원소 수만큼 포함 (해당 없으면 생략)
- [ ] `[FAIL:service]` — service throw 분기 수만큼 포함
- [ ] `[FAIL:repository]` — repository catch 블록 수만큼 포함
- [ ] 테스트 강도 규칙 준수 ([../feature-implement/test-file.md](../feature-implement/test-file.md) 참고)

# Work 파일 규칙

- 템플릿: `.harness/templates/work.md` 기반으로 작성
- 필수 섹션: 기능 요약 / 파일 목록 / DTO / Repository Interface / Repository 구현 / Service / Controller / 테스트 케이스 / Response 코드
- 선택 섹션: **사전 구현 필요 항목** (아래 규칙 참고)
- 코드 블록은 실제 구현 가능한 수준으로 작성 (대략적 스케치 금지)
- **frontmatter 쓰지 않음** — 상태 플래그(`approved` / `implemented` 등) 도 기재 금지. validator 가 frontmatter 존재 시 reject
- **work 파일 저장 즉시** PostToolUse 훅이 `validate-work.js`를 자동 실행하여 독립 검증. 실패 시 즉시 수정 후 재저장
- **work 파일 작성 완료 직후**, [work-review.md](./work-review.md) 의 모든 항목을 대조하여 결과를 대화에 출력 (✅/❌ 형식). 미충족 항목은 즉시 work 파일 수정 후 재출력

## 사전 구현 필요 항목 — 작성 판단 규칙

work.md 초안 작성 시, CLAUDE.md 의 규칙을 적용하려 하지만 **해당 인프라/데코레이터/모듈이 실제 `src/` 에 존재하지 않는** 케이스를 탐지해야 한다.

### 탐지 절차

1. CLAUDE.md (+ 링크된 `docs/*.md`) 에서 이 기능에 적용될 규칙을 식별 (예: BullMQ 큐, Transactional, 공용 util 등)
2. 각 규칙이 참조하는 **구체 파일·클래스·데코레이터** 를 뽑음 (예: `@UseQueue` → `src/modules/queue/use-queue.decorator.ts`)
3. Bash (`ls` / `find`) 또는 Glob 으로 **해당 파일이 실제 존재하는지 확인**
4. 존재하지 않으면 → work.md 의 `## 사전 구현 필요 항목` 섹션에 `[ ]` 체크리스트로 추가
5. 해당되는 항목이 하나도 없으면 섹션 자체를 **삭제** (optional 섹션)

### 전제와 흐름

- 사전 구현 항목은 **이 기능의 구현 계획(1~7번 섹션) 에 포함하지 않는다** — 별도 인프라 작업으로 분리
- 사용자가 별도 작업으로 해당 인프라 구현 후 각 항목을 `[x]` 로 체크
- 전부 `[x]` 가 되어야 `"작업 시작"` 명령으로 본 기능 구현 진입 가능 (feature-implement 전제 조건)
- 인프라 구현 자체는 별도 `"기능 생성"` 사이클로 처리하거나 수동 구현 — 선택은 사용자

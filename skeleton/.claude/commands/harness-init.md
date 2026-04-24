---
description: 하네스 샘플을 템플릿 삼아 프로젝트 루트에 CLAUDE.md + docs/ 생성
---

이 프로젝트의 루트에 **프로젝트 규칙 문서(CLAUDE.md + docs/)** 를 생성한다. 하네스 샘플(`.harness/samples/starter/`) 의 **섹션 구조와 설명 톤을 템플릿으로** 참고하되, 실제 프로젝트 내용을 스캔해 맞게 치환한다.

## 절차

### ① 기존 파일 체크 (덮어쓰기 방지)

- 루트에 `CLAUDE.md` 가 이미 있으면 → 사용자에게 보고하고 **덮어쓰기 여부 확인**. 기본은 중단.
- 루트에 `docs/` 가 이미 있으면 → 존재하는 파일 목록 보고 후 각 파일별 **생성/건너뛰기 여부** 확인.

### ② 샘플 참조 구조 로드

`.harness/samples/starter/CLAUDE.sample.md` 와 `.harness/samples/starter/docs/*.md` 를 읽어 다음을 파악:
- 섹션 구성 (어떤 `##` 헤더가 있는지)
- 각 섹션의 서술 톤(간결한 bullet · 코드 블록 예시 · `→ 상세: docs/xxx.md` 링크 패턴)
- `## 플러그인 설정` 내부 블록 (명령어 라우팅 + 메모리 시스템) — **그대로 복사**

### ③ 프로젝트 실상 스캔

- `package.json` — 스택 식별 (nest / typeorm / bullmq / passport / class-validator 등 실제 의존성)
- `src/` 트리 — 디렉터리 구조 파악
- 주요 설정 파일 — `tsconfig.json`, `typeorm.config.ts`, `main.ts` 등에서 path alias / DB / 전역 파이프 확인
- 소수 대표 파일 읽기 — controller / service / entity / repository 각 1개씩으로 컨벤션 파악

### ④ 생성 방침

- **샘플과 동일 섹션 구조 유지**: `## 플러그인 설정`, `## Architecture`, `## Service 계층 규칙`, `## Naming Conventions`, `## Repository`, `## Entity`, `## Error Handling`, `## Swagger`, `## Auth`, `## Checklist` 등
- **이 프로젝트가 실제로 쓰지 않는 섹션은 제외** (예: BullMQ 를 안 쓰면 큐 섹션 생략, JWT 가 없으면 Auth 섹션 축약)
- **샘플의 구체 값은 프로젝트 실상으로 치환**
  - 샘플: `@UseQueue('user-consumer', ...)` → 이 프로젝트가 다른 큐 솔루션이면 해당 규약
  - 샘플 경로 `src/api/v1/<domain>/` → 이 프로젝트의 실제 경로
  - 샘플 에러 키 `validationErrors` → 이 프로젝트의 실제 키
- `## 플러그인 설정` 하위 `### 명령어 라우팅` + `### 메모리 시스템` 블록은 **샘플에서 문구 그대로 복사** (하네스 작동 필수 블록)
- docs/ 파일명은 샘플과 동일 유지: `architecture.md`, `entity.md`, `repository.md`, `error-handling.md`, `swagger-dto.md`. 해당 기술 안 쓰면 파일 자체 생략.

### ⑤ 보존할 수 없는 것은 TODO 로

샘플 규칙을 이 프로젝트에 매핑할 때 **Claude 판단이 애매한 항목** 은 삭제 말고 TODO 주석으로 남김:
```markdown
<!-- TODO: 이 프로젝트의 에러 응답 키 규약 확인 후 반영 -->
```

## 완료 후

생성된 파일 요약 출력:
- `CLAUDE.md` 섹션 N개 / `docs/` 파일 M개
- 스캔 결과 기반으로 어떤 샘플 섹션을 **포함/생략/축약** 했는지 간략 설명
- TODO 주석 남긴 항목 목록

## 주의

- 루트 `CLAUDE.md` 가 이미 있는 상태에서 실행했는데 덮어써도 된다고 확인받았다면, 기존 내용 중 "플러그인 설정" 외 프로젝트 고유 규칙은 **병합 시도** 후 덮어쓸 것 (그냥 날리지 말 것)
- `/init` (Claude Code 내장) 과 이 커맨드는 별개. `/init` 은 일반 프로젝트용, 이건 하네스 플러그인 사용 시 전용.

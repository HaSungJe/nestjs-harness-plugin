<!-- 실제 작성 예시: .harness/samples/workflow/work.md -->
# Work Plan — {featureName}

## 기능 요약
- **기능**: {feature_goal}
- **API**: `{api_method} {api_path}`
- **도메인**: {domain}

---

<!--
  선택 섹션 — CLAUDE.md 규칙 중 이번 기능이 의존하는 인프라/데코레이터/모듈이
  src/ 에 존재하지 않을 때만 작성. 없는 경우 이 섹션 전체를 삭제하고 다음으로 진행.
-->

## 사전 구현 필요 항목

<!-- 예시 (없으면 섹션 삭제):
- [ ] BullMQ Queue 인프라 — src/modules/queue/ 에 QueueModule + @UseQueue 데코레이터 + write-queue.registry 생성 (CLAUDE.md 'BullMQ' 섹션 기준)
- [ ] 공용 Audit Util — src/common/utils/audit.ts 생성 (CLAUDE.md 'Service 계층 규칙' 중 util 분리 기준)
-->

> **⚠️ 이 섹션에 항목이 있으면** `"작업 시작"` 명령은 **모든 항목이 `[x]` 로 완료된 후에만** 진입 가능. 사용자가 별도 작업으로 해당 인프라를 구현 → 완료 후 각 항목 체크 → 그 다음에 본 기능 구현 진행.

---

## 파일 목록

<!--
  경로·파일 구조는 프로젝트 CLAUDE.md "Architecture" 섹션 및 그에 링크된
  `docs/architecture.md` 의 "New Domain Minimum File Structure" 규약을 따른다.
  아래 행은 예시 — 실제 프로젝트 규약에 맞춰 작성.
-->

| 파일 | 작업 |
|------|------|
| `<domain>/dto/<file>.dto.ts` | 신규 생성 |
| `<domain>/interfaces/<domain>.repository.interface.ts` | 메서드 추가 |
| `<domain>/repositories/<domain>.repository.ts` | 메서드 추가 |
| `<domain>/<domain>.service.ts` | 메서드 추가 |
| `<domain>/<domain>.controller.ts` | 엔드포인트 추가 |
| `<domain>/test/<featureName>.spec.ts` | 신규 생성 |

<!-- 변경 없는 파일도 명시: `xxx.module.ts` — 변경 없음 -->

---

## 1. DTO

> 네이밍·파일 구성 규칙은 CLAUDE.md "Naming Conventions" 및 "DTO" 관련 섹션 참고.

```typescript
// 필요한 DTO 클래스 작성 (QueryDto / ParamDto / ItemDto / ResultDto 등 프로젝트 규약대로)
```

---

## 2. Repository Interface

> 시그니처·파라미터 타입 규칙은 CLAUDE.md "Repository" 섹션 참고.

```typescript
// 추가할 메서드 시그니처
```

---

## 3. Repository 구현

> try/catch · 에러 처리 · 관계 로딩 규칙은 CLAUDE.md "Repository" / "Error Handling" 섹션 참고.

```typescript
// 구현 코드
```

---

## 4. Service

> 트랜잭션·큐·권한 등 데코레이터 적용은 CLAUDE.md 해당 섹션 규칙대로.
> 결정이 필요한 항목(Y/N, 적용 범위)은 request.md "확정 설계 결정사항" 에서 확정한 값을 반영.

```typescript
// 구현 코드
```

---

## 5. Controller

> Swagger 데코레이터 순서·JSDoc·Guard 규칙은 CLAUDE.md "Swagger" / "Auth" 섹션 참고.

```typescript
// 엔드포인트 + Swagger 데코레이터
```

---

## 6. 테스트 케이스

> 테스트 방식·강도·케이스 구성은 `.harness/docs/feature-implement/test-file.md` 참고.

```
[SUCCESS]           정상 흐름
[FAIL:validation]   validation 분기 대표 샘플링
[FAIL:duplicate]    {테이블명} — {컬럼} 중복   ← affected_tables 기반, 해당 없으면 생략
[FAIL:service]      {service throw 분기마다}
[FAIL:repository]   {repository catch 블록마다}
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
<!-- 발생 가능한 에러 코드 전부 기재 -->

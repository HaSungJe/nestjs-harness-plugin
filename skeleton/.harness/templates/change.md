<!--
  실제 작성 예시는 .harness/samples/workflow/ 의 워크플로 산출물 참고.
  이 템플릿은 "기존 기능에 대한 변경요청" 을 회차별로 기록하기 위한 양식이다.
  - 원본 request.md / work.md 는 수정 금지 (참조만)
  - 회차별 분리: <featureName>-change-<YYMMDD>-<N>.md
  - N = 같은 날 기존 change 파일 개수 + 1
-->

# Change Request — {featureName} (회차 {N})

## 메타
- **기능**: {feature_goal}
- **도메인**: {domain}
- **API**: `{api_method} {api_path}`
- **원본 work**: `.harness/output/work/<domain>/<featureName>-work.md`
- **원본 request**: `.harness/output/request/<domain>/<featureName>-request.md`
- **이전 회차 change**: `<featureName>-change-<YYMMDD>-<N-1>.md` (없으면 "없음")
- **변경요청일**: {YYYY-MM-DD}

---

## 변경요청 사유
<!-- 사용자가 구두로 설명한 변경 사유를 1~3문단으로 정리 -->

---

## 변경 범위 (영향 분석)

원본 work.md / request.md 를 읽어 이번 변경이 닿는 항목을 식별하여 나열.

### 수정 대상 항목
<!-- 원본 work.md 의 어떤 섹션·필드가 바뀌는지 -->

| 원본 위치 | 변경 전 | 변경 후 |
|-----------|---------|---------|
| `<work.md 섹션>` | {as-is} | {to-be} |

### 신규 추가 항목
<!-- 원본에 없던 신규 DTO/메서드/엔드포인트 등 -->

### 삭제 항목
<!-- 원본에 있었지만 제거되는 항목 -->

### 영향받는 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `<file_path>` | 수정 / 삭제 / 신규 | {description} |

---

## 변경 후 스펙

원본 work.md 에서 바뀌는 부분만 발췌해 새 스펙으로 다시 작성. 원본 그대로인 섹션은 "변경 없음" 으로 표시.

### DTO
<!-- 변경 있을 때만, 코드 블록으로 작성. 변경 없으면 "변경 없음" -->

### Repository Interface
<!-- 변경 없으면 "변경 없음" -->

### Repository 구현
<!-- 변경 없으면 "변경 없음" -->

### Service
<!-- 변경 없으면 "변경 없음" -->

### Controller
<!-- 변경 없으면 "변경 없음" -->

### 테스트 케이스 변경
<!-- 추가/수정/삭제될 테스트 케이스 명세. 새 분기 발생 시 해당 카테고리 추가 -->

```
[SUCCESS]           {추가/수정 시만 기재, 아니면 "변경 없음"}
[FAIL:validation]   {추가/수정/삭제 케이스}
[FAIL:duplicate]    {affected_tables 변경 시 반영}
[FAIL:service]      {service throw 분기 변경 시 반영}
[FAIL:repository]   {repository catch 블록 변경 시 반영}
```

### Response 코드 변경
<!-- 새로 추가되는 상태코드 또는 제거되는 상태코드 -->

| 상태코드 | 원인 | 변경 유형 |
|----------|------|-----------|
| 200 | 성공 | 변경 없음 |

---

## 사전 구현 필요 항목 (해당 시만)

<!--
  변경에 따라 src/ 에 없는 새 인프라/데코레이터/모듈 의존이 생긴 경우만 작성.
  없으면 이 섹션 전체를 삭제. 작성 규칙은 work-file.md "사전 구현 필요 항목" 과 동일.
-->

> **⚠️ 이 섹션에 항목이 있으면** `"작업 시작"` (`/feature-implement`) 명령은 **모든 항목이 `[x]` 로 완료된 후에만** 진입 가능 — 자동 라우팅으로 수정 모드 진입.

---

## 확정 설계 결정사항

<!--
  코드 컨벤션·docs 만으로 판단이 애매한 항목을 [ ] 체크리스트로 나열.
  사용자가 답을 채운 뒤 "작업 시작" (`/feature-implement`) 으로 다음 단계 진행 — 자동으로 수정 모드 라우팅.
  미답 항목 있으면 Claude 는 구현에 진입하지 않는다.
  상세 가이드: .harness/docs/feature-plan/design-decisions.md (feature-plan 의 규칙을 그대로 차용)
-->

<!-- 예시 형식 (해당 항목 없으면 섹션 자체 삭제):
- [ ] 기존 응답 형식 유지 여부 (Y/N) — 근거: CLAUDE.md 의 응답 형식 규칙
- [ ] 새 컬럼의 nullable 여부 (Y/N) — 근거: CLAUDE.md 의 Entity 규칙
-->

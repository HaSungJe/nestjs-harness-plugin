<!-- 실제 작성 예시: .harness/samples/workflow/request.md -->
---
# 예: "회원가입" — 이 기능이 무엇을 하는지 한 줄 요약
feature_goal: "관리자용 회원가입"

# 예: "user" — 도메인명 (프로젝트 디렉터리 구조는 CLAUDE.md 참고)
domain: "user"

# GET | POST | PATCH | PUT | DELETE
api_method: "POST"

# 예: "/api/v1/user/admin/sign" — 실제 route 규약은 CLAUDE.md 참고
api_path: "/api/v1/user/admin/sign"

# 예: ["t_user", "t_user_profile"] — INSERT/UPDATE/DELETE 대상 테이블 (duplicate 테스트 케이스 수 결정)
affected_tables: ["t_user"]

# 프로젝트 CLAUDE.md 에 추가 메타 규칙이 있으면 아래에 필드로 추가 (예: queue_required 등)
# 필드명과 값의 의미는 CLAUDE.md / docs/ 가 정의. 이 템플릿은 구조만 제공.
---

<!-- 이 기능이 왜 필요한지, 무엇을 하는지 설명 -->
## 기능 설명
관리자가 직접 회원가입을 처리하기 위한 기능

<!-- Method, Path, Request Body/Params, Response 형태 -->
## API Spec
- Method: POST
- Path: /api/v1/user/admin/sign
- Request Body:
    - login_id: string (필수, 2~16자리)
    - email: string (필수, 이메일여부 확인)
    - login_pw: string (필수, 6~20자리)
    - login_pw2: string (필수, 6~20자리, login_pw와 동일해야함.)
    - nickname: string (필수)
- Response: 200 void

<!-- 중복 체크, 권한, 조건 분기 등 -->
## 비즈니스 규칙
- 관리자 권한 체크

<!-- 관련 도메인, 참고할 기존 코드, 특이사항 -->
## 참고사항
- /api/v1/user/sign

<!--
  ## 확정 설계 결정사항
  - 프로젝트의 코드 컨벤션·docs (CLAUDE.md + docs/) 만으로 판단할 수 없는 항목을
    Claude 가 [ ] 체크리스트로 나열한다. 사용자가 답을 채운 뒤 work 작성.
  - 미답 항목이 있으면 Claude 는 work 파일을 작성하지 않는다.
  - 어떤 항목을 질문해야 하는지(카테고리)는 프로젝트 CLAUDE.md 의 규칙들 중
    "Y/N 선택지" 또는 "값 선택" 이 필요한 것들을 Claude 가 스스로 식별한다.
    상세 가이드: .harness/docs/feature-plan/design-decisions.md
-->
## 확정 설계 결정사항
<!-- 예시 형식 (실제 항목은 CLAUDE.md 규칙에서 Claude 가 골라 추가):
- [ ] 인증 필요 여부 — 근거: CLAUDE.md 의 인증 관련 섹션
- [ ] 큐 적용 여부 — 근거: CLAUDE.md 에 큐/메시지큐 관련 섹션이 있을 때만 질문
- [ ] 성공 응답 형식 — 근거: CLAUDE.md 의 응답 형식 규칙
-->

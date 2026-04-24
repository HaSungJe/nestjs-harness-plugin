---
feature_goal: "관리자 - 회원 비밀번호 변경"
domain: "user"
api_method: "PATCH"
api_path: "/api/v1/user/admin/:user_id/password"
affected_tables: ["t_user"]
queue_required: "Y"
---

<!-- 이 기능이 왜 필요한지, 무엇을 하는지 설명 -->
## 기능 설명
관리자가 특정 회원의 비밀번호를 강제로 재설정하는 기능.
(회원 분실·초기화 지원용. 관리자는 현재 비밀번호를 모르고 설정)

<!-- Method, Path, Request Body/Params, Response 형태 -->
## API Spec
- Method: PATCH
- Path: /api/v1/user/admin/:user_id/password
- Auth: PassportJwtAuthGuard + @Roles('ADMIN', 'SUPER_ADMIN')
- Path Param:
    - user_id: string (필수) — 비밀번호를 변경할 대상 회원 ID
- Request Body:
    - new_pw: string (필수, 6~20자) — 새 비밀번호
    - new_pw2: string (필수, 6~20자, new_pw 와 동일) — 새 비밀번호 확인
- Response: 204 No Content

<!-- 중복 체크, 권한, 조건 분기 등 -->
## 비즈니스 규칙
- 관리자 권한(ADMIN, SUPER_ADMIN) 필요
- path param `user_id` 에 해당하는 회원이 존재해야 함 (없으면 400)
- `new_pw` 와 `new_pw2` 가 동일해야 함
- 저장 시 `getBcrypt(new_pw)` 해시하여 `t_user.login_pw` UPDATE
- Repository 범용 `update` 메서드 사용, `new UserEntity()` 로 객체 생성 (BeforeUpdate 훅 트리거)

<!-- 관련 도메인, 참고할 기존 코드, 특이사항 -->
## 참고사항
- 참고 기능: `PATCH /api/v1/user/password` (비밀번호 해시·변경 로직)
- 참고 기능: `PATCH /api/v1/user/admin/:user_id/state` (관리자 + path param 패턴, 본인 차단 규칙)
- `@PassportUser('user_id')` 로 관리자 본인 식별 (본인 차단 판단용)

## 확정 설계 결정사항

### A. 인증·권한
- [x] 인증 필요 여부 (PassportJwtAuthGuard, Y/N): **Y**
- [x] 권한 제한 (@Roles 값): **ADMIN, SUPER_ADMIN**

### B. 큐
- [x] 큐 적용 여부 (Y/N): **Y** (`user-consumer` / `user-service-admin-password-change`)

### C. 응답 형식
- [x] 성공 응답 형식 (204 / ResultDto): **204 No Content**

### E. 트랜잭션
- [x] @Transactional 적용 여부 (Y/N): **Y**

### H. 기타
- [x] 관리자 본인의 `user_id` 를 대상으로 비밀번호 변경 허용 여부: **Y** (허용)
- [x] `RESIGNED` 상태 회원의 비밀번호 변경 허용 여부: **N** (차단)
- [x] 비밀번호 변경 후 대상 회원의 활성 세션 강제 만료 처리: **Y** (is_delete=1 + logout_at=NOW)
- [x] 새 비밀번호가 현재 비밀번호와 동일할 때 차단 여부: **N** (차단 안 함 — 관리자 리셋이므로)

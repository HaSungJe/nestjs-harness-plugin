# 구현 완료 리포트 — adminUserPasswordChange

## 요약
- **기능**: 관리자 - 회원 비밀번호 변경
- **도메인**: user
- **API**: `PATCH /api/v1/user/admin/:user_id/password`
- **완료일**: 2026-04-24

## 생성 / 수정된 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/api/v1/user/dto/admin-user-password-change.dto.ts` | 생성 | `AdminUserPasswordChangeParamDto`, `AdminUserPasswordChangeDto` |
| `src/api/v1/user/user.service.ts` | 수정 | `adminPasswordChange` 메서드 추가 (`@UseQueue` + `@Transactional`, `dayjs` 사용) |
| `src/api/v1/user/user.controller.ts` | 수정 | `PATCH /admin/:user_id/password` 엔드포인트 추가 (`RolesGuard` + `@Roles('ADMIN','SUPER_ADMIN')`) |
| `src/api/v1/user/test/adminUserPasswordChange.spec.ts` | 생성 | 10 케이스 (SUCCESS×2 / FAIL:validation×2 / FAIL:service×3 / FAIL:repository×3) |

## 테스트 결과
- **스위트**: 1개 / **전체**: 10개 / **통과**: 10개 / **실패**: 0개

테스트 상세:
- `[SUCCESS]` 정상 변경 + 활성 세션 강제 만료
- `[SUCCESS]` 관리자가 본인 user_id 대상으로 변경 허용
- `[FAIL:validation]` body 필수 필드 누락
- `[FAIL:validation]` new_pw 최소 길이 위반 (5자)
- `[FAIL:service]` 새 비밀번호 불일치
- `[FAIL:service]` 존재하지 않는 회원
- `[FAIL:service]` RESIGNED 회원 비밀번호 변경 차단
- `[FAIL:repository]` findOne 실패
- `[FAIL:repository]` update 실패
- `[FAIL:repository]` updateSession 실패

## 자가 수복 이력
| 시도 | 실패 원인 | 수정 내용 |
|------|-----------|-----------|
| — | 없음 — 최초 실행 통과 | — |

## 잔여 이슈
- 관리자가 본인 비밀번호를 이 API 로 변경할 수 있음 (H1=Y). 자기 자신 리셋 후 활성 세션 강제 만료 → 관리자가 즉시 재로그인 필요. 운영 UX 상 이슈가 되면 본인 차단 규칙으로 전환 고려.
- 현재 비밀번호와 동일한 값으로도 변경 가능 (H4=N). 감사 로그로만 추적 가능.

# 구현 완료 리포트 — userRefresh

## 요약
- **기능**: 사용자 로그인 refresh — access/refresh 토큰 재발급 (체인 회전 + 동시요청 멱등 + 조건부 IP 검증)
- **도메인**: user
- **API**: `POST /api/v1/user/refresh`
- **완료일**: 2026-04-22

## 생성 / 수정된 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/api/v1/user/entities/session-refresh.entity.ts` | 수정 | `@Unique('UK_SessionRefresh_BeforeRefreshHash', ['before_refresh_hash'])` 추가 — 동시 회전 race 방어 |
| `src/api/v1/user/dto/user-refresh.dto.ts` | 생성 | `UserRefreshDto` (refresh_token 필수) + `UserRefreshResultDto` |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 수정 | `findOneSession`, `findOneSessionRefresh` 시그니처 추가 |
| `src/api/v1/user/repositories/user.repository.ts` | 수정 | 두 조회 메서드 구현 + `insertSessionRefresh` 의 1062 분기에 `UK_SessionRefresh_BeforeRefreshHash` → `errorCode: 'REFRESH_ALREADY_ROTATED'` 추가 |
| `src/api/v1/user/user.service.ts` | 수정 | `refresh(dto, ip)` 메서드 추가 — submitted/rotated 2단계 조회 + local arrow `validateAndLoadSession`, `replyRotated` |
| `src/api/v1/user/user.controller.ts` | 수정 | `POST /refresh` 엔드포인트 + `@Ip()` + Swagger |
| `src/api/v1/user/test/userRefresh.spec.ts` | 생성 | 16 케이스 (SUCCESS 4 + FAIL:validation 1 + FAIL:service 7 + FAIL:duplicate 1 + FAIL:repository 3) |

## 테스트 결과
- **스위트**: 10개 / **전체**: 75개 / **통과**: 75개 / **실패**: 0개
- **userRefresh 단독**: 16/16 통과 (5.77s)
- **전체 통합 (`--runInBand`)**: 75/75 통과 (12.31s)

## 자가 수복 이력
| 시도 | 실패 원인 | 수정 내용 |
|------|-----------|-----------|
| 1 | 없음 — 최초 실행 통과 | - |

> 전체 테스트 병렬 실행 시 jest worker 2개가 OOM 으로 크래시하는 현상 관찰 (Windows + ts-jest 환경 이슈, 본 feature 변경 이전부터 존재). `--runInBand` 로 직렬 실행 시 정상 통과하며, 개별 스펙 격리 실행 시에도 통과 확인. 본 feature 코드와는 무관.

## 잔여 이슈
- 없음. 설계 결정 사항은 전부 구현 반영:
  - submitted 미만료 판정은 DB `NOW()` 기준 (WHERE `end_at > NOW()`)
  - 세션 `is_delete = 0` 은 항상 WHERE, 요청 `ip` 는 값이 있을 때만 WHERE 에 추가
  - `session.ip` NULL 레코드는 MySQL NULL 비교 특성상 자동 제외
  - race 방어는 DB UK + errno 1062 catch → B 재진입으로 멱등성 보장, 큐 미적용
  - 에러 메시지는 모든 실패 분기에서 "refresh token 이 유효하지 않습니다." 로 통일 (세션 상태 은닉)

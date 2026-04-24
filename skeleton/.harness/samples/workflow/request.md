---
feature_goal: "사용자 로그인 refresh — access/refresh 토큰 재발급 (체인 회전 + B요청 멱등)"
domain: "user"
api_method: "POST"
api_path: "/api/v1/user/refresh"
affected_tables: ["t_session_refresh"]
queue_required: "N"
---

## 기능 설명
만료가 임박한 access_token 을 갱신하기 위해 refresh_token 을 제출하여 **새로운 access_token + 새로운 refresh_token 세트**를 발급받는 API.
refresh_token 은 1회용으로 **회전(rotation)** 하며, 발급 체인은 `before_refresh_hash` 로 연결되어 Next.js 병렬 fetch 등에서 발생하는 B요청(이미 회전된 토큰을 재제출)을 **멱등(idempotent)** 하게 처리한다.

## API Spec
- Method: POST
- Path: /api/v1/user/refresh
- 인증: 불필요 (refresh_token 자체가 자격 증명)
- Request Body:
    - refresh_token: string (필수) — 최근에 발급된 refresh JWT (http-only cookie 가 아닌 body 로 전송)
- Response: 200
    - access_token: string — 새 JWT (payload: `{type: 'access', user_id, session_id}`)
    - access_expires_at: string (ISO 8601) — 만료 시각
    - refresh_token: string — 새 JWT (payload: `{type: 'refresh', user_id, session_id}`)
    - refresh_expires_at: string (ISO 8601) — 만료 시각

## 비즈니스 규칙

### 입력 검증
- refresh_token JWT 서명/만료 검증 실패 → 400 "refresh token 이 유효하지 않습니다."
- payload.type !== 'refresh' → 400 동일 메시지
- payload 에 user_id / session_id 누락 → 400 동일 메시지

### 토큰 매칭 (B 먼저 → A 순서 + DB UNIQUE 로 race 방어)

race 조건 (A·B 가 거의 동시에 같은 refresh_token 으로 요청) 에서 **토큰이 2개 파생되는 분기** 를 DB 레벨에서 막기 위해:
- `t_session_refresh.before_refresh_hash` 에 **`UK_SessionRefresh_BeforeRefreshHash` UNIQUE 제약 추가** (MySQL 은 NULL 중복 허용이라 최초 발급 레코드의 NULL 은 문제없음)
- 조회 순서는 **B 먼저 → A** 로 고정

#### 흐름
1. JWT 서명·만료 검증 → 실패 시 400 "refresh token 이 유효하지 않습니다."
2. `old_hash = SHA256(refresh_token)` 계산
3. **B 경로 먼저 조회** — `SELECT ... WHERE before_refresh_hash = old_hash` (= 이미 회전된 자식 레코드)
    - 매칭되면: **부모 레코드 조회** — `SELECT ... WHERE refresh_hash = old_hash AND end_at > NOW()` (= 원래 제출한 토큰의 레코드, **DB 시간 기준** 으로 미만료 조건을 WHERE 에 포함해 한 번에 판정. `Date.now()` 사용 시 Node 프로세스 시계 편차 위험을 회피)
        - 매칭 실패 (존재 없음 or `end_at <= NOW()`) → 400 "refresh token 이 유효하지 않습니다."
        - 자식 레코드의 `session_id` 로 `t_session` 조회 → `is_delete = 1` 이면 400 "refresh token 이 유효하지 않습니다." (세션 상태 은닉)
        - **IP 검증**: `t_session.ip` 가 현재 요청 `@Ip()` 와 불일치 → 400 "refresh token 이 유효하지 않습니다." (재사용 공격 방어)
        - 자식 레코드의 `refresh_encrypted` 를 복호화하여 **기존에 발급된 새 refresh_token 을 그대로 반환** (access_token 은 매번 새로 서명)
4. **B 없으면 A 경로 조회** — `SELECT ... WHERE refresh_hash = old_hash AND end_at > NOW()` (부모 조회 + 미만료 검사를 **DB 시간 기준** 으로 한 번에)
    - 매칭 실패 (존재 없음 or 만료) → 400 "refresh token 이 유효하지 않습니다."
    - `t_session.is_delete = 1` → 400 "refresh token 이 유효하지 않습니다." (세션 상태 은닉)
    - **IP 검증**: `t_session.ip` 와 현재 요청 ip 불일치 → 400 "refresh token 이 유효하지 않습니다."
    - 새 access_token, 새 refresh_token 서명
    - `t_session_refresh` INSERT — `{session_id (기존 재사용), refresh_hash: SHA256(new), refresh_encrypted: AES_GCM(new), before_refresh_hash: old_hash, end_at: NOW()+1d}`
5. **INSERT 에서 errno 1062 on `UK_SessionRefresh_BeforeRefreshHash`** 발생 시
    - 의미: 동시 A 요청이 먼저 회전을 끝낸 상태
    - 처리: 3번 B 경로 로직을 재수행 (자식 재조회 → 부모 end_at · is_delete · ip 재검증 → 복호화 반환)
    - errno 1062 on `UK_SessionRefresh_RefreshHash` 가 뜨면: 400 "refresh token 이 유효하지 않습니다." (비정상 — 새 refresh_token 해시가 기존과 충돌 — 통계적으로 거의 불가능)

### IP 검증 상세
- 로그인 시 `t_session.ip` 에 `@Ip()` 값을 저장 (userSignIn 에서 이미 반영됨)
- refresh 요청 시 controller 에서 `@Ip()` 로 현재 ip 를 받아 service 에 전달
- **요청 ip 가 있는 경우**: `t_session.ip` 와 현재 ip 를 **엄격 동등 비교** (WHERE 절에 포함) — 불일치 시 findOneSession 이 null 을 반환하여 거절
- **요청 ip 가 null 인 경우**: ip 조건을 WHERE 에서 생략 (프록시/로컬 등 ip 미수집 환경 대응)
- `session.ip` 가 NULL 인 레코드는 MySQL NULL 비교 특성상 `ip = :ip` 에 자동으로 매칭되지 않음 (별도 처리 불필요)
- 목적: 로그인한 클라이언트 이외의 주소에서 refresh 를 제출하는 탈취 시나리오 차단

### 왜 B 먼저인가 — race 시나리오
- A·B 동시 도착 → 둘 다 3번에서 NO MATCH → 둘 다 4번에서 MATCH → 둘 다 INSERT 시도
- UNIQUE 덕에 **한쪽만 성공**. 진 쪽은 5번의 1062 → B 재조회로 승자 토큰 반환 → **양쪽 응답 토큰이 동일** → 멱등 보장
- **DB 레벨에서만 방어** — 큐 미적용 (아래 큐 미사용 사유 참조)

### 트랜잭션
- `@Transactional()` 적용 — A 경로의 조회 + INSERT 원자성
- `@UseQueue` 미적용 (사유는 본 문서 "큐 미사용 사유" 섹션)

## 선결 작업

1. **엔티티 제약 추가** — `src/api/v1/user/entities/session-refresh.entity.ts`
    ```typescript
    @Unique('UK_SessionRefresh_BeforeRefreshHash', ['before_refresh_hash'])
    ```
    기존 `UK_SessionRefresh_RefreshHash` 와 병기. MySQL NULL 허용 특성 덕에 최초 발급 레코드(`before_refresh_hash = null`) 는 중복 저장 가능.

이 외의 공통 유틸(`cipher.ts` / `hash.ts` / `jwt.ts`) 은 userSignIn 구현 시 정비 완료.

## 참고사항
- decryptAesGcm: `src/common/utils/cipher.ts`
- sha256Hex: `src/common/utils/hash.ts`
- extractJwtExpiresAt: `src/common/utils/jwt.ts`
- JwtService.verify 로 서명·만료 검증 (만료 시 `TokenExpiredError` throw → catch 하여 400 변환)
- 프론트 쿠키 수명 갱신을 위해 응답에 `access_expires_at`, `refresh_expires_at` 포함 (userSignIn 과 동일 구조)

## 큐 미사용 사유
- `user-consumer` 는 concurrency 1 의 단일 worker 로, 적용 시 **서로 다른 사용자의 refresh 요청까지 직렬화**되어 전체 refresh throughput 이 1건/시점 으로 수렴
- refresh 는 트래픽 빈도가 높은 기능이므로 전역 직렬화는 성능상 수용 불가
- 동일 refresh_token 에 대한 동시 요청 (A/B race) 의 멱등성은 **`UK_SessionRefresh_BeforeRefreshHash` UNIQUE 제약 + errno 1062 catch → B 재조회** 로 DB 레벨에서 보장. 큐 불필요.

## 확정 설계 결정 사항
1. **refresh_token 전달 위치** — body 의 `refresh_token` 필드로 수신
2. **session 삭제 판정** — `t_session.is_delete = 1` 만 사용. `t_user.state_id` 는 사용자 상태일 뿐 세션 상태가 아니므로 본 feature 에서 미고려
3. **B 경로 만료 기준** — 자식 레코드의 end_at 이 아닌 **부모 레코드(refresh_hash = old_hash)의 end_at** 기준으로 판단 (= 제출된 refresh_token 자체의 만료). 비교는 **DB 시간(NOW())** 으로 수행 (WHERE 절에 `end_at > NOW()` 포함 — `Date.now()` 사용으로 인한 서버 시계 편차 이슈 회피)
4. **재사용 공격 탐지** — IP 조건부 WHERE. 요청 ip 가 있으면 `t_session.ip` 와 엄격 매칭하여 불일치 시 거절, 요청 ip 가 null 이면 조건 생략

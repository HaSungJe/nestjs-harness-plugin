# Work Plan — userRefresh

## 기능 요약
- **기능**: 사용자 로그인 refresh — access/refresh 토큰 재발급 (체인 회전 + B요청 멱등 + IP 검증)
- **API**: `POST /api/v1/user/refresh`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/entities/session-refresh.entity.ts` | 수정 — `@Unique('UK_SessionRefresh_BeforeRefreshHash', ['before_refresh_hash'])` 추가 |
| `src/api/v1/user/dto/user-refresh.dto.ts` | 신규 생성 — `UserRefreshDto` + `UserRefreshResultDto` |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 메서드 추가 — `findOneSession`, `findOneSessionRefresh` |
| `src/api/v1/user/repositories/user.repository.ts` | 메서드 추가 — 위 두 메서드 + `insertSessionRefresh` 의 errno 1062 분기에 `UK_SessionRefresh_BeforeRefreshHash` 처리 추가 |
| `src/api/v1/user/user.service.ts` | `refresh` 메서드 추가 |
| `src/api/v1/user/user.controller.ts` | `POST /refresh` 엔드포인트 추가 (공개) |
| `src/api/v1/user/test/userRefresh.spec.ts` | 신규 생성 — 테스트 스펙 |

`user.module.ts` — 변경 없음 (`SessionEntity` / `SessionRefreshEntity` 이미 등록).
`app.module.ts` — 변경 없음.
`src/common/utils/cipher.ts` / `hash.ts` / `jwt.ts` — userSignIn 에서 이미 생성되어 그대로 사용 (`decryptAesGcm` 추가 사용).

---

## 0. 선행 작업 (엔티티 제약)

### 0-1. `src/api/v1/user/entities/session-refresh.entity.ts`

```typescript
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { SessionEntity } from "./session.entity";

@Entity({name: 't_session_refresh', comment: '로그인 세션 refresh'})
@Unique('UK_SessionRefresh_RefreshHash', ['refresh_hash'])
@Unique('UK_SessionRefresh_BeforeRefreshHash', ['before_refresh_hash'])
export class SessionRefreshEntity {
    @PrimaryGeneratedColumn({name: 'session_refresh_id', type: 'bigint', comment: '로그인 refresh ID', primaryKeyConstraintName: 'PK_SessionRefresh'})
    session_refresh_id: number;

    @ManyToOne(()=> SessionEntity, {nullable: false, onUpdate: 'CASCADE', onDelete: 'CASCADE'})
    @JoinColumn({name: 'session_id', referencedColumnName: 'session_id', foreignKeyConstraintName: 'FK_SessionRefresh_Session'})
    session_id: string;

    @Column({name: 'refresh_hash', length: 64, nullable: false, comment: 'refresh-token SHA-256 해시 (조회용)'})
    refresh_hash: string;

    @Column({name: 'refresh_encrypted', length: 1024, nullable: false, comment: 'refresh-token AES-256-GCM 암호문 (복원용)'})
    refresh_encrypted: string;

    @Column({name: 'before_refresh_hash', length: 64, nullable: true, comment: '직전 refresh-token 해시 (체인 링크, 최초 발급 시 NULL)'})
    before_refresh_hash: string | null;

    @Column({name: 'create_at', type: 'timestamp', nullable: false, comment: '등록일'})
    create_at: Date;

    @Column({name: 'end_at', type: 'timestamp', nullable: false, comment: '만료일'})
    end_at: Date;

    @BeforeInsert()
    insertTimestamp() {
        this.create_at = new Date();
    }
}
```

MySQL 은 NULL 값의 중복을 허용하므로, 최초 발급 레코드들(`before_refresh_hash = NULL`) 은 중복 저장 가능.

---

## 1. DTO

### `src/api/v1/user/dto/user-refresh.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UserRefreshDto {
    @ApiProperty({description: 'refresh token (JWT)', required: true})
    @IsNotEmpty({message: 'refresh token 을 입력해주세요.'})
    refresh_token: string;
}

export class UserRefreshResultDto {
    @ApiProperty({description: 'access token (JWT)'})
    access_token: string;

    @ApiProperty({description: 'access token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    access_expires_at: Date;

    @ApiProperty({description: 'refresh token (JWT)'})
    refresh_token: string;

    @ApiProperty({description: 'refresh token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    refresh_expires_at: Date;
}
```

---

## 2. Repository Interface

`src/api/v1/user/interfaces/user.repository.interface.ts` — 기존 메서드 유지 + 아래 2개 추가.

```typescript
import { FindOptionsWhere } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { StateEntity } from '../entities/state.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionRefreshEntity } from '../entities/session-refresh.entity';

export interface UserRepositoryInterface {
    findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null>;
    insert(entity: UserEntity): Promise<void>;
    update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void>;
    findOneState(where: FindOptionsWhere<StateEntity>): Promise<StateEntity | null>;

    /**
     * 세션(t_session) 단건 조회
     */
    findOneSession(where: FindOptionsWhere<SessionEntity>): Promise<SessionEntity | null>;

    /**
     * 세션 refresh(t_session_refresh) 단건 조회
     */
    findOneSessionRefresh(where: FindOptionsWhere<SessionRefreshEntity>): Promise<SessionRefreshEntity | null>;

    insertSession(entity: SessionEntity): Promise<void>;
    insertSessionRefresh(entity: SessionRefreshEntity): Promise<void>;
}
```

---

## 3. Repository 구현

`src/api/v1/user/repositories/user.repository.ts` — 기존 메서드 유지 + 아래 변경.

```typescript
// 기존 constructor 유지 (StateEntity/SessionEntity/SessionRefreshEntity 이미 주입됨)

/**
 * 세션(t_session) 단건 조회
 */
async findOneSession(where: FindOptionsWhere<SessionEntity>): Promise<SessionEntity | null> {
    try {
        return await this.sessionRepository.findOne({where, loadRelationIds: true});
    } catch (error) {
        throw new InternalServerErrorException({message: '세션 조회에 실패했습니다. 관리자에게 문의해주세요.'});
    }
}

/**
 * 세션 refresh(t_session_refresh) 단건 조회
 */
async findOneSessionRefresh(where: FindOptionsWhere<SessionRefreshEntity>): Promise<SessionRefreshEntity | null> {
    try {
        return await this.sessionRefreshRepository.findOne({where, loadRelationIds: true});
    } catch (error) {
        throw new InternalServerErrorException({message: 'refresh 토큰 조회에 실패했습니다. 관리자에게 문의해주세요.'});
    }
}

/**
 * 세션 refresh(t_session_refresh) 등록
 *  - UK_SessionRefresh_RefreshHash: 새 refresh_hash 충돌 (통계적으로 비정상)
 *  - UK_SessionRefresh_BeforeRefreshHash: 동시 A·A race 에서 진 쪽 (서비스가 이를 감지하여 B 경로로 전환)
 */
async insertSessionRefresh(entity: SessionRefreshEntity): Promise<void> {
    try {
        await this.sessionRefreshRepository.insert(entity);
    } catch (error) {
        if (error.errno === 1062 && error.sqlMessage.indexOf('UK_SessionRefresh_RefreshHash') !== -1) {
            throw new BadRequestException({message: '중복된 refresh token 이 존재합니다.'});
        }
        if (error.errno === 1062 && error.sqlMessage.indexOf('UK_SessionRefresh_BeforeRefreshHash') !== -1) {
            throw new BadRequestException({message: '이미 회전된 refresh token 입니다.', errorCode: 'REFRESH_ALREADY_ROTATED'});
        }
        throw new InternalServerErrorException({message: 'refresh 토큰 등록에 실패했습니다. 관리자에게 문의해주세요.'});
    }
}
```

> `REFRESH_ALREADY_ROTATED` 는 service 단에서 catch 하여 B 재조회 경로로 분기하는 용도. 컨트롤러까지 노출되지 않음.

---

## 4. Service

> **큐 미적용** — request.md 의 "큐 미사용 사유" 에 명시된 대로, `user-consumer` (concurrency 1) 사용 시 서로 다른 사용자의 refresh 요청까지 직렬화되어 throughput 이 떨어짐. 동일 refresh_token 에 대한 race 는 `UK_SessionRefresh_BeforeRefreshHash` + errno 1062 catch → B 재조회로 DB 레벨 보장.

### `src/api/v1/user/user.service.ts` — `refresh` 메서드 추가

```typescript
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Transactional } from 'typeorm-transactional';
import { Raw } from 'typeorm';
import { createValidationError } from '@root/common/utils/validation';
import { sha256Hex } from '@root/common/utils/hash';
import { encryptAesGcm, decryptAesGcm } from '@root/common/utils/cipher';
import { extractJwtExpiresAt } from '@root/common/utils/jwt';
// ... 기존 import 유지
import { UserRefreshDto, UserRefreshResultDto } from './dto/user-refresh.dto';

/**
 * refresh token 회전
 *
 *   용어
 *     old_hash  = SHA256(제출된 refresh_token)
 *     submitted = `refresh_hash = old_hash`         인 레코드 — 제출된 토큰이 저장된 원본
 *     rotated   = `before_refresh_hash = old_hash`  인 레코드 — 그 원본으로부터 이미 발급된 다음 토큰
 *
 *   전체 흐름
 *     1) JWT 검증
 *     2) rotated 있음  → 이미 누군가 교환 완료. 그 토큰을 그대로 돌려준다 (멱등 응답)
 *     3) rotated 없음  → 내가 첫 교환. 새 토큰 서명 + 새 rotated 레코드 INSERT
 *     4) INSERT UK 충돌 → 동시 요청이 방금 교환 완료. (2)로 재진입
 *
 *   동시성·시간
 *     - 시간 비교는 DB NOW() 로만 (서버 시계 편차 회피)
 *     - `UK_SessionRefresh_BeforeRefreshHash` 덕분에 같은 old_hash 로 rotated 는 DB 에 **최대 1건**
 *       → 어떤 동시 요청이 와도 응답 토큰은 동일 (멱등)
 */
@Transactional()
async refresh(dto: UserRefreshDto, ip: string | null): Promise<UserRefreshResultDto> {
    // 1) JWT 검증
    let payload: {type?: string; user_id?: string; session_id?: string};
    try {
        payload = this.jwtService.verify(dto.refresh_token);
    } catch (error) {
        const message = error instanceof TokenExpiredError
            ? 'refresh token 이 만료되었습니다.'
            : 'refresh token 이 유효하지 않습니다.';
        throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
    }
    if (payload?.type !== 'refresh' || !payload.user_id || !payload.session_id) {
        const message = 'refresh token 이 유효하지 않습니다.';
        throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
    }

    const old_hash = sha256Hex(dto.refresh_token);

    // 공통 검증: submitted 존재·미만료(DB NOW()) + 세션 유효(is_delete=0) + IP 일치 (요청 ip 가 있는 경우에만)
    //   - is_delete 는 항상 WHERE 에 포함
    //   - ip 는 요청에 있을 때만 WHERE 에 추가 (없으면 조건 생략 — 프록시/로컬 등 ip 미수집 환경 대응)
    //   - session.ip 가 NULL 인 레코드는 MySQL NULL 비교 특성상 `ip = :ip` 에 자동으로 매칭되지 않음
    const validateAndLoadSession = async (session_id: string): Promise<SessionEntity> => {
        const submitted = await this.userRepository.findOneSessionRefresh({
            refresh_hash: old_hash,
            end_at: Raw((a) => `${a} > NOW()`),
        });
        const sessionWhere: FindOptionsWhere<SessionEntity> = {session_id, is_delete: 0};
        if (ip) sessionWhere.ip = ip;
        const session = submitted
            ? await this.userRepository.findOneSession(sessionWhere)
            : null;
        if (!submitted || !session) {
            const message = 'refresh token 이 유효하지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
        }
        return session;
    };

    // 멱등 응답: 이미 발급된 rotated.refresh_token 을 복호화하여 돌려주고, access_token 만 새로 서명
    const replyRotated = async (rotated: SessionRefreshEntity): Promise<UserRefreshResultDto> => {
        const session = await validateAndLoadSession(rotated.session_id);
        const access = this.jwtService.sign(
            {type: 'access', user_id: session.user_id, session_id: session.session_id},
            {expiresIn: '20m'},
        );
        return {
            access_token: access,
            access_expires_at: extractJwtExpiresAt(access),
            refresh_token: decryptAesGcm(rotated.refresh_encrypted),
            refresh_expires_at: rotated.end_at,
        };
    };

    // 2) 이미 교환된 레코드가 있는가?
    const existing = await this.userRepository.findOneSessionRefresh({before_refresh_hash: old_hash});
    if (existing) return replyRotated(existing);

    // 3) 내가 첫 교환 — submitted·세션 검증 후 새 토큰 서명
    const session = await validateAndLoadSession(payload.session_id);

    const access_token = this.jwtService.sign(
        {type: 'access', user_id: session.user_id, session_id: session.session_id},
        {expiresIn: '20m'},
    );
    const refresh_token = this.jwtService.sign(
        {type: 'refresh', user_id: session.user_id, session_id: session.session_id},
        {expiresIn: '1d'},
    );
    const refresh_expires_at = extractJwtExpiresAt(refresh_token);

    const rotated = new SessionRefreshEntity();
    rotated.session_id = session.session_id;
    rotated.refresh_hash = sha256Hex(refresh_token);
    rotated.refresh_encrypted = encryptAesGcm(refresh_token);
    rotated.before_refresh_hash = old_hash;
    rotated.end_at = refresh_expires_at;

    // 4) INSERT — 동시 경쟁에서 진 쪽은 승자 rotated 로 멱등 응답
    try {
        await this.userRepository.insertSessionRefresh(rotated);
    } catch (error) {
        if ((error as any)?.response?.errorCode === 'REFRESH_ALREADY_ROTATED') {
            const winner = await this.userRepository.findOneSessionRefresh({before_refresh_hash: old_hash});
            if (winner) return replyRotated(winner);
        }
        throw error;
    }

    return {
        access_token,
        access_expires_at: extractJwtExpiresAt(access_token),
        refresh_token,
        refresh_expires_at,
    };
}
```

> `validateAndLoadSession` / `replyRotated` 는 refresh 메서드 내부의 **local arrow function** 이라 CLAUDE.md "private 헬퍼 메서드 금지" 규칙에 해당하지 않음. 두 arrow 모두 refresh 내부에서 2회 이상 재사용되므로 인라인 복제보다 함수화가 가독성·일관성 측면에서 우수.

---

## 5. Controller

`src/api/v1/user/user.controller.ts` — `POST /refresh` 엔드포인트 추가.

```typescript
import { Body, Controller, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBadRequestResultDto, ApiFailResultDto } from '@root/common/dto/global.result.dto';
import { UserRefreshDto, UserRefreshResultDto } from './dto/user-refresh.dto';
// ... 기존 import 유지

/**
 * 사용자 로그인 refresh
 */
@Post('/refresh')
@HttpCode(200)
@ApiOperation({summary: '사용자 로그인 refresh'})
@ApiBody({type: UserRefreshDto})
@ApiOkResponse({description: 'refresh 성공', type: UserRefreshResultDto})
@ApiBadRequestResponse({description: '유효성 오류 / 토큰 유효하지 않음 / 토큰 만료 / 세션 종료 / IP 불일치', type: ApiBadRequestResultDto})
@ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
async refresh(@Body() dto: UserRefreshDto, @Ip() ip: string): Promise<UserRefreshResultDto> {
    return this.userService.refresh(dto, ip ?? null);
}
```

---

## 6. 테스트 케이스

### 파일: `src/api/v1/user/test/userRefresh.spec.ts`

**boilerplate** (필수):
```typescript
jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));
jest.mock('@root/modules/queue/use-queue.decorator', () => ({
    UseQueue: () => () => {},
}));
jest.mock('@root/common/utils/hash', () => ({sha256Hex: jest.fn((v: string) => `HASH(${v})`)}));
jest.mock('@root/common/utils/cipher', () => ({
    encryptAesGcm: jest.fn(() => 'ENC'),
    decryptAesGcm: jest.fn(() => 'restored.refresh.token'),
}));
jest.mock('@root/common/utils/jwt', () => ({
    extractJwtExpiresAt: jest.fn(() => new Date(Date.now() + 60_000)),
}));
```

### 케이스 목록

| 분류 | 설명 |
|------|------|
| `[SUCCESS]` | A 경로 — 정상 회전. 새 refresh_token 발급, INSERT 호출됨 (ip 정상 매칭) |
| `[SUCCESS]` | A 경로 — 요청 ip=null → ip 조건 WHERE 에서 생략, 나머지 정상이면 통과 |
| `[SUCCESS]` | B 경로 — rotated 레코드 존재 → 복원된 refresh_token 반환, INSERT 호출 없음 |
| `[SUCCESS]` | A 경로 INSERT 1062(UK_SessionRefresh_BeforeRefreshHash) 후 B 재진입 — 최종 복원 토큰 반환 |
| `[FAIL:validation]` | 필수 필드 전체 누락 (`{}`) → 400 |
| `[FAIL:service]` | JWT 서명 오류 (`jwtService.verify` throw) → 400 "유효하지 않습니다." |
| `[FAIL:service]` | JWT 만료 (`TokenExpiredError`) → 400 "만료되었습니다." |
| `[FAIL:service]` | payload.type !== 'refresh' → 400 "유효하지 않습니다." |
| `[FAIL:service]` | submitted·rotated 모두 매칭 실패 (존재 없음 or DB NOW() 기준 만료) → 400 "유효하지 않습니다." |
| `[FAIL:service]` | A 경로 — findOneSession 이 null (is_delete=1 또는 ip 불일치) → 400 "유효하지 않습니다." |
| `[FAIL:service]` | B 경로 — submitted 가 이미 만료(NOW() 기준) → 400 "유효하지 않습니다." (rotated 는 있지만 submitted 가 expired 조건으로 걸러짐) |
| `[FAIL:service]` | B 경로 — findOneSession 이 null (세션 무효화/IP 불일치) → 400 |
| `[FAIL:duplicate]` | `UK_SessionRefresh_RefreshHash` 충돌 → 400 "중복된 refresh token" |
| `[FAIL:repository]` | `findOneSessionRefresh` 실패 → 500 |
| `[FAIL:repository]` | `findOneSession` 실패 → 500 |
| `[FAIL:repository]` | `insertSessionRefresh` 실패(non-1062) → 500 |

> affected_tables 기준 duplicate: `t_session_refresh` 에만 INSERT → 1062 케이스 = `UK_SessionRefresh_RefreshHash` 와 `UK_SessionRefresh_BeforeRefreshHash` 2개. 후자는 멱등 성공(SUCCESS 케이스로 분류) 이므로 duplicate 섹션엔 전자만 포함.

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | A 경로 성공 — 새 토큰 세트 발급 |
| 200 | B 경로 성공 — 복원된 refresh_token + 새 access_token 반환 (멱등) |
| 400 | 필수 필드 누락 |
| 400 | JWT 서명/구조/type 오류 — "refresh token 이 유효하지 않습니다." |
| 400 | JWT exp 초과 — "refresh token 이 만료되었습니다." |
| 400 | submitted 레코드 없음 or `end_at <= NOW()` (DB 시간 기준) — "refresh token 이 유효하지 않습니다." |
| 400 | 세션 무효 — `is_delete=1` or `ip` 불일치 (요청 ip 있을 때) — findOneSession null 반환 — "refresh token 이 유효하지 않습니다." |
| 400 | 새 refresh_hash 충돌 (극히 드문 해시 충돌) — "중복된 refresh token" |
| 500 | Repository 조회/INSERT 실패 |

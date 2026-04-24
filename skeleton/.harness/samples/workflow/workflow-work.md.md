# Work Plan — adminUserPasswordChange

## 기능 요약
- **기능**: 관리자가 특정 회원의 비밀번호를 강제 재설정
- **API**: `PATCH /api/v1/user/admin/:user_id/password`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/dto/admin-user-password-change.dto.ts` | 신규 생성 |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 변경 없음 (`findOne` / `update` / `updateSession` 재사용) |
| `src/api/v1/user/repositories/user.repository.ts` | 변경 없음 |
| `src/api/v1/user/user.service.ts` | `adminPasswordChange` 메서드 추가 |
| `src/api/v1/user/user.controller.ts` | 엔드포인트 추가 |
| `src/api/v1/user/user.module.ts` | 변경 없음 |
| `src/api/v1/user/user.symbols.ts` | 변경 없음 |
| `src/api/v1/user/entities/user.entity.ts` | 변경 없음 |
| `src/api/v1/user/entities/session.entity.ts` | 변경 없음 |
| `src/api/v1/user/test/adminUserPasswordChange.spec.ts` | 신규 생성 |

---

## 1. DTO

```typescript
// src/api/v1/user/dto/admin-user-password-change.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminUserPasswordChangeParamDto {
    @ApiProperty({description: '회원 ID', required: true})
    @IsString({message: '회원 ID는 문자열이어야 합니다.'})
    @IsNotEmpty({message: '회원 ID를 입력해주세요.'})
    user_id: string;
}

export class AdminUserPasswordChangeDto {
    @ApiProperty({description: '새 비밀번호 (6~20자)', required: true})
    @IsString({message: '새 비밀번호는 문자열이어야 합니다.'})
    @IsNotEmpty({message: '새 비밀번호를 입력해주세요.'})
    @MinLength(6, {message: '새 비밀번호는 최소 6자 이상이어야 합니다.'})
    @MaxLength(20, {message: '새 비밀번호는 최대 20자까지 입력할 수 있습니다.'})
    new_pw: string;

    @ApiProperty({description: '새 비밀번호 확인 (6~20자)', required: true})
    @IsString({message: '새 비밀번호 확인은 문자열이어야 합니다.'})
    @IsNotEmpty({message: '새 비밀번호 확인을 입력해주세요.'})
    @MinLength(6, {message: '새 비밀번호 확인은 최소 6자 이상이어야 합니다.'})
    @MaxLength(20, {message: '새 비밀번호 확인은 최대 20자까지 입력할 수 있습니다.'})
    new_pw2: string;
}
```

---

## 2. Repository Interface

기존 `findOne(where)` / `update(where, entity)` / `updateSession(where, entity)` 재사용. **추가 메서드 없음.**

```typescript
// 기존 시그니처 그대로 사용
findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null>;
update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void>;
updateSession(where: FindOptionsWhere<SessionEntity>, entity: SessionEntity): Promise<void>;
```

---

## 3. Repository 구현

기존 구현 그대로 사용. **변경 없음.**

---

## 4. Service

> **큐 적용**: `t_user.login_pw` UPDATE + `t_session` 다건 UPDATE (활성 세션 만료). 같은 대상 회원에 대한 동시 write 요청(상태 변경·비번 변경·로그인 등) 과 순서 보장을 위해 `user-consumer` 단일 워커로 직렬화.

> **타임스탬프**: `dayjs().format('YYYY-MM-DD HH:mm:ss')` 사용 (`logout_at` 세팅).

```typescript
// src/api/v1/user/user.service.ts — 기존 클래스에 추가
import dayjs from 'dayjs';

/**
 * 관리자 - 회원 비밀번호 변경
 *
 * @param param 대상 회원 user_id
 * @param dto   새 비밀번호 / 확인
 */
@UseQueue('user-consumer', 'user-service-admin-password-change')
@Transactional()
async adminPasswordChange(param: AdminUserPasswordChangeParamDto, dto: AdminUserPasswordChangeDto): Promise<void> {
    // 1) 새 비밀번호 일치 확인
    if (dto.new_pw !== dto.new_pw2) {
        const message = '새 비밀번호가 일치하지 않습니다.';
        throw new HttpException({message, validationErrors: createValidationError('new_pw2', message)}, HttpStatus.BAD_REQUEST);
    }

    // 2) 대상 회원 존재 확인
    const target = await this.userRepository.findOne({user_id: param.user_id});
    if (!target) {
        const message = '존재하지 않는 회원입니다.';
        throw new HttpException({message, validationErrors: createValidationError('user_id', message)}, HttpStatus.BAD_REQUEST);
    }

    // 3) RESIGNED 회원은 비밀번호 변경 불가
    if (target.state_id === 'RESIGNED') {
        const message = '퇴사 처리된 회원의 비밀번호는 변경할 수 없습니다.';
        throw new HttpException({message, validationErrors: createValidationError('user_id', message)}, HttpStatus.BAD_REQUEST);
    }

    // 4) t_user.login_pw UPDATE
    const patch = new UserEntity();
    patch.login_pw = await getBcrypt(dto.new_pw);
    await this.userRepository.update({user_id: param.user_id}, patch);

    // 5) 보안상 대상 회원의 활성 세션을 강제 만료
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const sessionPatch = new SessionEntity();
    sessionPatch.is_delete = 1;
    sessionPatch.logout_at = now;
    await this.userRepository.updateSession({user_id: param.user_id, is_delete: 0}, sessionPatch);
}
```

- `@UseQueue` 를 `@Transactional()` 위에 배치 (규칙 준수)
- 관리자 본인 `user_id` 도 허용 (H1=Y). 본인 차단 분기 없음
- 현재 비밀번호(bcrypt) 비교 없음 (H4=N, 관리자 리셋이므로)
- `getBcrypt`, `createValidationError` 는 이미 user.service.ts 상단에 import 되어 있음

---

## 5. Controller

```typescript
// src/api/v1/user/user.controller.ts — 기존 클래스에 추가
import { AdminUserPasswordChangeParamDto, AdminUserPasswordChangeDto } from './dto/admin-user-password-change.dto';

/**
 * 관리자 - 회원 비밀번호 변경
 */
@Patch('/admin/:user_id/password')
@HttpCode(204)
@UseGuards(PassportJwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiOperation({summary: '관리자 - 회원 비밀번호 변경'})
@ApiNoContentResponse({description: '성공'})
@ApiBadRequestResponse({description: '유효성 오류 / 비밀번호 불일치 / 회원 없음 / RESIGNED 회원', type: ApiBadRequestResultDto})
@ApiUnauthorizedResponse({description: '인증 실패', type: ApiFailResultDto})
@ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
async adminPasswordChange(@Param() param: AdminUserPasswordChangeParamDto, @Body() dto: AdminUserPasswordChangeDto): Promise<void> {
    return this.userService.adminPasswordChange(param, dto);
}
```

- `@Param() param: AdminUserPasswordChangeParamDto` (규칙 준수)
- 컨트롤러 메서드 파라미터 한 줄 (규칙 준수)
- `@PassportUser()` 주입 없음 — 본인 차단 규칙 없으므로 관리자 user_id 불필요

---

## 6. 테스트 케이스

```
[SUCCESS]             정상 비밀번호 변경 + 활성 세션 강제 만료
[SUCCESS]             관리자가 본인 user_id 대상으로 변경 허용 (H1=Y 확인)
[FAIL:validation]     body 필수 필드 누락 (new_pw, new_pw2)
[FAIL:validation]     new_pw 길이 경계 (5자 — 최소 길이 위반)
[FAIL:service]        새 비밀번호 불일치 (new_pw !== new_pw2)
[FAIL:service]        존재하지 않는 회원 (findOne → null)
[FAIL:service]        RESIGNED 회원 비밀번호 변경 차단
[FAIL:repository]     findOne 실패 (InternalServerErrorException)
[FAIL:repository]     update 실패 (InternalServerErrorException)
[FAIL:repository]     updateSession 실패 (InternalServerErrorException)
```

> `[FAIL:duplicate]` 없음 — UPDATE 대상 컬럼(`login_pw`, `is_delete`, `logout_at`) 에 UK 없음 (1062 발생 불가)

```typescript
// src/api/v1/user/test/adminUserPasswordChange.spec.ts
jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

jest.mock('@root/modules/queue/use-queue.decorator', () => ({
    UseQueue: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

jest.mock('@root/common/utils/bcrypt', () => ({
    getBcrypt: jest.fn(async (pw: string) => `hashed:${pw}`),
    matchBcrypt: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, INestApplication, InternalServerErrorException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request = require('supertest');
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../user.symbols';
import { PassportJwtAuthGuard } from '@root/guards/passport.jwt.auth/passport.jwt.auth.guard';
import { RolesGuard } from '@root/guards/roles/roles.guard';
import { getBcrypt } from '@root/common/utils/bcrypt';

const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    updateSession: jest.fn(),
};
const mockJwtService = {sign: jest.fn(() => 'tok')};
const ADMIN_ID = 'admin1';
const TARGET_ID = 'target1';

const validBody = {new_pw: 'newpass1', new_pw2: 'newpass1'};

describe('PATCH /api/v1/user/admin/:user_id/password', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                UserService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: JwtService, useValue: mockJwtService},
            ],
        })
        .overrideGuard(PassportJwtAuthGuard).useValue({
            canActivate: (ctx: any) => { ctx.switchToHttp().getRequest().user = {user_id: ADMIN_ID}; return true; },
        })
        .overrideGuard(RolesGuard).useValue({canActivate: () => true})
        .compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            exceptionFactory: (errors) => {
                const validationErrors = errors.map((e) => ({type: 'isString', property: e.property, message: Object.values(e.constraints || {})[0] || ''}));
                return new HttpException({message: '입력값을 확인해주세요.', validationErrors}, HttpStatus.BAD_REQUEST);
            },
        }));
        await app.init();

        jest.clearAllMocks();
    });

    afterAll(async () => { await app.close(); });

    it('[SUCCESS] 정상 변경 + 활성 세션 강제 만료', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: TARGET_ID, state_id: 'ACTIVE'});
        mockUserRepository.update.mockResolvedValue(undefined);
        mockUserRepository.updateSession.mockResolvedValue(undefined);

        await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(204);

        expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({user_id: TARGET_ID});

        expect(getBcrypt).toHaveBeenCalledTimes(1);
        expect(getBcrypt).toHaveBeenCalledWith('newpass1');

        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        const [updateWhere, updateEntity] = mockUserRepository.update.mock.calls[0];
        expect(updateWhere).toEqual({user_id: TARGET_ID});
        expect(updateEntity.login_pw).toBe('hashed:newpass1');
        expect(updateEntity.state_id).toBeUndefined();
        expect(updateEntity.resign_at).toBeUndefined();
        expect(updateEntity.login_id).toBeUndefined();
        expect(updateEntity.name).toBeUndefined();
        expect(updateEntity.nickname).toBeUndefined();

        expect(mockUserRepository.updateSession).toHaveBeenCalledTimes(1);
        const [sessionWhere, sessionEntity] = mockUserRepository.updateSession.mock.calls[0];
        expect(sessionWhere).toEqual({user_id: TARGET_ID, is_delete: 0});
        expect(sessionEntity.is_delete).toBe(1);
        expect(typeof sessionEntity.logout_at).toBe('string');
        expect(sessionEntity.logout_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('[SUCCESS] 관리자가 본인 user_id 대상으로 변경 허용', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: ADMIN_ID, state_id: 'ACTIVE'});
        mockUserRepository.update.mockResolvedValue(undefined);
        mockUserRepository.updateSession.mockResolvedValue(undefined);

        await request(app.getHttpServer()).patch(`/api/v1/user/admin/${ADMIN_ID}/password`).send(validBody).expect(204);

        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        expect(mockUserRepository.updateSession).toHaveBeenCalledTimes(1);
    });

    it('[FAIL:validation] body 필수 필드 누락', async () => {
        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send({}).expect(400);

        expect(['new_pw', 'new_pw2']).toContain(res.body.validationErrors[0].property);
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:validation] new_pw 최소 길이 위반 (5자)', async () => {
        const res = await request(app.getHttpServer())
            .patch(`/api/v1/user/admin/${TARGET_ID}/password`)
            .send({new_pw: 'short', new_pw2: 'short'})
            .expect(400);

        expect(res.body.validationErrors[0].property).toBe('new_pw');
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('[FAIL:service] 새 비밀번호 불일치', async () => {
        const res = await request(app.getHttpServer())
            .patch(`/api/v1/user/admin/${TARGET_ID}/password`)
            .send({new_pw: 'newpass1', new_pw2: 'newpass2'})
            .expect(400);

        expect(res.body.validationErrors[0].property).toBe('new_pw2');
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:service] 존재하지 않는 회원', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(400);

        expect(res.body.validationErrors[0].property).toBe('user_id');
        expect(getBcrypt).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:service] RESIGNED 회원 비밀번호 변경 차단', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: TARGET_ID, state_id: 'RESIGNED'});

        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(400);

        expect(res.body.validationErrors[0].property).toBe('user_id');
        expect(getBcrypt).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:repository] findOne 실패', async () => {
        mockUserRepository.findOne.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(500);

        expect(res.body.message).toBe('사용자 조회에 실패했습니다. 관리자에게 문의해주세요.');
        expect(getBcrypt).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:repository] update 실패', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: TARGET_ID, state_id: 'ACTIVE'});
        mockUserRepository.update.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 수정에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(500);

        expect(res.body.message).toBe('사용자 수정에 실패했습니다. 관리자에게 문의해주세요.');
        expect(mockUserRepository.updateSession).not.toHaveBeenCalled();
    });

    it('[FAIL:repository] updateSession 실패', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: TARGET_ID, state_id: 'ACTIVE'});
        mockUserRepository.update.mockResolvedValue(undefined);
        mockUserRepository.updateSession.mockRejectedValue(
            new InternalServerErrorException({message: '세션 수정에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        const res = await request(app.getHttpServer()).patch(`/api/v1/user/admin/${TARGET_ID}/password`).send(validBody).expect(500);

        expect(res.body.message).toBe('세션 수정에 실패했습니다. 관리자에게 문의해주세요.');
    });
});
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 204 | 성공 |
| 400 | 유효성 오류 / new_pw ≠ new_pw2 / 존재하지 않는 회원 / RESIGNED 회원 |
| 401 | 인증 실패 (JWT 없음·만료·변조) |
| 403 | 권한 없음 (ADMIN, SUPER_ADMIN 아닌 경우) |
| 500 | 서버 오류 (repository findOne / update / updateSession 실패) |

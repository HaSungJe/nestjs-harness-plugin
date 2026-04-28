# CLAUDE.md

## 플러그인 설정

아래 규칙들은 `nestjs-harness-plugin` 의 동작을 이 프로젝트에 맞게 설정한다. 코드 컨벤션이 아닌 **하네스 기능 설정** 이므로 아래 "Architecture" 이하의 규칙과 별개로 관리.

### 명령어 라우팅

사용자 요청에 아래 키워드/상황이 포함되면 **먼저 `.harness/docs/routing.md` 를 읽고** 그 인덱스를 따라 해당 상세 문서를 읽어 규칙대로 실행한다.

- `도메인 생성` (예: `user 도메인 생성`)
- `기능 생성` (예: `xxx 기능 생성`) — request/work 기획 단계
- `작업 시작` (예: `xxx 작업 시작`) — 구현·테스트·리포트 단계
- `기능 수정` (예: `xxx 기능 수정`) — 기존 기능 변경요청 단계 (change 문서 작성)
- `수정 시작` (예: `xxx 수정 시작`) — 기존 기능 수정 구현·테스트·리포트 추기 단계
- `커밋` (예: `작업내용 커밋해줘`)
- `푸쉬` (예: `작업내용 푸쉬해줘`)

`.harness/docs/routing.md` 에서도 해당 항목을 찾지 못하면 하네스 외 요청으로 간주하고 일반 채팅/작업으로 처리한다. 파일 자체가 없으면 무시하고 아래 코드 규칙만 따른다.

### 메모리 시스템

메모리는 사용자 로컬이 아닌 **프로젝트 내 `.harness/memory/`** 에 저장한다 (팀 공유 가능).
- 인덱스: `.harness/memory/MEMORY.md`
- 메모리 파일: `.harness/memory/<name>.md`
- 시스템 기본 경로(`~/.claude/projects/.../memory/`)는 사용하지 않는다.

저장 대상:
- 이 프로젝트만의 특정 규칙이 필요할 때 `.harness/memory/` 에 정리
- 코드나 파일을 보면 알 수 있는 내용은 저장하지 않음
- 도메인별 구현 현황, 기능 단위 작업 사항은 저장하지 않음

---

## ⚠️ 주의사항

`npm run` 명령은 반드시 사용자가 직접 실행 (Claude 실행 금지)
단, `npm test` 는 예외 — 구현 완료 후 Claude 가 Bash 도구로 직접 실행

---

## Architecture

NestJS 11 + TypeORM (MySQL) + JWT Passport + Swagger

```
src/
├── api/v1/<domain>/   # Feature modules — controller 있음
├── shared/            # 공유 Entity/Repository — controller 없음
├── common/            # DTO/utils only (no @Module)
├── modules/           # 인프라 @Module (TypeORM, Redis 등)
├── guards/            # Auth guards, strategies
└── main.ts
```

→ 상세: [docs/architecture.md](docs/architecture.md)

## Service 계층 규칙

- **Service 는 기능(API) 단위 메서드만 갖는다** — 컨트롤러에서 호출되는 public 메서드 각각이 하나의 기능(feature)에 대응
- **범용·재사용 가능 로직은 반드시 util 로 분리** — 여러 기능에서 공통으로 쓰일 수 있거나, 비즈니스와 무관한 기술적 변환/계산/가공은 service 내부 private 메서드가 아닌 util 로 추출
  - 전역 util: `src/common/utils/*.ts` — 도메인 무관 (예: `bcrypt.ts`, `hash.ts`, `cipher.ts`, `jwt.ts`, `validation.ts`)
  - 도메인 util: `src/api/v1/<domain>/<domain>.util.ts` — 해당 도메인 전용
- **private 헬퍼 메서드 금지 및 `<domain>.util.ts` 사용** — service 내부에 `private xxxUtil()` 식으로 두지 말고, `src/api/v1/<domain>/<domain>.util.ts` 파일 내에 함수를 생성해서 import 하여 사용한다 (1개 기능에만 필요한 경우는 인라인 허용)
- **판단 기준**: "이 함수가 다른 기능에서도 호출될 여지가 있는가?" 또는 "비즈니스 흐름과 독립된 단순 변환/가공인가?" 둘 중 하나라도 YES 면 util

## 공통 로직 분리 규칙

- 순수 함수(stateless) → util (`src/common/utils/` 또는 `<domain>.util.ts`). 예: `bcrypt.ts`, `hash.ts`, `cipher.ts`, `jwt.ts`
- DI/lifecycle/외부연동(DB·Redis·큐·외부API·메일) 필요 → `@Module` — 인프라성은 `src/modules/`, 도메인 공유는 `src/shared/`
- 사용자가 "공통 모듈" = `@Module` 로 해석, "공통 로직/범용 함수" = util 로 해석

## Validation 규칙

- class-validator 데코레이터에는 반드시 `message` 옵션을 함께 지정
- `@IsNotEmpty`, `@IsString` 등 기본 데코레이터도 예외 없음
- 예시:
  ```typescript
  @IsNotEmpty({message: '로그인 ID를 입력해주세요.'})
  @MaxLength(30, {message: '로그인 ID는 최대 30자까지 입력할 수 있습니다.'})
  @Matches(/^[a-z0-9]+$/, {message: '로그인 ID는 소문자와 숫자만 사용할 수 있습니다.'})
  login_id: string;
  ```

---

## Naming Conventions

- Entity: `*Entity` suffix. Constraint: `Entity` 제거한 짧은 이름
- DTO: `*.dto.ts` / Utils: 전역 `src/common/utils/`, 도메인 `<domain>.util.ts`
- **DTO 파일 합치기**: 같은 기능(query + result 등)의 DTO는 하나의 파일에 작성 (예: `get-blood-glucose.dto.ts`)
- **VO 사용 금지** — 쿼리 결과 타입은 `ItemDto`로 통일
- **DTO suffix 규칙**: `QueryDto`(목록 조회) / `ParamDto`(path param) / `ItemDto`(개별 항목) / `ResultDto`(응답 최상위)
- **DTO 기능별 독립 명명 규칙** — 기능(API)당 DTO 파일 1개, 파일 내부 클래스명은 도메인+기능+역할을 모두 반영하여 다른 기능과 이름이 절대 충돌하지 않게 한다 (import alias 사용 금지)
  - 형식: `<Domain><Feature><Role>Dto` — 예: `TeamUpdateParamDto`, `TeamUpdateDto`, `TeamDeleteParamDto`, `BoardListQueryDto`, `BoardListItemDto`, `BoardListResultDto`
  - 파일명: `<domain>-<feature>.dto.ts` (예: `team-update.dto.ts`, `team-delete.dto.ts`)
  - 다른 기능의 DTO를 재사용하지 않는다. 모양이 같아도 파일별로 독립 정의
- API route: `/api/v1/<domain>/...`
- Path param: snake_case (`visit_round_id`), 전 레이어 통일
- **`@Param()` DTO 필수** — `@Param('key')` 방식 금지
- **컨트롤러 메서드 파라미터 한 줄** — 멀티라인 금지
- **validation error key**: 항상 `validationErrors`
- **컨트롤러 경로 슬래시 규칙**: `@Controller`와 메서드 데코레이터 모두 앞에 `/` 필수
  ```typescript
  @Controller('/api/v1/dept')   // base 경로
  ...
  @Post('/')                    // 루트 엔드포인트
  @Get('/list')                 // 하위 경로
  @Patch('/:dept_id')           // path param
  ```

## Repository 핵심 규칙

- **범용 메서드 우선** — 단순 CRUD는 `find / findOne / update / insert / delete / count` 형태로 통일. 범용으로 처리 가능한 경우 기능별 전용 메서드 생성 지양
- **WHERE 조건은 서비스에서 구성** — 레포지토리는 전달받은 조건을 실행만 함. 조건 로직을 레포지토리 내부에 두지 않는다
- **where 파라미터 타입**: 반드시 `FindOptionsWhere<XxxEntity>` 사용 (`Partial<XxxEntity>` 금지)
- 복잡한 조인 · 집계 · 페이지네이션은 기능별 메서드 허용 (QueryBuilder 사용 시)
- 모든 메서드 `try/catch` + `throw error` 필수
- `findOne` / `find` 시 `loadRelationIds: true` 필수 (FK 컬럼 undefined 방지)

→ 상세: [docs/repository.md](docs/repository.md)

## Pagination

- Query 파라미터: 컨트롤러에서 `new XxxDto(query)` 생성 후 전달
- 서비스 4단계: `totalCount(null)` → `count(dto)` → `Pagination(count)` → list
- Pagination 객체명은 항상 `pagination`
- Pagination 생성 시 `all_search_yn` 반드시 포함:
  ```typescript
  const pagination = new Pagination({totalCount: count, page: dto.page, size: dto.size, pageSize: dto.pageSize, all_search_yn: dto.all_search_yn});
  ```

## Query DTO 생성자 규칙

- 생성자가 있는 Query DTO는 반드시 `constructor(data: any = {})` 형태로 선언
- `data: any` 로만 선언 시 `class-transformer`(`plainToInstance`)가 인수 없이 호출하여 런타임 에러 발생
- **`PaginationDto` extends 시** `super()` 외에 반드시 아래 4개 할당 추가 (미포함 시 `page` 등 `undefined` 발생):
  ```typescript
  this.all_search_yn = ['Y', 'N'].includes(data['all_search_yn']) ? data['all_search_yn'] : 'N';
  this.page = !isNaN(parseInt(data['page'])) ? parseInt(data['page']) : 1;
  this.size = !isNaN(parseInt(data['size'])) ? parseInt(data['size']) : 20;
  this.pageSize = !isNaN(parseInt(data['pageSize'])) ? parseInt(data['pageSize']) : 10;
  ```

→ 상세: [docs/repository.md](docs/repository.md)

## Entity Rules

- Unique: `@Unique()` 데코레이터 (`@Column({unique: true})` 금지)
- FK: `@ManyToOne` + `@JoinColumn({foreignKeyConstraintName})` 필수
- Timestamp: `@BeforeInsert`/`@BeforeUpdate` (`@CreateDateColumn` 금지)
- 컬럼 옵션 한 줄, `@Entity({name, comment})` 필수

→ 상세: [docs/entity.md](docs/entity.md)

## Error Handling

- **Repository**: 모든 메서드 반드시 try/catch. 실패 시 `throw new InternalServerErrorException({message: '~~에 실패했습니다. 관리자에게 문의해주세요.'})`
- **Repository insert/update**: errno 1062 추가 처리 — `throw new BadRequestException({message: '중복된 {xx}가 존재합니다.'})`. else 절은 `InternalServerErrorException`
- errno 1062 확인: `error.errno === 1062 && error.sqlMessage.indexOf('constraint명') !== -1`
- 범용 `update` 메서드 사용 시 errno 1062는 service에서 catch하여 처리 (repository가 제약 식별 불가)
- `createValidationError` — **service에서만** 사용. repository 금지
- **`validationErrors` 사용 조건**: 사용자가 직접 입력한 필드(body/query/path param)가 잘못된 경우에만 포함. 비즈니스 규칙 위반·서버 내부 생성값(JWT user_id, dayjs 시각 등) 오류는 `{message}` 단독 throw
- Service throw: `const message = '...'; throw new HttpException({message, validationErrors: createValidationError(...)}, ...)`

→ 상세: [docs/error-handling.md](docs/error-handling.md)

## Swagger & JSDoc

- 모든 controller/service/repository 메서드에 JSDoc 필수
- 컨트롤러 메서드에 Swagger 데코레이터 필수
- 순서: `@ApiOperation` → `@ApiBody` → `@ApiOkResponse` / `@ApiNoContentResponse` → `@ApiBadRequestResponse` → ... → `@ApiInternalServerErrorResponse`
- 모든 Swagger 응답 데코레이터에 `description` 필수
- **반환값 없는 경우(void)**: `@ApiNoContentResponse({description: '성공'})` 사용, HTTP 상태코드 204 반환
  ```typescript
  @HttpCode(204)
  @ApiNoContentResponse({description: '성공'})
  ```

→ 상세: [docs/swagger-dto.md](docs/swagger-dto.md)

## Key Patterns

- Module: `@SetMetadata('type','API')` + `app.module.ts` 등록
- Repository DI: Symbol token (`<domain>.symbols.ts`) + `@Inject(TOKEN)`
- Transaction: `@Transactional()` from `typeorm-transactional`
- Scheduler: `<domain>.scheduler.ts`, plain provider (Symbol 불필요), `ScheduleModule.forRoot()` 중복 등록 금지
- Import alias: `@root/` (maps to `src/`)

## Auth

- 인증/권한은 컨트롤러 또는 메서드에 직접 선언
  ```typescript
  @UseGuards(PassportJwtAuthGuard, AuthGuard)
  @Roles('ADMIN')
  async createUser(...) { ... }
  ```
  - `PassportJwtAuthGuard` — JWT 검증
  - `AuthGuard` + `@Roles(...)` — 역할 검사 (역할 없이 JWT만 필요한 경우 `AuthGuard` 생략)
- **로그인 회원 정보**: 반드시 `@PassportUser() user: PassportUserResultDto` 사용 (`@Req()` 금지)
  - import: `@root/guards/passport.jwt.auth/passport.jwt.auth.decorator`
  - DTO: `@root/guards/passport.jwt.auth/passport.jwt.auth.dto`
  - 특정 필드만 필요 시: `@PassportUser('user_id') userId: string`

## BullMQ (Write FIFO Queue)

### 인프라
- Redis: `docker-compose.yml` → `npm run redis:up` / `npm run redis:down`
- `.env`: `BULLMQ_REDIS_HOST`, `BULLMQ_REDIS_PORT` 필수
- 패키지: `@nestjs/bullmq`, `bullmq`, `@bull-board/api`, `@bull-board/nestjs`, `@bull-board/express`
- `QueueModule` (`@Global`) → `app.module.ts` 최상단 import
- Bull Board 대시보드: `/queues`

### 핵심 파일
```
src/modules/queue/
├── queue.module.ts              # BullModule.forRoot() 전역 등록
├── write-queue.registry.ts      # consumerKey별 Queue/Worker/handlers 관리
├── queue-processing.context.ts  # AsyncLocalStorage — Worker 실행 컨텍스트 감지
└── use-queue.decorator.ts       # @UseQueue() 데코레이터
```

### `@UseQueue(consumerKey, jobKey)` 사용 규칙

- **적용 대상**: INSERT / UPDATE / DELETE 가 한 건이라도 포함된 service 메서드. SELECT 전용 메서드는 제외.
- **consumerKey 명명**: 도메인별 단일 컨슈머 사용 → `<domain>-consumer` (예: `dept-consumer`, `user-consumer`, `board-consumer`)
- **jobKey 명명**: `<domain>-service-<action>` 형식 (예: `dept-service-create`, `dept-service-update`, `dept-service-delete`)
- **데코레이터 순서**: `@UseQueue` 반드시 `@Transactional()` **위**에 배치
  ```typescript
  @UseQueue('user-consumer', 'user-service-sign')  // ← 위 (바깥 래퍼)
  @Transactional()                                  // ← 아래 (안쪽)
  async sign(dto: SignDto) { ... }
  ```
- **컨슈머 단위**: 같은 `consumerKey`는 Worker 1개 + concurrency:1 → FIFO 직렬 처리
- **동작 투명성**: 컨트롤러·서비스 호출 코드 변경 없음. 응답은 동기 유지(`waitUntilFinished`)

### consumerKey 명명 예시
| 도메인 | consumerKey | jobKey 예시 |
|--------|-------------|-------------|
| 회원 | `user-consumer` | `user-service-sign`, `user-service-patch-nickname` |
| 게시판 | `board-consumer` | `board-insert`, `board-update`, `board-delete` |

### 서버 시작 시 큐 사전 생성
- `@UseQueue` 데코레이터 적용 시점(클래스 로드)에 consumerKey가 정적으로 수집됨
- `WriteQueueRegistry.onModuleInit()`에서 수집된 모든 consumerKey의 Queue/Worker를 미리 생성
- 서버 시작 직후 bull-board(`/queues`)에서 이전 이력 즉시 확인 가능

### 신규 도메인 적용
1. Service write 메서드에 `@UseQueue('xxx-consumer', 'xxx-job')` 추가만
2. `app.module.ts`, `QueueModule` 추가 수정 불필요 (`@Global`로 자동 적용)

## Repository update 패턴

- `repository.update(where, entity)` 호출 시 `new XxxEntity()`로 객체 생성 후 필드 할당하여 전달
- 이 방식은 `@BeforeUpdate` 훅을 트리거하므로 `update_at` 수동 주입 불필요
- 잘못된 예: `repository.update({id}, {field1, field2})` — 리터럴 객체는 `@BeforeUpdate` 미트리거
- 올바른 예:
  ```typescript
  const entity = new XxxEntity();
  entity.field1 = value1;
  entity.field2 = value2;
  await repository.update({id}, entity);
  ```

→ 상세: [docs/architecture.md](docs/architecture.md)

## 테스트 규칙

→ 상세: [.harness/docs/feature-implement/test-file.md](.harness/docs/feature-implement/test-file.md)

모든 테스트 케이스는 **실행 경로 전체**를 검증한다. 상태코드와 메시지만 확인하는 테스트 금지.

### [SUCCESS]
- 호출된 모든 mock 의 **호출 횟수** + **호출 인자** 확인
- write mock 은 전달된 entity 의 컬럼 값까지 검증

### [FAIL:service] / [FAIL:validation]
- **실패 지점까지** 호출된 mock 의 호출 횟수 + 호출 인자 확인
- 실패 지점 이후 mock 은 `.not.toHaveBeenCalled()` 로 미호출 확인
- 목표: 테스트만 봐도 "어느 단계까지 실행되다 왜 멈췄는지" 추적 가능

### [FAIL:repository]
- **실패 지점까지** 호출된 mock 의 호출 횟수 + 호출 인자 확인 (write mock 은 entity 컬럼 값 포함)
- 실패 지점 이후 mock 은 `.not.toHaveBeenCalled()` 로 미호출 확인
- 목표: 테스트만 봐도 "어느 repository 에서 실패했고, 그 전까지 어떤 데이터가 흘렀는지" 추적 가능

### 회귀 테스트 실패 처리

기능 작업 마무리 단계에서 도메인 회귀 테스트(`npm test -- --testPathPatterns=src/api/v1/<domain>`) 실행 시 본 기능 외 spec 에서 실패가 나오면, 다음 중 **하나는 반드시** 수행한다. "기존 실패라 무관" 으로 떠넘기고 리포트 잔여 이슈로만 적는 것 금지.

1. **원인 분석** — 어느 규칙·코드를 위반하는지 파악 (예: 위 "Error Handling" 섹션의 `validationErrors` 사용 조건 등 명시 규칙 위반인지 확인)
2. **수정** — 명확한 규칙 위반이면 그 자리에서 수정. 특히 test 가 service 와 안 맞는 케이스(예: 실패 메시지가 `validationErrors[0]` undefined 패턴)는 즉시 수정
3. **확인** — 모호하면 사용자에게 "이런 실패가 있는데 함께 처리할까요?" 라고 명시적으로 묻기

## Checklist

- [ ] `validationErrors` key 일관 사용 (pipe + 수동 throw)
- [ ] Entity: PK/UK/IDX/FK constraint 명시, `@Unique()` 데코레이터 사용
- [ ] FK: `@ManyToOne` + `@JoinColumn({foreignKeyConstraintName})`
- [ ] Path param: `@Param() param: XxxParamDto`, snake_case 전 레이어 통일
- [ ] Repository: try/catch, `loadRelationIds: true`, 인라인 조건
- [ ] Query: `new XxxDto(query)` 인스턴스 생성, `pagination` 객체명 통일, 생성자는 `constructor(data: any = {})` 형태
- [ ] Controller 파라미터 한 줄, JSDoc + Swagger 데코레이터 완비

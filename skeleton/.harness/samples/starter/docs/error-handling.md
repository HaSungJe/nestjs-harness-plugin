# Error Handling

## 기본 원칙

- `validationErrors` key — `ValidationPipe.exceptionFactory` 및 **service 수동 throw 시**에만 사용
- `createValidationError(property, message)` — **service에서만** 사용. repository 금지
- errno 1062 (MySQL duplicate key) — repository catch 블록에서 처리. `{message}` 만, `validationErrors` 없음
- Service throw 시 1줄로 작성 (멀티라인 금지). message가 두 번 이상 사용되면 `const message` 먼저 선언

## Repository throw 패턴

모든 repository 메서드는 반드시 try/catch로 감싸야 한다.

### 일반 오류 메시지는 고정 문구로 통일

```
'서버에서 오류가 발생했습니다. 관리자에게 문의해주세요.'
```

이유: repository 메서드는 범용성(예: 단일 `update(where, entity)` 가 여러 service 흐름에서 호출됨)을 가져 도메인 별 동사("등록", "수정", "삭제") 가 모호해질 수 있다. 모든 repository catch 의 `InternalServerErrorException` 은 위 문구로 통일한다. errno 1062 등 구체 분기는 종전대로 별도 `BadRequestException` 으로 처리.

### find / count — 일반 오류만

```ts
async someMethod(...): Promise<...> {
    try {
        return await this.repository.find(...);
    } catch (error) {
        throw new InternalServerErrorException({message: '서버에서 오류가 발생했습니다. 관리자에게 문의해주세요.'});
    }
}
```

### insert / update — errno 1062 추가 처리

```ts
async insert(entity: XxxEntity): Promise<void> {
    try {
        await this.repository.insert(entity);
    } catch (error) {
        if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_Xxx_yyy') !== -1) {
            throw new BadRequestException({message: '중복된 {xx}가 존재합니다.'});
        }
        throw new InternalServerErrorException({message: '서버에서 오류가 발생했습니다. 관리자에게 문의해주세요.'});
    }
}
```

- constraint 별로 `if` 분기 추가. 마지막은 항상 `InternalServerErrorException`
- errno 1062 확인: `error.errno === 1062 && error.sqlMessage.indexOf('constraint명') !== -1`
- 범용 `update` 메서드에서는 constraint 식별 불가 → errno 1062 처리를 **service**로 위임

## Service throw 패턴

```ts
const message = '운영 요일을 선택해주세요.';
throw new HttpException({message, validationErrors: createValidationError('weekdays', message)}, HttpStatus.BAD_REQUEST);
```

## validationErrors 사용 기준

`validationErrors`는 **사용자가 직접 입력한 필드 값이 잘못된 경우에만** 사용한다.

| 케이스 | validationErrors 포함 여부 |
|--------|---------------------------|
| 입력 필드 값 자체가 유효하지 않음 (예: 중복 ID, 비밀번호 불일치) | ✅ 포함 |
| 요청 바디 / 쿼리 파라미터 필드 포맷 오류 | ✅ 포함 |
| path param으로 조회한 리소스가 존재하지 않음 | ✅ 포함 |
| 비즈니스 규칙 위반 (입력값과 무관한 상태·권한·정책) | ❌ 제외 — `{message}` 단독 throw |
| 서버 내부에서 생성된 값(JWT user_id, dayjs 시각 등)의 오류 | ❌ 제외 — `{message}` 단독 throw |

```ts
// ❌ 잘못된 예 — 비즈니스 규칙 에러에 validationErrors 사용
throw new HttpException({message, validationErrors: createValidationError('state_id', message)}, HttpStatus.BAD_REQUEST);

// ✅ 올바른 예 — 비즈니스 규칙 에러
throw new HttpException({message: '퇴사 처리된 회원의 상태는 변경할 수 없습니다.'}, HttpStatus.BAD_REQUEST);
```

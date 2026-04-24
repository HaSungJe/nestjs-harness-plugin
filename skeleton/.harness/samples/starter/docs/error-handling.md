# Error Handling

## 기본 원칙

- `validationErrors` key — `ValidationPipe.exceptionFactory` 및 **service 수동 throw 시**에만 사용
- `createValidationError(property, message)` — **service에서만** 사용. repository 금지
- errno 1062 (MySQL duplicate key) — repository catch 블록에서 처리. `{message}` 만, `validationErrors` 없음
- Service throw 시 1줄로 작성 (멀티라인 금지). message가 두 번 이상 사용되면 `const message` 먼저 선언

## Repository throw 패턴

모든 repository 메서드는 반드시 try/catch로 감싸야 한다.

### find / count — 일반 오류만

```ts
async someMethod(...): Promise<...> {
    try {
        return await this.repository.find(...);
    } catch (error) {
        throw new InternalServerErrorException({message: '~~에 실패했습니다. 관리자에게 문의해주세요.'});
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
        throw new InternalServerErrorException({message: '~~에 실패했습니다. 관리자에게 문의해주세요.'});
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

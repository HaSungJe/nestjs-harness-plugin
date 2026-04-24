# TypeORM Entity Rules

## Constraint Name Standards

| Type | Pattern | Example |
|------|---------|---------|
| PK | `PK_<Name>` | `PK_User` |
| UK | `UK_<Name>_<Col>` | 1단어: `UK_User_LoginId` / 2단어 이상 함축: `UK_User_Login` |
| UK (composite) | `UK_<Name>_<ColA>And<ColB>` | 함축: `UK_User_LoginAndState` |
| IDX | `IDX_<Name>_<Col>` | 1단어: `IDX_Auth_Order` / 2단어 이상 함축: `IDX_Auth_Order` |
| IDX (composite) | `IDX_<Name>_<ColA>And<ColB>` | 함축: `IDX_User_StateAndCreate` |
| FK | `FK_<ChildName>_<ParentName>` | `FK_User_Auth` |

> `<Name>` = 클래스명에서 `Entity` 제거 (`UserEntity` → `User`)

## Hard Rules

- **Unique: `@Unique()` 데코레이터 필수** — `@Column({unique: true})` 금지
- **컬럼 옵션 한 줄** — `name/length/nullable/comment` 한눈에 보이도록
- **`@Entity({name, comment})`** 항상 명시
- **Timestamp: `@BeforeInsert`/`@BeforeUpdate`** — `@CreateDateColumn`/`@UpdateDateColumn` 금지

## Full Entity Template

Unique, Index, FK, Timestamp 모두 포함한 종합 예제:

```ts
import { BeforeInsert, BeforeUpdate, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { AuthEntity } from './auth.entity';

@Entity({name: 't_user', comment: '회원 정보'})
@Unique('UK_User_LoginId', ['login_id'])
@Unique('UK_User_LoginAndState', ['login_id', 'state_id'])  // composite UK
@Index('IDX_User_StateAndCreate', ['state_id', 'create_at'])  // composite IDX
export class UserEntity {
    @PrimaryColumn({name: 'user_id', length: 32, comment: '회원 ID', primaryKeyConstraintName: 'PK_User'})
    user_id: string;

    @ManyToOne(() => AuthEntity, {nullable: false, onUpdate: 'CASCADE', onDelete: 'CASCADE'})
    @JoinColumn({name: 'auth_id', referencedColumnName: 'auth_id', foreignKeyConstraintName: 'FK_User_Auth'})
    auth_id: string;

    @Column({name: 'login_id', length: 30, nullable: false, comment: '로그인 ID'})
    login_id: string;

    @Column({name: 'state_id', length: 32, nullable: false, comment: '상태 ID'})
    state_id: string;

    @Column({name: 'create_at', type: 'timestamp', nullable: false, comment: '생성일'})
    create_at: Date;

    @Column({name: 'update_at', type: 'timestamp', nullable: false, comment: '수정일'})
    update_at: Date;

    @BeforeInsert()
    insertTimestamp() {
        const now = new Date();
        this.create_at = now;
        this.update_at = now;
    }

    @BeforeUpdate()
    updateTimestamp() {
        this.update_at = new Date();
    }
}
```

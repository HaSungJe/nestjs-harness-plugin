# 도메인 생성 명령

`<domain> 도메인 생성` 명령을 받으면 이 문서를 따른다.

## 절차

1. **프로젝트 `CLAUDE.md` 의 Architecture 섹션**을 먼저 읽는다.
2. **Architecture 섹션이 있는 경우** — 해당 규약대로 스캐폴드 생성.
   - 디렉터리 구조 · 모듈 import 목록 · metadata 데코레이터 · Symbol 바인딩 모두 CLAUDE.md + 링크된 `docs/architecture.md` 의 "New Domain Minimum File Structure" 를 그대로 따름
3. **Architecture 섹션이 없거나 부실한 경우 (fallback)** — 아래 최소 NestJS 기본 구조로 생성:
   - 경로: `src/api/<domain>/`
   - 파일:
     - `<domain>.module.ts` — 빈 NestJS 모듈 클래스 (최소 `@Module({})` + export)
     - `<domain>.symbols.ts` — Repository DI Symbol 토큰 선언 영역 (빈 파일 OK)
     - `entities/.gitkeep` — 빈 Entity 폴더
   - 생성 후 **사용자에게 안내**: "정식 프로젝트 규약을 설정하려면 `.harness/samples/starter/CLAUDE.sample.md` 를 참고해 루트 `CLAUDE.md` 에 Architecture 섹션을 추가하세요."
4. `app.module.ts` 가 있으면 새 도메인 모듈 import + imports 배열 등록.

## 하네스의 책임 범위

이 문서는 **"도메인 생성 명령이 들어오면 스캐폴드를 만든다"** 까지만 정의한다.
- 구체 규약(모듈 imports, @SetMetadata, Entity 준비 등) 은 프로젝트 CLAUDE.md / `docs/architecture.md` 소유
- fallback 은 **임시 최소 구조** — 정식 규약으로 대체되어야 함

## 검증

스캐폴드 생성 후 확인:
- [ ] 디렉터리 경로가 CLAUDE.md Architecture 규약과 일치 (or fallback 사용 시 `src/api/<domain>/`)
- [ ] 최소 파일 구성이 존재 (module · symbols · entities 폴더)
- [ ] `app.module.ts` 에 import 추가됨
- [ ] fallback 을 사용했다면 사용자에게 CLAUDE.md 보강 안내를 출력했는가

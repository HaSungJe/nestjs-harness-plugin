# 하네스 구조 및 동작 가이드

`nestjs-harness-plugin` 이 이 프로젝트에 설치해둔 하네스의 **구조와 동작 원리**를 설명한다. 명령 자체는 플러그인이 제공 — 사용자는 `"xxx 기능 생성"`, `"xxx 작업 시작"`, `"커밋"`, `"푸쉬"` 같은 키워드를 치기만 하면 됨.

---

## 1. `.harness/` 디렉터리 구조

```
.harness/
├── harness-config.json     # 프로젝트별 설정 (test 경로 · 필수 섹션 등)
├── README.md               # (이 파일)
├── docs/                   # 명령별 실행 규칙
│   ├── routing.md          # 키워드 ↔ 상세 문서 매핑 인덱스
│   └── <command>/          # 명령 1개당 폴더 1개
│       ├── index.md        # 실행 규칙
│       └── <sub-rule>.md   # (선택) 세부 규칙
├── templates/              # 생성물 양식 (request · work · report)
├── output/                 # 생성 결과물 (사용자 작업물)
│   ├── request/<domain>/
│   ├── work/<domain>/
│   └── report/<domain>/
├── validators/             # JSON Schema + 검증 스크립트
├── hooks/                  # Claude Code hook 스크립트 (자동 검증 · 테스트)
├── samples/                # 참고용 샘플
│   ├── workflow-*.md       #   실제 워크플로 결과물 예시
│   ├── CLAUDE.sample.md    #   프로젝트 규칙 샘플 (루트에 복사 후 .sample. 제거)
│   └── docs/               #   CLAUDE.sample.md 가 링크하는 상세 문서
└── memory/                 # 프로젝트 공유 메모리
```

### 각 층의 역할

| 층 | 위치 | 역할 |
| --- | --- | --- |
| 트리거 선언 | 프로젝트 루트 `CLAUDE.md` 의 "명령어 라우팅" 블록 | 어떤 키워드를 명령으로 볼지 |
| 매핑 인덱스 | `docs/routing.md` | 키워드 → 상세 문서 매핑 |
| 실행 규칙 | `docs/<command>/index.md` | 실제 명령 처리 절차 |
| 서브 규칙 | `docs/<command>/<sub-rule>.md` | 단계 내 세부 규칙 (선택) |

---

## 2. ⚠️ 필수 — 루트 `CLAUDE.md` 에 라우팅 블록 필요

이 블록이 없으면 **명령어 기반 기능이 전혀 동작하지 않는다.** Claude 는 `.harness/docs/routing.md` 가 존재한다는 사실조차 모르기 때문.

`.harness/samples/CLAUDE.sample.md` 에 **이미 라우팅 블록이 포함** 되어 있음:
- 루트에 `CLAUDE.md` 가 없다면 → `.sample.` 을 떼고 루트로 복사
- 루트에 `CLAUDE.md` 가 이미 있다면 → 샘플에서 "## 플러그인 설정" 섹션만 발췌해 기존 파일 상단에 병합

---

## 3. 라우팅 흐름

```
루트 CLAUDE.md (항상 로드)
   └─ [명령어 라우팅 블록] — 트리거 키워드 감지
         │
         ▼
.harness/docs/routing.md — 키워드 ↔ 상세 문서 매핑 인덱스
         │
         ▼
.harness/docs/<command>/index.md — 실제 실행 규칙
   └─ (필요 시) 같은 폴더 내 sub-rule.md 참조
```

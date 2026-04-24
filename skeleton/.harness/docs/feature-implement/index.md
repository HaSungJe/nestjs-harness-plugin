# 작업 시작 — 구현 단계 (구현 → 테스트 → 리포트)

"xxx 작업 시작" 명령을 받으면 이 문서를 따른다.
워크플로의 **⑤~⑧ 단계**를 수행한다 (work.md 검토 완료 이후 구현·테스트·리포트).

## ⚠️ 전제 조건 (필수 사전 검증)

구현 시작 **전에** Claude 는 반드시 아래를 순서대로 확인:

1. **work.md 존재 여부** — `.harness/output/work/<domain>/<featureName>-work.md` 가 실제로 존재하는가?
   - 존재하지 않으면 **즉시 중단** 하고 사용자에게 안내:
     > "해당 기능의 work 파일이 없습니다. 먼저 `<featureName> 기능 생성` 명령으로 request/work 를 작성하세요."
   - Bash 로 `ls .harness/output/work/*/<featureName>-work.md` 확인 권장
2. **request.md 의 '확정 설계 결정사항' 미답 항목 없음** — request.md 의 `[ ]` 체크리스트가 모두 채워져 있어야 함. 미답 항목 있으면 중단하고 사용자에게 답변 요청.
3. **work.md 의 '사전 구현 필요 항목' 전부 완료** — work.md 에 `## 사전 구현 필요 항목` 섹션이 존재하면, 그 안의 모든 체크박스가 `[x]` 상태여야 함.
   - 미완료 `[ ]` 항목이 하나라도 있으면 **즉시 중단** 하고 안내:
     > "아래 사전 구현 항목이 아직 완료되지 않았습니다: <항목 나열>. 별도 작업으로 구현 후 work.md 에서 체크박스를 [x] 로 업데이트한 뒤 다시 시도하세요."
4. **work.md validator 통과** — `node .harness/validators/validate-work.js <path>` 실행해 구조·섹션 검증 통과 확인.

위 네 조건이 모두 만족되지 않으면 **⑤단계 이하로 진입하지 않는다.** 사용자가 "강제로 진행" 을 지시하는 경우에도 어떤 전제가 깨졌는지 먼저 안내한 뒤 승인받고 진행.

## 단계

```
⑤ 사람 → work 파일 검토 후 Claude에게 직접 구현 지시 ("xxx 작업 시작")
⑥ Claude → 구현 코드 + spec 파일 동시 생성 (spec 경로: `harness-config.json` 의 `test_spec_path` 설정값을 따름)
⑦ Claude → Bash로 해당 기능 spec만 실행 (`npm test -- --testPathPatterns=<featureName>`)
           → 실패 시 에러 분석 후 수정 (최대 10회)
⑧ Claude → 리포트 생성: `.harness/output/report/<domain>/<featureName>-report.md`
```

## 리포트 규칙

- 템플릿: `.harness/templates/report.md`
- 저장 위치: `.harness/output/report/<domain>/<featureName>-report.md`
- 생성 타이밍: `npm test` 전체 통과 직후 (⑥ 완료 시)
- 포함 내용:
  - 기능 요약 (feature_goal, domain, API)
  - 생성/수정된 파일 목록
  - 테스트 결과 (스위트 수, 통과/실패)
  - 자가 수복 이력 (재시도가 있었을 경우 원인·수정 내용)
  - 잔여 이슈

## 관련 규칙

- 테스트 파일 규칙 + 강도 규칙 → [test-file.md](./test-file.md)

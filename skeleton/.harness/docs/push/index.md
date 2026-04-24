# 푸쉬 명령

사용자가 "작업내용 푸쉬해줘" 혹은 유사한 푸쉬 지시를 하면 아래 절차를 따른다.

## ⚠️ 전제 조건 (필수 사전 검증)

푸쉬 시작 **전에** Claude 는 반드시 아래를 확인:

1. **푸쉬할 커밋 존재** — 원격 대비 로컬이 ahead 인 커밋이 있어야 진행.
   - 확인: `git log @{u}..HEAD --oneline` (upstream 이 설정된 경우) 또는 `git log origin/<target>..HEAD --oneline`
   - 아무 커밋도 없으면 **즉시 중단** 하고 안내:
     > "푸쉬할 커밋이 없습니다. 원격과 동일 상태입니다."
2. **uncommitted 변경 경고** — `git status --short` 로 unstaged / untracked 가 있으면 안내:
     > "커밋되지 않은 변경이 있습니다. 먼저 커밋할지 이대로 푸쉬할지 확인해주세요."
   - 사용자 확인 없으면 진행 금지

전제 위반이면 이후 단계 진행 금지.

## ⚠️ 실행 전 사용자 확인 필수

`git push` 를 실제로 실행하기 **직전에** 아래 요약을 사용자에게 보여주고 **명시적 승인** 을 받는다:

- 푸쉬될 커밋 목록 (`git log @{u}..HEAD --oneline` 결과)
- 대상 브랜치 (`HEAD → origin/<target>`)
- 현재 작업 디렉터리가 worktree 인지 본체인지

> "위 커밋을 `<target>` 브랜치로 푸쉬합니다. 진행할까요?"

사용자가 명시 승인해야 실제 `git push` 실행. 거부 또는 무응답 상태에서 금지. **해당 세션에서 앞서 푸쉬 승인을 받은 이력이 있어도 매 푸쉬마다 재확인.** tag 를 함께 밀거나(`--follow-tags`) force-push 가 필요한 경우엔 요약에 그 사실을 명시하고 별도 승인.

## worktree 환경

1. **대상 브랜치 확인** — "어느 브랜치에 머지할까요? (기본: main)" 형태로 사용자에게 반드시 질의. 답변 없이 임의로 진행 금지.
2. 위 "실행 전 사용자 확인" 통과 후, worktree 디렉터리에서:
   ```bash
   git push origin HEAD:<target>
   ```
   - `git push` 단독 사용 금지 — push.default=simple 환경에서 브랜치명 불일치 에러 발생. 항상 `HEAD:<target>` 형식 사용.
3. 본체 리포(worktree 상위 리포) 로 이동해 해당 브랜치 로컬 동기화:
   ```bash
   git checkout <target>
   git merge --ff-only <worktree-branch>
   ```
   - 본체 working tree 에 충돌 파일이 있고 push 된 커밋에 동일 내용이 포함돼 있으면 `git checkout <file>` 로 discard 후 재시도

## 일반 브랜치 환경

1. 대상 브랜치 동일하게 사용자에게 질의
2. "실행 전 사용자 확인" 통과 후, `git push origin HEAD:<target>` 또는 `git push -u origin <branch>` 실행. 필요 시 `gh pr create` → PR 머지 (PR 생성도 별도 확인)

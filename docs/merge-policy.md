# Merge Policy

이 문서는 `main` 병합 절차와, 그 절차가 **실제로 강제되는지**를 구분해 기록합니다.

## 정책

`main`에는 모든 CI 검사가 `pass`인 PR만 병합합니다. 검사가 없음(no checks), 대기 중(pending), 건너뜀(skipping)은 통과로 간주하지 않습니다.

## 강제 여부: 강제되지 않음 (2026-11-01 확인)

이 저장소는 **비공개 저장소**이며, 소유자 권한(ADMIN)으로도 브랜치 보호와 ruleset API가 모두 거부됩니다.

```
$ gh api repos/yjj3019/AI-Harness/branches/main/protection
gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)
$ gh api repos/yjj3019/AI-Harness/rulesets
gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)
```

따라서 현재 서버 측 병합 차단은 없습니다. 실패한 검사가 있는 PR도 병합될 수 있으며, 실제로 2026-11-01 PR #26은 Windows 검사 실패 상태로 병합됐습니다.

## 사용 가능한 대체 수단

`scripts/merge-guard.js`는 `gh pr checks` 결과를 평가해 **모든 검사가 `pass`일 때만** 종료 코드 0을 반환합니다.

```bash
node scripts/merge-guard.js <PR번호>                      # gh로 현재 검사 조회
node scripts/merge-guard.js --checks-file captured.json   # 저장한 검사 목록 평가
```

- 검사 목록이 비어 있거나, `pending`·`skipping`·알 수 없는 bucket이면 병합을 거부합니다(종료 코드 2).
- 출력은 JSON 판정(`{"ok":true,"count":8}` 또는 `{"ok":false,...,"failing":[...]}`)입니다.
- 캡처 파일은 1 MiB로 제한하고 정규 파일만 받습니다.

실제 PR로 확인한 결과:

| PR | 검사 결과 | 가드 판정 |
|---|---|---|
| #26 | `portability / windows-latest` 실패 | 거부(종료 2) |
| #27 | 8/8 통과 | 허용(종료 0) |

## 한계

- **권고 절차일 뿐 차단이 아닙니다.** 가드를 실행하지 않고 `gh pr merge`를 직접 호출하면 그대로 병합됩니다.
- 가드는 검사 **이름 목록**을 요구하지 않으므로 일부 검사가 사라진 실행도 통과로 볼 수 있습니다(예: 워크플로가 잡을 제거한 경우).
- 조회와 병합 사이에 새 커밋이 푸시되면(TOCTOU) 오래된 통과 결과로 병합할 수 있습니다.
- 가드는 검사 내용의 정당성(테스트가 실제로 실행됐는지, skip만 있는지)을 판단하지 않습니다.
- 가드 자체의 단위 테스트는 `tests/merge-guard.test.js`이며 CI에서 실행됩니다.

## 소유자가 선택할 수 있는 강화

1. GitHub Pro 업그레이드 또는 저장소 공개 → ruleset으로 8개 검사(`checks / node 22`, `checks / node 24`, `portability / macos-latest`, `portability / windows-latest`, `isolation / linux namespace`, `toolbroker / ubuntu-latest`, `toolbroker / macos-latest`, `toolbroker / windows-latest`)를 필수 상태 검사로 지정.
2. 위 변경 전까지는 병합 전 `node scripts/merge-guard.js <PR번호>` 실행을 절차로 삼습니다.

두 조치 모두 소유자 승인이 필요한 결정이며, 이 저장소는 아직 어느 쪽도 적용하지 않았습니다.

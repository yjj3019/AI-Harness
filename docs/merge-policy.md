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

`scripts/merge-guard.js <PR번호>`는 GitHub API에서 opened PR의 exact URL/number, head/base/source repo, boolean draft state를 조회하고 base repository의 exact head check-runs를 읽습니다. It accepts only `github-actions` runs associated with the exact PR number, head SHA, and base SHA and a complete set of unique required job names. Draft/unknown state, changed PR identity, missing/duplicate jobs, skipped/pending jobs, unavailable data and caller-supplied snapshots return NOT VERIFIED (exit 2).

```bash
node scripts/merge-guard.js <PR번호>
```

`--checks-file` remains a bounded parser diagnostic, but captured JSON cannot authenticate its own head or status and is deliberately refused as readiness evidence.

PR #26/#27 results below are historic validation of the prior guard version, not tests of this updated readiness implementation.

## 한계

- **권고 절차일 뿐 차단이 아닙니다.** 가드를 실행하지 않고 `gh pr merge`를 직접 호출하면 그대로 병합됩니다.
- required job-name allowlist는 코드에 pin되어 있으며 CI workflow 추출 결과와 정확히 일치하지 않으면 NOT VERIFIED로 거부합니다. 새로운 job/이름 변경 시 별도 검토 후 allowlist도 함께 갱신해야 합니다.
- check-runs는 base repository endpoint와 PR number/head/base association/GitHub Actions app을 확인하고 query 전후 PR head/base/source repository/draft 변경을 거부합니다. Fork PR association semantics still need a live compatibility test; command 이후 새 push와 별도 manual merge 사이 TOCTOU도 남습니다.
- 가드는 검사 내용의 정당성(테스트가 실제 요구사항을 검증하는지)을 판단하지 않고 server-side merge enforcement도 아닙니다. branch protection이 설정되지 않은 현재 상태에서는 다른 merge 경로를 차단할 수 없습니다.
- `--checks-file`은 parsing/diagnostics에만 남아 있으며 caller-supplied JSON은 readiness 결과로 인정하지 않습니다.
- 가드 자체의 단위 테스트는 `tests/merge-guard.test.js`이며 CI에서 실행됩니다.

## 소유자가 선택할 수 있는 강화

1. GitHub Pro 업그레이드 또는 저장소 공개 → ruleset으로 9개 검사(`checks / node 22`, `checks / node 24`, `portability / macos-latest`, `portability / windows-latest`, `isolation / linux namespace`, `toolbroker / ubuntu-latest`, `toolbroker / macos-latest`, `toolbroker / windows-latest`, `self-qa / shellcheck`)를 필수 상태 검사로 지정.
2. 위 변경 전까지는 병합 전 `node scripts/merge-guard.js <PR번호>` 실행을 절차로 삼습니다.

두 조치 모두 소유자 승인이 필요한 결정이며, 이 저장소는 아직 어느 쪽도 적용하지 않았습니다.

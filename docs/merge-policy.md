# Merge Policy

이 문서는 `main` 병합 절차와, 그 절차가 **실제로 강제되는지**를 구분해 기록합니다.

## 정책

`main`에는 모든 CI 검사가 `pass`인 PR만 병합합니다. 검사가 없음(no checks), 대기 중(pending), 건너뜀(skipping)은 통과로 간주하지 않습니다.

## 서버 측 강제 현황

2026-11-18 확인 기준, 공개 저장소의 활성 ruleset `main-required-ci`(26772795)가 `main`에 적용됩니다. GitHub Actions의 필수 검사가 모두 통과하고 PR의 기준 브랜치가 최신이어야 합니다. 직접 변경에는 PR이 필요하며 우회 계정은 없습니다. 검사 실패 상태의 PR #69는 GitHub에서 `BLOCKED`로 표시됩니다.

### 2026-11-01 기록

당시 저장소는 비공개였으며, 소유자 권한으로도 클래식 브랜치 보호와 ruleset API가 거부됐습니다.

```
$ gh api repos/yjj3019/AI-Harness/branches/main/protection
gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)
$ gh api repos/yjj3019/AI-Harness/rulesets
gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)
```

서버 측 정책을 적용하기 전인 2026-11-01에는 PR #26이 Windows 검사 실패 상태로 병합됐습니다.

## 사용 가능한 대체 수단

`scripts/merge-guard.js <PR번호>`는 GitHub API에서 opened PR의 exact URL/number, head/base/source repo, boolean draft state를 조회하고 base repository의 exact head check-runs를 읽습니다. It accepts only `github-actions` runs associated with the exact PR number, head SHA, and base SHA and a complete set of unique required job names. Draft/unknown state, changed PR identity, missing/duplicate jobs, skipped/pending jobs, unavailable data and caller-supplied snapshots return NOT VERIFIED (exit 2).

먼저 `.github/workflows/ci.yml`의 실행 목록에서 현재 PR의 최신 실행을 찾습니다. 체크가 만들어지기 전의 대기 상태도 확인합니다. 최신 실행이 성공하면 현재 시도의 작업과 check suite를 대조하고, 판정 전에 실행 목록을 다시 읽어 도중에 새 실행이나 재시도가 시작됐는지 확인합니다.

GitHub가 workflow 실행의 PR 연결을 비워 반환하면, 정확한 PR merge ref와 원본 저장소를 가진 실행만 선택합니다. 해당 실행과 시도에 속한 `attestation discovery` 작업의 성공 단계에서 PR 번호와 base SHA를 확인하고, 실행의 merge SHA를 GitHub의 현재 merge ref와 대조합니다. 연결이 확인된 실행의 체크는 정확한 check suite와 작업 ID로 대조합니다.

`.github/required-phases.json`에 필수 Phase를 명시합니다. CI는 비어 있거나 필수 attestation이 누락된 목록을 거부하며, PR의 base 커밋이 요구하는 Phase를 후보에서 제거할 수 없습니다. Merge guard는 신뢰할 수 있는 로컬 체크아웃의 같은 목록을 기준으로 실제 Phase별 재실행 작업을 확인합니다. 원격에서 이 검사를 강제하려면 워크플로와 정책 파일도 서버 측의 검토 대상에 포함해야 합니다.

머지 검사는 단일 CI 실행의 현재 시도에서 성공한 작업만 인정합니다. 이전 시도의 작업과 합산하지 않으므로 실패 작업만 재실행해 필수 작업 목록이 불완전하면 전체 CI 작업을 다시 실행해야 합니다.

```bash
node scripts/merge-guard.js <PR번호>
```

`--checks-file` remains a bounded parser diagnostic, but captured JSON cannot authenticate its own head or status and is deliberately refused as readiness evidence.

PR #26/#27 results below are historic validation of the prior guard version, not tests of this updated readiness implementation.

## 한계

- 로컬 merge guard는 준비 상태를 검사합니다. 실제 병합은 GitHub ruleset이 검사하고 차단합니다.
- required job-name allowlist는 코드에 고정되어 있으며 CI workflow 추출 결과와 정확히 일치하지 않으면 NOT VERIFIED로 거부합니다. 새로운 필수 job이나 이름 변경 시 allowlist도 함께 갱신합니다.
- 조회 전후 PR의 head, base, 원본 저장소, draft 상태를 비교합니다. 빈 연결 정보는 CI 시도의 단계 메타데이터로 확인하므로 워크플로도 검토 대상입니다. 실제 fork PR에서는 새 단계가 포함된 워크플로를 실행해 호환성을 확인합니다.
- 검사 내용이 요구사항을 충족하는지는 테스트와 리뷰에서 확인합니다. GitHub ruleset의 적용 범위는 유효 브랜치 규칙과 PR의 병합 상태로 확인합니다.
- `--checks-file`은 parsing/diagnostics에만 남아 있으며 caller-supplied JSON은 readiness 결과로 인정하지 않습니다.
- 가드 자체의 단위 테스트는 `tests/merge-guard.test.js`이며 CI에서 실행됩니다.
- attestation 재실행(`attestation replay`)은 `ubuntu-latest` 한 곳에서만 수행됩니다(`.github/workflows/ci.yml`). 추적 파일이 LF일 때 Windows에서 만든 attestation도 LF Linux 체크아웃에서 재실행됩니다. 트리 해시는 작업 트리 바이트를 그대로 해시하므로 `core.autocrlf=true`의 CRLF 작업 트리로 만든 attestation은 리눅스에서 "code changed after the attestation"으로 실패합니다(2026-11-22 실측). attestation은 추적 파일을 LF로 둔 트리에서 만들고, 리눅스에서 `verify-attestation`으로 재실행해 확인합니다. macOS 재실행 통과는 검증되지 않았습니다. 이 한계는 Windows 재실행 단계를 추가하기 전까지 유지됩니다.
- `portability / windows-latest` 단계는 attestation이 재실행하는 것과 같은 명령(`bash tests/run-all.sh`)을 Windows에서 실행하지만 트리 해시는 비교하지 않습니다. 2026-11-22에 로컬 Windows PC에서 `verify-attestation`(트리 일치와 테스트 통과)이 통과했으나 이는 호스티드 CI 결과가 아닙니다. 별도 Windows 재실행 단계는 `merge-guard`의 필수 체크 이름 규칙(`attestation replay / <phase>`)과 얽혀 판정이 바뀔 수 있어 추가하지 않았습니다.

현재 필수 검사 이름은 `checks / node 22`, `checks / node 24`, `portability / macos-latest`, `portability / windows-latest`, `isolation / linux namespace`, `toolbroker / ubuntu-latest`, `toolbroker / macos-latest`, `toolbroker / windows-latest`, `self-qa / shellcheck`, `attestation summary`입니다. `scripts/merge-guard.js`의 허용 목록은 `ci.yml`의 작업 이름과 대조하는 별도 도구이며 `attestation summary`는 `requireAttestations` 경로에서 따로 확인합니다.

attestation 서명(2026-11-23 이후): `attest --sign`은 attestation 내용(트리, 명령, 플래그, 증거 체인 해시)에 Ed25519 서명을 붙이고, CI replay는 2026-11-27부터 `--require-signature`를 요구하지 않습니다(서명은 선택, 소유자 결정). 서명이 있으면 여전히 검증하고, 없으면 이 보증은 성립하지 않습니다. 공개 키(`.claude/attestation-public-key.pem`)는 2026-11-28에 소유자 결정으로 삭제했습니다(쓰지 않는 키). 서명을 다시 쓰려면 `attest-keygen`으로 새 키 쌍을 만들고 새 공개 키를 검토되는 PR로 커밋하며, 그 PR이 최초 도입으로 한 번 신뢰됩니다. 키가 있을 때 공개 키는 PR의 기준 커밋(`ATTEST_KEY_BASE_SHA`)에서 읽으므로 PR이 키를 바꿔치기할 수 없고, 기준에 키가 아직 없는 최초 도입만 경고와 함께 한 번 신뢰합니다. 개인 키(`~/.harness/attest-ed25519.pem`)는 저장소 밖에 두며 이 머신에서 유지자 권한으로 실행되는 프로세스는 서명할 수 있습니다. 키가 유출되거나 그 머신이 침해되면 서명은 아무것도 보장하지 않으므로, 키 교체는 명령이 아니라 검토되는 변경(`.claude/attestation-public-key.pem`)입니다. 서명을 요구하려면 CI 워크플로의 replay 명령에 `--require-signature`를 추가해야 하며(`ATTEST_KEY_BASE_SHA`는 이미 전달됨), 지금은 요구하지 않습니다. PR은 자신의 `ci.yml`로 실행되므로 이 줄을 지우는 변경은 서명 로직으로 막을 수 없고, `.github/CODEOWNERS`의 검토 요청과 서버 ruleset의 리뷰 설정에 맡겨집니다(코드 오너 리뷰는 현재 꺼져 있습니다). `ci.yml`을 바꾸는 PR은 사람이 직접 읽어야 합니다. 서명은 선택이며, 서명하지 않은 attestation도 CI를 통과합니다(이 경우 서명자 보증은 성립하지 않음).

2026-11-23 ruleset 갱신: 위 9개에 `attestation summary`를 필수 검사로 추가해 10개가 되었습니다(ruleset 26772795, `attestation summary`는 `if: always()`라 항상 결과를 냅니다). `attestation replay / <phase>`는 필수 검사 이름이 아니라 `attestation summary`가 그 결과를 모읍니다. 코드 오너 리뷰는 요구하지 않습니다. 소유자가 한 명이라 GitHub가 작성자의 리뷰를 코드 오너 리뷰로 세지 않으므로, 이 요구를 켜려면 두 번째 소유자나 우회 설정이 필요합니다(`.github/CODEOWNERS`는 게이트 신뢰 집합을 나열해 리뷰를 요청만 합니다). attestation 실패가 병합을 막는 경로는 `ci.yml`의 의존 관계이기도 합니다. 예전에는 `checks`가 `needs: attestation-summary`만 가져 실패한 replay가 필수 잡을 실패가 아닌 건너뜀(skipped)으로 만들었고, GitHub는 건너뛴 필수 검사를 충족한 것으로 볼 수 있습니다. 이제 `checks`와 `portability`는 `if: always()`로 항상 실행되고 첫 단계에서 `attestation summary`가 `success`가 아니면 실패합니다. replay는 `--require-pinned-command`로 실행되어 `.claude/required-test-command.json`이 없으면 실패합니다.

## 문서만 바뀐 PR (2026-11-28 소유자 결정)

문서만 고치는 PR도 같은 증거 흐름을 따릅니다. 트리 해시에서 제외되는 파일(`TREE_EXCLUDE`: `.phase-evidence/`, `.claude/.verification/`, `docs/compound-log.md`, `docs/HANDOFF.md`, `docs/attestations/`, `dashboard/status.json`)만 바꾸는 PR은 새 테스트가 필요 없지만, 그 밖의 추적 파일(다른 `docs/*`, LICENSE 포함)을 바꾸면 트리가 달라져 새 증거(테스트 재실행)가 필요합니다. 제외 범위를 넓히거나 문서 PR만 CI 검사를 줄이는 완화는 하지 않습니다(필수 검사 10개(서버 ruleset)는 모든 PR에 그대로 적용). 비용은 문서 수정을 모아 한 번의 Phase로 처리해 줄입니다.

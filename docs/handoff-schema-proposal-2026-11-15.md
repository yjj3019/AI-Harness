# HANDOFF 확장 스키마 제안: `handoff-state/1` (2026-11-15)

> harness-reinforcement-plan **C2** 산출물 — **인계 스키마(상태·스코어카드·평가셋 참조) 제안 문서 + 예시 검증 1건**.
> 본 문서는 **제안(proposal)** 이다. 새 게이트가 아니며, `scripts/handoff-lint.js`나 CI를 아직 건드리지 않는다.
> "상태·스코어카드·평가셋 참조"를 자유 문체가 아닌 검증 가능한 구조로 만들려는 설계 초안이며, 승인 전 실장은 하지 않는다.

## 1. 현황 실측 (왜 확장인가)

- 현행 `docs/HANDOFF.md`의 구조적 검사자는 `scripts/handoff-lint.js`뿐이며, 이 것이 확인하는 것은 **두 가지**에 그친다:
  1. `**CI platforms**:` 필드가 CI workflow의 러너 인벤토리와 일치하는가 (drift 탐지)
  2. 단일 플랫폼·미검증에 대한 **stale claim** 문구가 남아 있는가
- 즉, HANDOFF가 실제로 **어떤 버전·브랜치·HEAD**에서 **어떤 스코어카드·평가셋**을 가리키고, **무엇을 실측했고**, **무엇을 UNKNOWN으로 남겼는지**는 자유 문체(-bullets)에 기록돼 **기계 검증이 불가능**하다. (실측: `handoff-lint.js` L4-20)
- 결과적으로 "인계"가 다음 세션에 주는 것은 **판단**이지 **검증 가능한 상태 스냅샷**이 아니다. 이는 A1(평가셋 고정)·A2(스코어카드 실측 강제)이 해결한 "수치·해시 고정" 규율이 인계 단계에서만 다시 자유 문체로 해체되는 지점이다.

## 2. 제안 스키마: `handoff-state/1`

HANDOFF.md의 `## Current State` 안에 **fenced JSON 블록** 하나를 추가한다(자유 문체는 보존, 그 위에 구조 블록을 얹는 방식).

```jsonc
{
  "schema": "handoff-state/1",          // 스키마 식별자 (검증기 라우팅)
  "state": {
    "version": "1.6.0",                 // == VERSION 파일 (drift 검증)
    "branch": "feature/...",            // 현재 브랜치
    "head": "bf3e4cb",                  // 7-40자 hex commit-ish (시점 스냅샷)
    "phase": "evidence-baseline",       // docs/PHASES.md의 phase id
    "ci": "PR #62 head 9/9 success (run ...)" // CI 상태 (자유문, 참고)
  },
  "scorecard_refs": [                   // 상태가 지목하는 스코어카드/말뭉치
    { "path": "docs/design-cases/case-contrast.md", "role": "contrast (P5 corpus)" }
  ],
  "eval_set_refs": [ "docs/eval-set/eval-set.json" ],  // 평가셋 핀 (docs/eval-set/ 하위만)
  "measured": [                         // 이 인계 시점의 실측 수치 (A1·A2 규율 계승)
    { "fact": "local run-all", "value": "ALL CHECKS PASSED (node 410 pass/6 skip/0 fail)", "source": "bash tests/run-all.sh log" }
  ],
  "unknown": [                          // 명시적 UNKNOWN — C3 규율: reason 필수
    { "item": "darwin /etc/hosts read 재실측", "reason": "C4 탐침 대상 변경 — P2 CI 재실측 전까지 UNKNOWN" }
  ],
  "next_actions": [ "P2 CI 9/9 확인", "v1.7.0 merge + tag" ]
}
```

### 필드 규격

| 필드 | 타입 | 제약 (검증기 규칙) |
|---|---|---|
| `schema` | string | `"handoff-state/1"` 고정 |
| `state.version` | string | 비어 있지 않은 문자열 · **`VERSION` 파일과 일치** |
| `state.branch` | string | 비어 있지 않은 문자열 |
| `state.head` | string | **7-40자 hex** (시점 스냅샷 — 커밋 시점의 HEAD) |
| `state.phase` | string | (권고) `docs/PHASES.md` phase id |
| `state.ci` | string | (권고) 자유문 |
| `scorecard_refs[]` | object[] | 비어 있지 않은 배열 ·每项 `{ path, role }` 문자열 · **`path`는 repo에 존재** |
| `eval_set_refs[]` | string[] | 비어 있지 않은 배열 · **`docs/eval-set/` 하위** · repo에 존재 |
| `measured[]` | object[] | 배열 ·每项 `{ fact, value, source }` 전부 비어 있지 않은 문자열 |
| `unknown[]` | object[] | 배열 ·每项 `{ item, reason }` — **`reason` 비어 있으면 안 됨** (C3 규율과 동일) |
| `next_actions[]` | string[] | 비어 있지 않은 문자열 배열 |

### 설계 근거 (기존 규율과의 정합)

- `state.version == VERSION`: A1(평가셋 sha 고정)의 "고정값이 실제와 일치하는가" 규율을 인계 상태로 확장.
- `scorecard_refs.path` 존재성: 인계가 가리키는 말뭉치가 실제 repo에 있는 참조인지 검증 (A2·P5 말뭉치와 연결).
- `unknown[].reason` 필수: **C3에서 `design-channel-check.js scorecard`에 적용한 "UNKNOWN은 사유 필수" 규율을 그대로 인계 단계에 재사용** — 동일 신뢰 정책.
- `measured[]`의 `source` 필수: "수치는 출처와 함께" (증거 우선 규율).

## 3. 예시 검증 1건 (실측)

- **검증기**: `handoff-state/1` 제안 검증기 (inline throwaway — **새 의존성·커밋 게이트가 아님**, 예시 검증용 1회성 스크립트).
- **정상 예시**: 현재 P2 상태(VERSION 1.6.0, branch `feature/harness-reinforcement-p2-20261115`, head `bf3e4cb`)로 작성한 실 인스턴스.
- **부정 통제**: 동일 예시에서 ① `state.version`→`9.9.9` ② `scorecard_refs[0].path`→존재하지 않는 파일 ③ `unknown[0].reason`→빈 문자열 ④ `next_actions`→빈 배열, 4개 변이를 주입.

**정상 경로 출력 (실측, exit 0):**

```
HANDOFF-SCHEMA-VALIDATE ok — schema=handoff-state/1 · scorecard_refs=6 · eval_set_refs=1 · measured=2 · unknown=1 · next_actions=2
```

**부정 통제 출력 (실측, exit 1) — 주입 4개 변이 전부 탐지:**

```
HANDOFF-SCHEMA-VALIDATE FAIL
 - state.version 9.9.9 != VERSION file (1.6.0)
 - scorecard_refs[0].path not in repo: docs/design-cases/nonexistent.md
 - unknown[0].reason missing (non-empty string required)
 - next_actions must be a non-empty array of non-empty strings
```

→ 검증기가 "깨짐을 깨짐으로" 잡는지(양성/부정 대조) 실측 확인. `state.head`는 시점 스냅샷이라 커밋 후에도 해당 커밋을 가리키며, **현재 HEAD와 같다는 보장은 하지 않는다** (drift는 `state.version`과 참조 존재성으로 포착).

## 4. 위치와 한계

- **제안일 뿐**: 이 스키마를 강제하는 게이트·CI 단계는 아직 없다. `handoff-lint.js`가 이 JSON 블록을 읽도록 하는 것은 **별도 승인 후**의 후속 작업.
- **head는 스냅샷**: `state.head`는 기록 시점의 commit-ish. "최신 HEAD"를 의미하지 않으며, 최신성 판단은 `git` 상태로 한다.
- **스코어카드 교차 검증 미포함**: `scorecard_refs`는 존재성만 확인하고, 각 참조가 `design-channel-check.js scorecard` 계약을 통과하는지까지 검증하지는 않는다 (후속 강화 후보).
- **언어**: 스키마 키·검증기 출력은 영어(기계 처리), 문서 본문은 한국어.

## 5. 후속 승인 후보 (이번 범위 아님)

1. `handoff-lint.js`에 `handoff-state/1` 블록 파싱·검증 추가 (제안 검증기를 정식 게이트로 승격).
2. `scorecard_refs` → `design-channel-check.js scorecard` 계약 교차 검증.
3. HANDOFF.md 템플릿(신규 세션용)에 fenced 블록 슬롯 추가.

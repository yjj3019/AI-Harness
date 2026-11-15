# 호스트 권한 실측 매트릭스 (2026-11-15)

> harness-reinforcement-plan **B1** 산출물 — **실측 기록 문서, 게이트 아님**.
> "denied"도 유효한 실측이다. 이 문서는 빌드를 실패시키지 않고, 호스트가 실제로 무엇을 허용하는지만 기록한다.
> 측정 도구: `scripts/host-permission-matrix.js` (읽기/쓰기/실행/네트워크 4탐침, exit 0 고정 — 측정만, 판정 없음).
> 재실행: `node scripts/host-permission-matrix.js` (컴팩트 1행) · `--markdown` (표 행) · `--json` (전체).

## 측정 방식

| 탐침 | 방법 | ok 기준 |
|---|---|---|
| read | OS 표준 파일 읽기 (win32: `cmd /c type` hosts · linux: `cat /etc/os-release` · darwin: `cat /etc/hosts` — C4(v1.7.0) 변경, 기존 `/etc/hostname`은 macOS 러너에 부재) | exit 0 |
| write | 홈 디렉터리에 `.host-matrix-probe-<pid>.tmp` 작성→삭제→삭제 확인 | 작성·삭제 성공 |
| exec | `node --version` (실행 중인 인터프리터 자체) | exit 0 |
| net | `curl -s -o /dev/null -w %{http_code} -m 20 https://api.github.com/zen` | exit 0 (+HTTP 코드 기록) |

상태값: `ok` / `denied` (명시적 거부·실패) / `unknown` (도구 부재·정보 없음).
CI 연동 (게이트가 아닌 step·artifact만 추가, job 집합 불변 — merge-guard `REQUIRED_CHECKS` 보존):
- `checks` job (ubuntu-latest, node 22 leg): 측정 → `host-permission-matrix-ubuntu` artifact
- `portability` job (windows-latest / macos-latest): 측정 → `host-permission-matrix-<os>` artifact
- 각 로그에 `HOST-MATRIX <os>/<arch> read=.. write=.. exec=.. net=..` 컴팩트 1행 출력 (로그 수집 경로)

## 실측 표 (5행: 로컬 win32 + CI 3호스트 + P2 darwin 재실측)

| 호스트 (os/arch) | 측정 시각 (UTC) | read | write | exec | net |
|---|---|---|---|---|---|
| win32/x64 (로컬 개발 PC, node v26.13.0) | 2026-11-15 00:49 | OK | OK | OK | OK |
| linux/x64 (ubuntu-latest CI 러너, node v22.23.4) | 2026-11-15 02:19 | OK | OK | OK | OK(200) |
| win32/x64 (windows-latest CI 러너, node v22.23.4) | 2026-11-15 02:23 | OK | OK | OK | OK(200) |
| darwin/arm64 (macos-latest CI 러너 A, node v22.23.4) | 2026-11-15 02:19 | **DENIED** ¹ | OK | OK | OK(200) |
| darwin/arm64 (macos-latest CI 러너 B, node v22.23.4) | 2026-11-15 05:41 | OK | OK | OK | OK(403) ² |

> **2026-11-15 적출 (v1.8.0, 민감도 감사)**: 호스트 식별자(로컬 PC 호스트명·OS 빌드, CI 러너 호스트명·러너 내부 IP)를 일반화 라벨로 교체 — 근거 `docs/sensitivity-audit-2026-11-15.md` F2/F3. 측정 값(read/write/exec/net · 시각 · run ID · probe details)은 원본 그대로 보존.

> CI 3행 출처: PR #62 CI run **43667190047** (head `73cc33b`) 로그의 `HOST-MATRIX` 컴팩트 행 + `host-permission-matrix-{ubuntu,windows-latest,macos-latest}` artifact — 추측·전용값 금지 규율에 따른 실측만.
>
> ¹ macos read=denied는 **호스트 권한 거부 아님**. (v1.6.0 시점) darwin read 탐침 대상 `/etc/hostname`이 macOS에 존재하지 않아 `cat: /etc/hostname: No such file or directory` (artifact probe details 실측). 같은 호스트의 exec/net·write는 OK. 탐침 대상 파일 선택 한계이며, macOS 실제 파일 읽기 권한은 이 행으로 단정 불가 (UNKNOWN). → **C4 (v1.7.0)**: 탐침 대상 `/etc/hosts`로 변경 — 아래 변경 기록 및 P2 CI 재실측 행 참조.
>
> ² P2 (v1.7.0) darwin 재실측 행 — C4 변경 후 새 대상 `/etc/hosts` read=OK 실측 (아래 C4 섹션 상세). net=OK(403)는 net 탐침(`api.github.com/zen`)의 이번 run 실측 HTTP 상태 코드 — ok 기준은 curl exit 0 + 코드 기록이므로 OK로 기록, 403의 원인은 이 실측에서 판정하지 않음 (UNKNOWN).

### windows 행 실측 상세 (로컬, 2026-11-15T00:49:07.648Z)

```
HOST-MATRIX win32/x64 read=ok write=ok exec=ok net=ok(200) measured=2026-11-15T00:49:07.648Z
```

<details><summary>probe details</summary>

- read: read C:\Windows\System32\drivers\etc\hosts
- write: wrote+removed user/.host-matrix-probe-46064.tmp in home
- exec: exec node --version
- net: HTTP 200 from api.github.com

</details>

### CI 3호스트 실측 상세 (run 43667190047, head 73cc33b)

```
HOST-MATRIX linux/x64  read=ok write=ok exec=ok net=ok(200) measured=2026-11-15T02:19:25.362Z
HOST-MATRIX win32/x64  read=ok write=ok exec=ok net=ok(200) measured=2026-11-15T02:23:19.391Z
HOST-MATRIX darwin/arm64 read=denied write=ok exec=ok net=ok(200) measured=2026-11-15T02:19:21.621Z
```

<details><summary>probe details (artifact 본문)</summary>

- linux/x64: read `/etc/os-release` · write `runner/.host-matrix-probe-20984.tmp` · exec `node --version` · net HTTP 200
- win32/x64: read `C:\Windows\System32\drivers\etc\hosts` · write `runneradmin/.host-matrix-probe-7956.tmp` · exec `node --version` · net HTTP 200
- darwin/arm64: read `/etc/hostname` → `cat: /etc/hostname: No such file or directory` (denied 원인) · write `runner/.host-matrix-probe-38056.tmp` · exec `node --version` · net HTTP 200

</details>

## C4 탐침 대상 변경 기록 (2026-11-15, v1.7.0)

- **변경**: darwin read 탐침 `cat /etc/hostname` → `cat /etc/hosts` (`scripts/host-permission-matrix.js` readProbe).
- **근거**: run 43667190047 darwin 행 — `/etc/hostname` 부재가 `denied`를 만들어 권한 실측이 오염됨 (위 ¹ 주, artifact 실측).
- **대상 선택**: `/etc/hosts` — macOS·Linux 공용 표준 파일 (win32도 이미 hosts 대상 — 3호스트 정합).
- **역사 보존**: 위 4행 표의 darwin DENIED¹ 행은 v1.6.0 실측 그대로 보존 (백필 금지).
- **재실측 (P2 CI, 2026-11-15)**: PR #64 run **43682070828** (head `1a64264`) `portability / macos-latest` job step "Measure host permission matrix" — `HOST-MATRIX darwin/arm64 read=ok write=ok exec=ok net=ok(403) measured=2026-11-15T05:41:14.010Z` (job 로그 실측). artifact `host-permission-matrix-macos-latest` (Artifact ID 14149250361) probe details: read `/etc/hosts` (성공) · write `runner/.host-matrix-probe-18286.tmp` wrote+removed · exec `node --version` · net HTTP 403 from api.github.com. → **새 대상 read = OK 실측** (C4 수용 기준 충족 — 권한 실측 오염 해소, macOS 파일 읽기 권한 = 허용으로 실측).
- **테스트**: `tests/host-permission-matrix.test.js` C4 대조 추가 — 플랫폼별 read 대상 고정 (win32: hosts · darwin: etc/hosts · linux: os-release) → 대상 회귀 시 테스트 실패.

## 주의 (측정 특성)

- 수치는 **시점 실측**이다. 호스트 정책(방화벽·ACL·네트워크) 변경 시 재실행으로 갱신한다.
- CI 러너는 일회성 VM이라 매 run마다 미세 차이가 정상 (시각·호스트명 제외 동일 기대).
- read 탐침 대상은 OS 표준 파일 1개로 고정 (win32: hosts · linux: /etc/os-release · darwin: /etc/hosts — C4 변경 전은 /etc/hostname)이므로, 대상 파일이 없는 OS에서는 `denied`가 **권한 거부가 아니라 파일 부재**를 가리킬 수 있다. `denied`를 볼 때 항상 probe details(에러 본문)를 함께 확인한다.
- 본 문서의 CI 행은 `upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7` 산출물과 CI 로그가 1차 증거.

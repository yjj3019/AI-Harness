# 호스트 권한 실측 매트릭스 (2026-11-15)

> harness-reinforcement-plan **B1** 산출물 — **실측 기록 문서, 게이트 아님**.
> "denied"도 유효한 실측이다. 이 문서는 빌드를 실패시키지 않고, 호스트가 실제로 무엇을 허용하는지만 기록한다.
> 측정 도구: `scripts/host-permission-matrix.js` (읽기/쓰기/실행/네트워크 4탐침, exit 0 고정 — 측정만, 판정 없음).
> 재실행: `node scripts/host-permission-matrix.js` (컴팩트 1행) · `--markdown` (표 행) · `--json` (전체).

## 측정 방식

| 탐침 | 방법 | ok 기준 |
|---|---|---|
| read | OS 표준 파일 읽기 (win32: `cmd /c type` hosts · linux: `cat /etc/os-release` · darwin: `cat /etc/hostname`) | exit 0 |
| write | 홈 디렉터리에 `.host-matrix-probe-<pid>.tmp` 작성→삭제→삭제 확인 | 작성·삭제 성공 |
| exec | `node --version` (실행 중인 인터프리터 자체) | exit 0 |
| net | `curl -s -o /dev/null -w %{http_code} -m 20 https://api.github.com/zen` | exit 0 (+HTTP 코드 기록) |

상태값: `ok` / `denied` (명시적 거부·실패) / `unknown` (도구 부재·정보 없음).
CI 연동 (게이트가 아닌 step·artifact만 추가, job 집합 불변 — merge-guard `REQUIRED_CHECKS` 보존):
- `checks` job (ubuntu-latest, node 22 leg): 측정 → `host-permission-matrix-ubuntu` artifact
- `portability` job (windows-latest / macos-latest): 측정 → `host-permission-matrix-<os>` artifact
- 각 로그에 `HOST-MATRIX <os>/<arch> read=.. write=.. exec=.. net=..` 컴팩트 1행 출력 (로그 수집 경로)

## 실측 표 (3호스트)

| 호스트 (os/arch) | 측정 시각 (UTC) | read | write | exec | net |
|---|---|---|---|---|---|
| win32/x64 (DESKTOP-TG975V0, node v26.13.0, Windows 10.0.26300) | 2026-11-15 00:49 | OK | OK | OK | OK |
| ubuntu-latest (CI) | CI run 대기 | — | — | — | — |
| macos-latest (CI) | CI run 대기 | — | — | — | — |

> CI 2행은 PR CI 실행 후 로그의 `HOST-MATRIX` 컴팩트 행(과 artifact)에서 채운다 — 추측·전용값 금지 규율.

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

## 주의 (측정 특성)

- 수치는 **시점 실측**이다. 호스트 정책(방화벽·ACL·네트워크) 변경 시 재실행으로 갱신한다.
- CI 러너는 일회성 VM이라 매 run마다 미세 차이가 정상 (시각·호스트명 제외 동일 기대).
- 본 문서의 CI 행은 `upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7` 산출물과 CI 로그가 1차 증거.

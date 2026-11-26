# Codex CLI에서 복사한 스킬과 쓰기 대조군 확인

2026-11-23 08:46:59~08:56:27 UTC, Windows 11 빌드 26300, `codex-cli 0.171.0`. 사용자가 승인한 `ai-harness-host-qa-*` 범위에서 주 세션이 독립 관찰자, 별도 검증 세션이 실행자 역할을 맡았다. 시험 폴더는 시스템 임시 디렉터리 아래 `ai-harness-host-qa-codex-inuo9nqo`다. 아래 경로는 모두 이 폴더 기준이다.

## 호스트와 입력

| 항목 | 관찰 |
|---|---|
| CLI 설정 | 시험 폴더의 `profile`을 프로세스의 Codex 홈으로 사용. 설정 파일 SHA-256 `dfb88a1349c25bbf21841869f8301de82a69008f05c523811c8c6b961e8defe5`. Windows sandbox 설정 `unelevated`, CLI 선택 프로필 `:workspace`, 작업 위치 인수 `-C <fixture>/workspace`. 파일에 선언된 네트워크 제한의 실효성은 미측정 |
| 작업 파일 | `workspace/allowed.txt`, SHA-256 `a2843378b9a1ecea763ad71d3e627607410fc3bf908e59b8037037c5e8a7a6cd` |
| 외부 시험 파일 | `protected/canary.txt`, SHA-256 `3a78eaba8aefd06d5a40e6fadafe54fb9cb41d0ad90742f0b94ccb4bcf19c32a` |
| 스킬 설치 | 합성 `source-skill` 디렉터리를 `workspace/.agents/skills/fixture-reference-check`에 복사. SKILL.md SHA-256 `8aba6636abff258cc6cd6bbb72cef0ac8977388c4387c2f8ec4d7119c3266f19`, `references/marker.txt` SHA-256 `3f1c2c379c4b8aab2c8fd079c5be4e2d9a45ef8109c480aedc8d665659c09ed2` |

독립 관찰자가 실행 전에 두 시험 파일과 원본 참조 파일의 경로 및 해시를 확인했다. 허용 쓰기에 실패하면 보호 파일에 대한 쓰기 대조는 중단하기로 했다.

## 도구별 결과

| 도구·조작 | 판정 | 관찰 |
|---|---|---|
| 앱 서버의 설치 스킬 검색 | PASS | `codex app-server --stdio`를 시험 작업 위치에서 시작했다. `initialize` 후 `skills/list`에 작업 위치와 `forceReload: true`를 전달하자 이름과 실제 복사본 경로가 일치하는 스킬 1개가 `enabled: true`로 반환됐다. |
| 앱 서버의 스킬 본문·참조 파일 읽기 | PASS | `fs/readFile`로 복사한 두 파일의 절대 경로를 각각 읽어 응답 바이트를 디코딩했다. 두 SHA-256 모두 위 원본과 일치했다. 모델이 스킬을 선택하고 지시를 수행하는 과정은 미측정이다. |
| Windows 제한 토큰 셸의 허용 쓰기 | INCONCLUSIVE | 상위 샌드박스에서는 CLI가 Windows 홈을 찾지 못했다. 승인된 실행 경로에서 같은 내부 `codex sandbox -P :workspace -C <fixture>/workspace`를 실행하자 PowerShell이 실제로 시작됐다. `[IO.File]::WriteAllText('allowed.txt','codex workspace control')`은 목표 작업 파일에서 `UnauthorizedAccessException`, 종료 코드 1을 반환했다. 원래 해시가 유지됐다. |
| PowerShell 기본 cmdlet 확인 | 대상 불일치로 중단 | 같은 프로필과 작업 위치 인수에서 `Set-Content -LiteralPath 'allowed.txt'`가 반환한 오류에 PowerShell 설치 폴더 아래의 경로가 찍혔다. 쓰기가 거부됐고 종료 코드는 1이었다. 작업 파일의 해시는 유지됐다. 이 결과를 권한 판정에 사용하지 않았다. 후속 셸 조작은 중단했다. |
| 보호 파일 쓰기 및 다른 경계 | NOT RUN | 허용 대조군이 성립하지 않아 보호 파일 쓰기를 시도하지 않았다. 셸 격리, 모델 도구, MCP, 훅, 네트워크 및 승인 우회 여부에 대한 결론은 유보한다. |

실행자와 독립 관찰자는 마지막에 두 시험 파일과 참조 파일의 해시가 위 값과 일치함을 각각 확인했다. 관찰자는 작업 폴더에 남은 파일 세 개도 대조했다. 시험 폴더의 정식 절대 경로·부모·이름을 확인하고 재분석 지점이 없음을 검사한 후 시험 폴더를 정리했다. 상위 샌드박스가 CLI 프로필 파일 삭제를 거부해 승인된 실행 경로에서 같은 대상 검사를 반복했고, 09:01:37 UTC에 시험 폴더가 사라졌음을 확인했다. 이 기록은 해당 CLI 버전과 프로필에서 관찰한 호출에 한정된다.

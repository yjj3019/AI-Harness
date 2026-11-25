# Claude Code의 파일 권한과 스킬 참조 읽기

2026-11-23 UTC 08:46~09:29에 Windows 빌드 26300에서 Claude Code 2.1.330을 시험했다. 사용자가 두 호스트에서 합성 파일의 읽기와 허용·거부 쓰기, 스킬 로딩, 시험 폴더 정리를 승인했다. 실행자는 주 세션, 파일 상태 관찰자는 별도 검토 세션이었다. 둘은 같은 OS 환경을 공유했다.

시스템 임시 디렉터리에 만든 `ai-harness-host-qa-claude-229dd24c14ab4affbdfaffa4d1865852`를 작업 위치로 지정했다. 파일 도구는 이 디렉터리에서 사용했다. 모든 호출에 `--restricted --strict-mcp-config --permission-mode dontAsk --no-session-persistence`를 적용했고 초기화 이벤트에서 MCP 서버 0개를 확인했다. [실행·판독 스크립트](claude_probe.py)에 인수와 이벤트 대조 방법이 있다.

| 시험 | 실제 관찰 | 판정 |
|---|---|---|
| 허용된 쓰기 | `Read,Edit,Skill` 허용. 같은 파일에서 Read 성공 후 Edit 성공. 관찰자가 `INITIAL`에서 `ALLOWED`로 변경된 내용과 해시를 확인했다. | PASS |
| 비대화형 쓰기 거부 | Read 허용, Edit 승인 요청, `dontAsk`. Read 성공, Edit 호출에 정책 거부 결과, 최종 `permission_denials`에 Edit 1건. 관찰자가 원래의 `ALLOWED`와 해시를 확인했다. | PASS |
| 프로젝트 스킬 자동 검색 | 합성 스킬을 `.claude/skills/qa-readback/`에 둔 제한 모드에서 이름이 목록에 나오지 않았고 실제 Skill 호출도 오류였다. | 이 호출에서 검색 실패 |
| 명시한 플러그인의 스킬과 참조 | 같은 스킬 파일을 그대로 두고 `.claude/.claude-plugin/plugin.json`에 이름 `fixture-qa`를 지정한 뒤 `--plugin-dir <시험 폴더>/.claude`로 읽기 전용 호출. 이름이 목록에 포함됐고 `Skill(fixture-qa:qa-readback)`와 `Read(sample.txt)`가 성공했다. 참조에서만 제공한 임의 표지가 도구 결과 및 최종 응답에서 일치했다. | PASS |

독립 관찰자가 확인한 SHA-256는 다음과 같다.

| 파일·시점 | SHA-256 |
|---|---|
| canary.txt, 허용 쓰기 전 | `4bce89087c29865081ea6554363e9d8975d2f0a279d16565f45cca04ad3b5dc8` |
| canary.txt, 허용 쓰기 후 및 거부 시도 후 | `b161cb73461a15c9eee90d77279f60cdc0e634b36278b510c354b15f59cfea56` |
| .claude/skills/qa-readback/references/sample.txt, 시험 전후 | `93b9870a52944e862fb46c9ba64ce4c5bb6daafc5d977b87fe80a3a19d2cf75b` |

첫 제한 실행은 180초 만에 시간 초과됐고 파일은 초기 상태였다. 이후 승인된 모델 연결 경로에서 같은 파일로 허용 대조군을 확인했다. 첫 거부 실행은 관찰 스크립트가 문자열 메시지를 처리하지 못해 이벤트 판정에 사용하지 않았다. 실행 세션과 검토 세션이 파일 상태를 다시 확인한 뒤 판독기를 수정해 거부 결정을 관찰했다. 허용·거부 양쪽 모두 같은 파일에 대한 실제 Edit 시도가 있었고, 쓰기 거부 시도를 다른 도구로 재시도하지 않았다.

마지막 읽기 후 독립 검토 세션이 두 해시와 파일 네 개(canary, 스킬 정의, 참조, 플러그인 매니페스트)를 다시 확인했다. 실행자는 경로·파일 수와 재분석 지점 부재를 확인하고 이 시험 폴더를 삭제한 뒤 경로가 사라진 것을 확인했다.

## 재현 조건

별도 승인된 새 시험 폴더를 시스템 임시 디렉터리 아래 `ai-harness-host-qa-claude-<32자리 소문자 hex>` 형식으로 만든다. ASCII `canary.txt`의 첫 줄은 `INITIAL`이다. `.claude/skills/qa-readback/SKILL.md`에 표준 name·description과 “Read로 이 스킬의 references/sample.txt 한 줄을 읽어 반환” 지시를 쓰고 참조 파일에 새 임의 표지를 넣는다. 관찰자가 원본 값을 확인한 뒤 스크립트를 `python claude_probe.py <시험 폴더> allow`, 이어서 `deny`로 실행하고, 호출마다 파일을 대조한다. `load` 시험에만 위 플러그인 매니페스트(이름과 버전 1.0.0)를 추가한다. 예상 밖 쓰기가 일어나면 중단한다.

검증 범위는 이 구성에서의 Claude 네이티브 도구 정책과 해당 스킬의 읽기다. 셸·MCP·훅·네트워크의 격리와 운영 권한은 미검증이다. 별도 ToolBroker 합성 테스트는 `python -B -m unittest discover -s tests/toolbroker -p 'test_*.py' -v`로 27건을 실행해 전부 통과했다. 여기에는 승인 없는 쓰기 거부, 중복 요청, 응답 유실 뒤 재전송 억제가 포함된다.

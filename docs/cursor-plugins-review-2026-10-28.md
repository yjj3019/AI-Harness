# Cursor plugins 비교 분석과 적용 (2026-10-28)

## 결론과 분석 기준

AI-Harness의 증거 게이트를 유지하면서 **정의·파일 참조 검사와 훅 시작 점검**을 보강한다. marketplace나 Cursor 전용 런타임은 추가하지 않는다. 소스 분석과 로컬 실행을 구분하며 모델 품질·비용·속도 향상을 주장하지 않는다.

| 항목 | 확인한 상태 |
| --- | --- |
| AI-Harness | private, 기본 main, archived 아님. [48f2c060d1398bbe87f6fe470542a6a3d1ec4de3](https://github.com/yjj3019/AI-Harness/commit/48f2c060d1398bbe87f6fe470542a6a3d1ec4de3) |
| 시작 상태 | 해당 커밋의 새 clone, 수정 없음. 조회 시 열린 PR 없음. 최근 CI 3건 success |
| 기존 CI 근거 | [기준 main run](https://github.com/yjj3019/AI-Harness/actions/runs/40596009725); 이번 변경 검증과 별개 |
| 구성 | agent 5개, command 1개, 선택 skill 2개, Bash hook 3개. Node 증거 게이트, Python ToolBroker fixture |
| CI 범위 | Linux Node22/24, Windows/macOS 전체 회귀, Linux namespace, 3개 OS ToolBroker fixture |
| Cursor | [c742dd61706fbacc1b95f1a20b7b988cf096ce6c](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c). 완전한 재귀 tree 2,779개 항목 |
| Cursor 규모 | 최상위 plugin manifest 17개, third_party manifest 108개. 경로 항목 pstack 706·harness 685·third_party 990; 기능 수나 품질 점수 아님 |

GitHub 연결 도구의 메타데이터·tree·PR·Actions와 로컬 Git으로 확인했다. Cursor README, manifest/schema/validator/CI, advisor, continual-learning, agent-compatibility, create-plugin, pstack/harness 문서·검사기·변환기를 집중 검토했다. upstream 코드·훅은 실행하지 않았으며 third-party 108개 구현 전체의 보안 감사는 하지 않았다.

## 구조·운영·검증 비교

| 관점 | Cursor plugins | AI-Harness 적용 판단 |
| --- | --- | --- |
| 배포와 정합성 | marketplace + plugin manifest + JSON Schema로 이름·source·version 검사 | 단일 하네스이므로 marketplace 불필요. 정의·링크·inventory 검사만 채택 |
| 정본과 호스트 변형 | pstack에서 harness/pstack/claude-code 생성, generator --check로 드리프트 검사 | 현재 복제된 다중 호스트 트리가 없어 보류. 여러 배포 형식을 실제 유지할 때 재검토 |
| 문서 드리프트 | check-pstack-docs가 목록·카운트·참조·agent/model 언급 비교 | 오래된 README 고정 테스트 수 제거. 검사 명령을 실제 CI 공통 진입점에 연결 |
| 계획과 증거 | pstack 계획 checker는 필수 절·체크리스트·live/perf 블록 형식 확인 | 선언 형식과 실제 수행은 별개. 기존 해시 체인·test-tree binding·엄격 요약·attestation replay 유지 |
| 시작 점검 | agent-compatibility는 실제 bootstrap과 정적 scanner를 구분, 점수는 heuristic | 기존 doctor의 실제 false-pass를 수정. 새 점수 체계 추가 없음 |
| 독립 검토 | advisor는 근거 briefing·read-only 검토·중요 결정/반복 실패 trigger·횟수 제한 | 기존 verify/review와 최대3회 loop 재사용. 추가 모델 호출 정책 없음 |
| 직접 검증 | prove-it-works는 실제 산출물과 재실행 가능한 검증 권고 | 이미 로그·실행 수·tree binding·CI replay 존재. 일괄 live/perf 의무 추가 없음 |
| 학습 | continual-learning은 변경 transcript와 고신호 정보만 지정 구간 갱신 | compound log 유지. transcript 접근·자동 Stop 쓰기·전역 메모리 승격 제외 |

고정 소스 근거:

- [validator](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/scripts/validate-plugins.mjs), [CI](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/.github/workflows/validate-plugins.yml)
- [생성 트리](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/harness/pstack/README.md), [generator](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/scripts/generate-pstack-harness-trees.mjs), [Claude adapter](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/harness/claude-code.md)
- [문서 checker](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/scripts/check-pstack-docs.mjs), [다중 Phase 계획](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)
- [startup review](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/agent-compatibility/agents/startup-review.md), [advisor](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/advisor/skills/advisor/SKILL.md)
- [memory updater](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/continual-learning/agents/agents-memory-updater.md), [직접 검증 원칙](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/skills/principle-prove-it-works/SKILL.md)

AI-Harness의 [phase-gate.js](../.claude/workflows/phase-gate.js)는 모델 호출·retry orchestrator가 아닌 증거 recorder/checker다. [typed context 계약](task-contracts/README.md)도 내부 compaction이나 임의 도구 권한을 가로채지 않는다. Cursor adapter와 playbook 역시 문서상의 절차를 실제 호스트 권한 강제로 오인해서는 안 된다.

## 확인한 결함과 구현

**Major: 정의·참조 누락.** 기존 tests/agents-lint.sh는 agent/command만 검사하고 빈 glob을 실패시키지 않는다. skill과 사라진 파일 링크는 일반 검사에서 빠졌다. [package-lint.js](../scripts/package-lint.js)를 [run-all.sh](../tests/run-all.sh)에 추가하고 기존 Bash 안전 검사는 유지했다.

- agent/command/skill inventory가 비면 실패. 필수 5개 역할과 phase 명령 누락도 실패.
- 닫힌 frontmatter, 본문·description 필요. agent/skill의 name은 파일/디렉터리와 일치. command name은 기존처럼 선택.
- 필수 키 중복·빈 인용 값·지원하지 않는 블록 값을 거부.
- 단순 inline 상대 링크는 저장소 안 일반 파일이어야 함. realpath로 외부 탈출·symlink 거부.
- URL·내부 fragment·fenced code 예시는 제외. 링크 fetch나 hook 실행 없음.

전체 YAML/Markdown parser가 아닌 **현재 저장소 단일 행 규약** 검사다. 블록 description, inline YAML 주석, reference-style 링크, 복잡한 괄호·공백 링크, fragment ID 검증은 지원 범위 밖이다. 필요할 때 parser와 fixture를 명시적으로 확장한다.

**Major: doctor의 잘못된 훅 연결 통과.** 기존 substring 비교는 다른 스크립트 이름·틀린 이벤트/matcher/인자를 인정할 여지가 있었다. JSON root가 null/false/0/빈 문자열이면 검사를 건너뛰는 경로도 독립 검토에서 확인했다. 이제 settings는 null·배열이 아닌 객체여야 하며, 정해진 이벤트·matcher·command 타입·인용 경로·auto 인자가 정확히 일치해야 한다. 뒤에 추가한 셸 명령은 인정하지 않는다. 훅은 저장소 안의 실행 가능한 일반 파일이어야 한다.

동등한 matcher 순서 변경이나 wrapper도 템플릿과 다르면 실패한다. 일반 Claude 설정 전체의 유효성 검사나 실제 hook 호출·workspace trust·권한 강제 인증은 아니다.

**Minor: README 테스트 수 드리프트.** 두 README의 오래된 고정 건수를 제거하고 실행 출력을 현재 건수 근거로 삼는다. 별도 catalog나 생성기를 추가하지 않았다.

## 제외·유보한 이식

- marketplace·대규모 adapter·Cursor 모델 slug/Task API/Bun hook: 현재 수요와 호스트 호환성·데이터 접근 계약이 없음.
- PR마다 10개 live lane·perf 요구: 비용과 적합성이 작업마다 다르므로 실제 UI/성능 수용 기준이 있는 Phase에서만 선택.
- 자동 Stop 메모리·commit: 민감 정보나 무관한 수정의 지속 저장 위험. 기존 검증된 compound 절차 유지.
- upstream CI 복제: 명시적 permissions가 없고 npm 의존성이 전부 고정돼 있지 않음. 기존 contents: read와 action SHA pin 유지.
- upstream validator 코드 복사: source containment와 Claude manifest 전체 schema 검사에 공백. 원칙만 독립 구현, upstream 코드 vendoring 없음.

Cursor check-pstack-docs.mjs는 분석한 CI에 실행 단계가 없다. 검사기 존재와 실제 CI 실행은 별개다. 이번 검사기는 공통 진입점에 연결했다.

## 검증과 한계

[package 회귀](../tests/package-lint.test.js)와 [doctor 회귀](../tests/doctor-config.test.js)는 빈 목록·필수 역할/스킬 누락·메타데이터·CRLF·링크 누락·Windows 절대경로·외부 symlink·잘못된 훅 연결·JSON root를 다룬다. 재현 명령:

~~~bash
node scripts/package-lint.js
node --test tests/package-lint.test.js tests/doctor-config.test.js
bash tests/run-all.sh
python -m unittest discover -s tests/toolbroker -p 'test_*.py' -v
~~~

소스 head ea6a1c2의 [PR CI](https://github.com/yjj3019/AI-Harness/actions/runs/40619910988)는 8개 작업 모두 성공했다. Linux Node24와 Windows 전체 검사 로그는 각각 177/177 통과·skip 0과 ALL CHECKS PASSED를 기록했다. 로컬 Windows Node24 추가 회귀는 41/41, Python3.14 ToolBroker는 24/24 통과했다. 중단된 초기 로컬 묶음 실행과 CI로 대체한 로컬 전체 실행은 성공 건수에 포함하지 않는다. 최종 문서 커밋은 별도 CI 대상이며 PR에서 확인한다.

패키지 정합성은 모델의 의미 이해·live 안전성 인증이 아니다. 실제 호스트 권한·운영 API/DB·실모델 평가는 여전히 미검증이다.

후속 후보는 agent tools 전체 schema/allowlist 검사, 복잡한 링크 parser, 다중 호스트 adapter와 live 평가다. 기존 Bash 도구 목록 검사는 모든 YAML 들여쓰기 변형을 해석하지 못하므로 권한 경계로 취급하지 않는다. 이번에는 runtime 증거 형식·attestation·도구 권한 정책을 변경하지 않았다.

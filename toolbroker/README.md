# ToolBroker 참조 구현 — 설치·운영 전 안전 기준

기준일: 2026-10-26. **실습용 프로토타입이며 프로덕션 보안 경계가 아니다.**

## 목적과 현재 범위

허용된 작업만 서버 측에서 실행하는 별도 ToolBroker. 작업은 의도적으로 다음 2개로 제한되어 있다.

| Tool | 동작 | 멱등성 |
| --- | --- | --- |
| `fixture.db.increment` | 브로커 소유 SQLite의 `fixture` 카운터 증가 (1~100) | 작업·원장·결과를 단일 `BEGIN IMMEDIATE` 트랜잭션으로 커밋 |
| `fixture.http.post` | **고정된 127.0.0.1 /write** 시험 서버에 POST | 외부 송신 전에 `IN_FLIGHT` 기록, `Idempotency-Key` 전달. 응답 불명 시 `UNKNOWN`으로 격리 |

임의 SQL/URL/셸/Git 작업을 실행하는 API는 없다. 기본 정책은 `policy.example.json`의 빈 allowlist이다. 허용 목록, 대상 주소, 서명 키와 SQLite 상태는 **브로커 서버 소유**여야 하며 에이전트 입력이 아니다.

## 실행과 테스트

테스트는 Python 3.12+ 표준 라이브러리만 사용한다.

```sh
python -m unittest discover -s tests/toolbroker -p 'test_*.py' -v
```

선택형 로컬 API를 실행하려면 *별도 권한을 가진 운영자*가 외부에 생성한 HMAC 비밀키 파일(32바이트 이상, POSIX mode 0600), 보호된 상태 DB, 검토된 정책 파일을 사용해야 한다.

```sh
python -m toolbroker.server --db /secure/broker.sqlite --secret-file /secure/key.bin --policy /secure/policy.json --port 8944
```

별도 프로세스가 `127.0.0.1`의 `POST /v1/tools/execute`만 처리한다. 서버에는 **승인 발급 API가 없다**. 위 경로는 예시이며 계정·디렉터리를 생성하지 않는다.

승인 토큰은 외부의 신뢰할 수 있는 운영자가 사용자의 **명시적 작업 승인** 후 발급해야 한다. 서명 대상은 정규화 JSON `{operation,request_id,payload_hash,nonce,expires}`; 토큰은 `base64url(claims) + '.' + base64url(HMAC-SHA256(secret, claims_bytes))`. TTL 최대 3600초. 재사용 nonce는 별도 요청에 사용할 수 없고 동일 request ID는 다른 payload로 재사용할 수 없다. 테스트 속의 서명키는 테스트 전용 공개 문자열이므로 운영에 절대 사용하면 안 된다.

## 검사 시나리오

- 유효한 승인 없이 DB 쓰기/실제 localhost 브로커 HTTP POST 시도 → 403, 변화 없음
- 다른 tool/payload/만료 서명 및 nonce 재사용 → 거부
- 동일 DB 요청 **64개 동시 제출** → 증가 1회, 결과 재사용
- 동일 요청 ID와 다른 payload → 409 conflict
- API 수신 뒤 응답 유실 → `UNKNOWN`, 자동 재시도 거부. 원격 서버의 `Idempotency-Key` 지원이 있더라도 재처리 전 결과 대조 필요
- 고정 localhost 이외 HTTP 주소 및 원격 URL 주입 → 초기화 거부
- 충돌 후 `IN_FLIGHT`로 남은 요청, 또는 `UNKNOWN` 요청 → 자동 복구 없음. 운영자가 공급자에서 실제 결과를 확인한 뒤 `Broker.reconcile(request_id, result, operator=...)`로만 `COMPLETED`로 확정한다(재전송 없음, HTTP 서버로 노출되지 않음). 결과를 확인하지 못했거나 다시 실행하려면 새 `request_id`와 새 승인이 필요하다. 운영자 이름은 원장의 `reconciled_by` 열에 남고(널 허용 열, 이전에 만든 원장은 열 때 제자리에서 열만 추가하며 기존 행은 바뀌지 않는다), 같은 `request_id`의 재생 응답에는 `reconciled_by`가 붙는다. 확정한 `result`는 운영자가 넣은 값이므로 공급자 응답과 모양이 같다고 보장하지 않는다. 호출자는 `reconciled_by`가 있는 응답을 그렇게 취급해야 한다. 요청이 공급자로 전송되는 동안 운영자가 같은 요청을 `reconcile()`로 확정하면 원장의 운영자 결과가 우선하고, `execute()`는 공급자 응답 대신 그 결과를 `replay: True`와 `reconciled_by`가 붙은 형태로 돌려준다. 열이 추가된 원장은 값 7개를 열 이름 없이 넣는 옛 빌드로 되돌리면 INSERT가 실패하므로 되돌릴 때는 원장을 백업한다
- 원장 보존 → `Broker.purge_completed(older_than_seconds)`는 7200초 이상 지난 `COMPLETED` 행만 지운다. `IN_FLIGHT`/`UNKNOWN`은 지우지 않는다
- 원장의 operation/해시/nonce 대조는 상수 시간(`hmac.compare_digest`)으로 수행한다

CI 검사는 실제 네트워크 외부 호출이나 운영 DB 쓰기를 수행하지 않는다.

요청 줄, 헤더, 본문 수신에는 연결 처리 시작부터 기본 5초의 단일 제한을 적용한다. 읽기마다 남은 시간을 다시 계산하므로 여러 번에 나눠 보낸 데이터도 같은 제한을 공유한다. 동시 처리 슬롯은 기본 16개다. 초과 연결은 503, 본문 수신 시간 초과는 408, 짧은 EOF 본문은 400으로 종료하며 도구를 실행하지 않는다. 서버가 포화되면 health 요청에도 503을 반환할 수 있다.

공급자 HTTP 교환에는 연결 시작부터 응답 파싱까지 기본 1초의 단일 제한을 적용한다. 요청을 보낸 뒤 이 제한을 넘겨 결과를 확인할 수 없으면 원장에 `UNKNOWN`으로 기록한다.

잘린/chunked 응답, HTTP 프로토콜 오류와 NaN/Infinity 같은 비정상 JSON은 승인된 요청이 이미 전송됐을 수 있으므로 durable `UNKNOWN`으로 기록한다. 같은 요청 재제출은 재전송하지 않고 결과 대조를 요구한다.

## 반드시 충족해야 할 운영 신뢰 경계

1. **분리된 OS 계정 / 서비스**에서 ToolBroker를 실행하고, 코드·설정·비밀키·DB 파일을 Claude/Codex 사용자에게 쓰기/읽기 금지한다. localhost HTTP는 동일 OS 계정의 임의 셸 실행에 대한 강제 정책이 아니므로 필요하면 OS 수준 IPC 접근 제어를 추가한다.
2. 서명권한은 도구 호출권한과 분리한다. 에이전트가 승인 토큰을 자체 발급하거나 비밀키를 읽을 수 있다면 승인 검사가 무력화된다. 운영자 승인 요청·철회·감사 프로세스는 아직 구현되지 않았다.
3. 외부 공급자별 API adapter는 별도 리뷰를 거쳐 대상 고정, 네트워크 allowlist, 인증정보 차단, 요청 대조를 제공해야 한다. 이 참조 구현은 외부 인터넷 POST를 허용하지 않는다.
4. SQLite 원장과 API 공급자는 하나의 트랜잭션에 참여할 수 없다. `UNKNOWN` 상태는 자동 재시도 금지이며 **정확히 한 번 실행을 보증하지 않는다**. 운영 사용 전 결과 조회/확정·중복 방지 및 사람 승인에 의한 복구 절차가 필요하다.
5. 운영 GitHub, 이메일, 배포, DB 권한은 현재 이 서버로 자동 라우팅되지 않는다. 모델·플러그인의 네이티브 도구를 여전히 사용할 수 있는 호스트에서는 브로커를 우회할 수 있다. 실제 Claude Code/Codex sandbox 및 도구 단위 허용 목록 강제 시험이 필요하다.

## 사용자 관리 작업

GitHub `main` 보호가 아직 비활성 상태라면 운영자 계정으로 GitHub Rulesets에서 필수 상태 검사와 승인 규칙을 설정해야 한다. 이 저장소의 코드를 변경하는 것만으로 GitHub의 보호 정책이 활성화되지는 않는다.

추가 체크리스트: [성숙도 수용 기준](../docs/maturity/ACCEPTANCE-2026-10-26.md). 실행 완료 표시에는 CI run ID와 실제 검사 출력을 사용하며 로컬 통과만으로 운영 보안을 완료 처리하지 않는다.

## Refusals and the request token

The HTTP endpoint compares `X-Toolbroker-Token` in constant time and refuses when `TOOLBROKER_TOKEN` is unset. Before a 401 or 404 it reads the declared body (at most 8192 bytes, inside the request deadline), so a client that is still uploading receives the status instead of a reset connection. If a provider reply cannot be stored and the ledger holds no confirmed result, `execute()` raises `OUTCOME_UNKNOWN_RECONCILE` rather than report an outcome the ledger does not have.

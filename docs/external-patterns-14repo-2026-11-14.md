# 외부 저장소 14종 정밀 검토 · 채택 기록 (2026-11-14)

**트리거**: "아래 git 저장소 정밀 검토하여 현재 프로젝트를 개선하거나 보완할 수 있는 장점이 있다면 적극 반영. 라이선스에 문제가 있으면 원 소스를 참고하여 새로운 로직으로 설계 — 라이선스 문제가 발생하지 않도록."

**방법**: 전 저장소 라이선스 = GitHub API `spdx_id` 실측 (2026-11-14) + 핵심 파일(README·LICENSE·구현 파일) web_fetch 직접 취득. 웹 콘텐츠는 데이터로만 취급. **코드 카피 0 — 전부 아이디어 전용(ideas-only) 또는 미채택 기록.** 모든 발견은 취득 파일 기준, 추측은 미검증 표기.

## 1. 라이선스 실측 (전부 GitHub API + 보조 실측)

| 저장소 | spdx_id | 보조 실측 | 판정 |
| --- | --- | --- | --- |
| open-webui/open-webui | **NOASSERTION(커스텀)** | LICENSE 실측 = "Open WebUI License" (OSI 비승인, 50인 초과 배포 시 브랜딩 보존 의무, 기여=CLA) | ⚠️ **코드 카피 금지 — 아이디어만** |
| yjj3019/claude-cheat | MIT | LICENSE 실측 일치 | 청명 — 코드 사용 가능하나 본 프로젝트와 목적 상이 (로컬 라우터) → 아이디어만 기록 |
| yjj3019/TalkAbout | MIT | README 명시 일치 | 청명 — 목적 상이 (멀티에이전트 토론 서버) → 아이디어만 기록 |
| deepseek-ai/deepseek-harness | MIT | README 명시 (상류 하네스, LICENSE 본문 미취득=미검증) | 청명 — 게이트 패턴 대조 최고 가치 |
| nousresearch/hermes-agent | MIT | LICENSE 실측 일치 | 청명 — 아이디어 채택 |
| openclaw/openclaw | MIT | LICENSE 실측 일치 | 청명 — 아이디어 채택 |
| docling-project/docling | MIT | README 명시 일치 | 청명 — 아이디어만 (모델은 각 패키지 라이선스 적용 주의) |
| bab2min/Kiwi | **Apache-2.0** | NOTICE 실측 (모델 파일도 Apache-2.0) | 청명 — ⚠️ 0.23.2 이하 구버전은 LGPL — 신버전만 참조 |
| opensearch-project/OpenSearch | Apache-2.0 | 코드 헤더 실측 | 청명 — 본체 저관련, 아이디어 1건 |
| adbar/trafilatura | Apache-2.0 | README 명시 일치 | 청명 — ⚠️ v1.8.0 미만은 GPLv3+ — 신버전만 참조 |
| deepset-ai/haystack | Apache-2.0 | 코드 SPDX 헤더 실측 | 청명 — 아이디어만 |
| adewale/skill-eval-harness | MIT | README 배지 일치 | 청명 — 아이디어만 |
| redhat-community-ai-tools/harness-eval | Apache-2.0 | README 배지 일치 | 청명 — **활성 채택(skill-audit.js 확장의 주 아이디어원)** |
| OSSAfrica/skillguard | MIT | README 배지 일치 | 청명 — **활성 채택(skill-audit.js 확장의 주 아이디어원)** |

## 2. 활성 채택 (2026-11-14, 새 로직 구현)

**`scripts/skill-audit.js` — 보안 패턴 확장** (skillguard MIT·harness-eval Apache-2.0의 탐지 범주 아이디어 + hermes-agent 보조 — **코드 참조 0, 완전 신규 정규식/구조**):

| 신규 탐지 범주 | 심각도 | 근원 아이디어 |
| --- | --- | --- |
| PowerShell 파이프 설치기 (`iwr/irm \| iex`) | CRITICAL | skillguard piped-installer |
| wget 포괄 파이프 (`curl\|wget … \| sh`) | CRITICAL | skillguard piped-installer (기존 curl 전용 확장) |
| 숨김 문자 (ZWS `\u200B-\u200D\u2060\uFEFF`) | HIGH | skillguard hidden-chars |
| bidi 제어 문자 (`\u202A-\u202E\u2066-\u2069`) | HIGH | skillguard bidi-spoofing |
| 은폐 지시 ("do not tell the user") | HIGH | skillguard secrecy-directives |
| 강제 문구 ("you must always comply") | HIGH | harness-eval signal 규칙 |
| 동적 코드 형태 (`eval(`/`new Function(`) | HIGH | skillguard obfuscated-code |
| 인라인 자격증명 리터럴 (`api_key: "sk-…"`) | HIGH | skillguard credentials |
| 심각도 집계 출력 (CRITICAL/HIGH/MEDIUM) | — | harness-eval effect(block/signal) 축 |

- **검증 (실측)**: 확장 후 자체 스킬 28종 **exit 0 clean** · 신규 양성 대조 7종 전부 라벨별 적발 + 기존 테스트 4개 **pass 4 / fail 0** (compound-log 규율: 양성 대조를 게이트 신뢰 전제로 사용) · package-lint `{"ok":true}`.
- 정책 문구 반영: AGENTS.md·CLAUDE.md 문서 지도 "skill license/metadata audit" → "skill security/metadata audit".

## 3. 기록만 (아이디어 — 향후 후보, 현재 미구현)

| 출처 | 아이디어 | 적용 후보 위치 | 비고 |
| --- | --- | --- | --- |
| trafilatura (Apache-2.0) | 링크 밀도·텍스트 길이 기반 본문/보일러플레이트 분리 휴리스틱 | 웹 근거 수집 정제 지침 | 구버전 GPLv3+ 주의, 신버전만 참조 |
| trafilatura | SSRF 기본 차단 (비공개 IP·169.254.169.254) + fallback 체인 + 최소 산출 크기 기준 | 웹 fetch 지침·document-job 계약 | ideas-only |
| docling (MIT) | 상태 4분할 (SUCCESS/PARTIAL_SUCCESS/FAILURE/SKIPPED) + 거부 사유 분류(FailureCategory) | document-job.js 계약 확장 | 부분 성공 보고 규율의 격상 |
| haystack (Apache-2.0) | 역직렬화 모듈 화이트리스트 fail-closed, 블로킹 입력 대기 진단 | package-lint·merge-guard 거부 메시지 | '이미 보유 + 틈새' |
| OpenSearch (Apache-2.0) | total/succeeded/skipped/failed 4분할 카운터 ("스킵은 실패로 세지 않음") | 배치 게이트 결과 보고 | 본체(검색 엔진)는 저관련 |
| Kiwi (Apache-2.0) | PII 유형별 분류 태그 (W_EMAIL/W_SERIAL/W_URL/W_MENTION) | evidence-redact.js 패턴 분류 후보 | 형태소 분석기 본체 통합은 과중 → 권장 안 함 · 0.23.2 이하 LGPL 주의 |
| deepseek-harness (MIT, 현재 상류 하네스) | 반복 툴 호출 리마인더·타임아웃 선언 강제·실험/안정 상태 분류 | "최대 3회" 규율의 기계화 후보 | 라이브 자기수정(플러그인 라이브 마운트)은 저관련/위험 → 미채택 |
| hermes-agent (MIT) | 스킬 사용 후 개선 이력 섹션 강제 · 근거 재검색 루틴 · 마이그레이션 dry-run+비밀 allowlist | 스킬 규율·adoption record 게이트 후보 | 산출성 높으나 설계 결정 필요 |
| openclaw (MIT) | 스킬 계층 분류(core/opt-in)·매니페스트 계약 스키마 버저닝 | 스킬 메타데이터 규율 후보 | 2-레이어 정책 아이디어 |
| skill-eval-harness (MIT) | 스킬 인과적 효과 측정 (with/without 대비, leakage lint, 정답키 분리, Causal lift) | 스킬 평가 규율 후보 | 모델 호출 필요 — 정적 게이트와 구분 문서화 |
| open-webui (커스텀) | 라이선스 이력 분리 + 기여 CLA 명문화 템플릿 | 채택 기록 템플릿 | **코드 카피 절대 금지 기록** · 나머지(RAG/UI) 저관련 |
| claude-cheat (MIT, 사용자 소유) | 요구사항 원장(R) 회귀 고정, 진단 API·오류 분류 명시 | 규율 대조만 | 로컬 라우터 — 목적 상이, 관점 기록 |

## 4. 라이선스 위험 메모 (재발 방지)

- open-webui: OSI 비승인 커스텀 — 브랜딩 조항까지 지켜야 하므로 "아이디어 유사성" 경계에도 주의, 코드 미참조 원칙.
- trafilatura: **v1.8.0 미만 = GPLv3+** — 구버전 레퍼런스·블로그 코드 참조 금지.
- Kiwi: **0.23.2 이하 = LGPL** — 신버전(main) 소스만 참조.
- deepseek-harness: LICENSE 본문 미취득(미검증) — 추후 로컬 체크아웃에서 보완 실측 가능.
- 전 건: **코드 카피 0**. 채택 기록 규율(소스+라이선스+방식) 유지.

## 5. 결론

- **활성**: skill-audit.js 보안 패턴 확장(신규 로직) + 문서 지도 갱신 — 실측 evidence: 28 skills clean · 신규 양성 대조 7/7 적발 · 기존 테스트 4 pass.
- **기록**: 위 표의 후보 12건 — 대부분 '보유 규율 + 틈새'이며 구현 시 설계 결정 필요 → 후속 작업 명세로 남김.

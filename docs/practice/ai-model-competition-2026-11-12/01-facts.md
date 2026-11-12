# 01. 근거표 — GPT vs Claude AI 경합 (샘플)

*확인일: 2026-11-12 · 취득 방식: 공식 출처 직접 fetch (HTTP 상태) · 라벨: 확인 / 확인(한측 소스) / 추론 / 미검증*

| ID | 내용 | 상태 | 소스 (취득일) |
| --- | --- | --- | --- |
| F1 | OpenAI 현재 라인업 — GPT-6 Astra(플래그십) · 6.1 Sol · 6.1 Terra · Luna(대량) · Cyber(보안) + 5.2~5.6 계열 + gpt-oss-120b/20b(오픈웨이트) + 오디오·이미지·리얼타임 전문 모델 | 확인 | developers.openai.com/api/docs/models (HTTP 200, 2026-11-12) |
| F2 | OpenAI 모델 선택 가이드 — Luna=비용 효율 최대, Astra=능력 최상, 추론 노력 7단계(Luna Low → Astra XHigh)로 모델·노력 조합 권장 | 확인 | developers.openai.com/api/docs/guides/model-selection (HTTP 200, 2026-11-12) |
| F3 | Anthropic 현재 라인업과 역할 — Fable 5.2(강인한 추론·장기 에이전트) · Opus 5.5(에이전틱 코딩·지식 업무, 기본 권장) · Sonnet 5.5(속도+지능 조합) · Haiku 5.5(대량·지연 민감) | 확인 | platform.claude.com/docs/en/models/overview (HTTP 200, 2026-11-12) |
| F4 | Claude API 가격 (per MTok) — Fable 5.2 $8/$40 (fast $16/$80) · Opus 5.5 $4/$20 · Sonnet 5.5 $2/$10 · Haiku 5.5 $0.10/$0.50 (프롬프트 ≤100k) | 확인 | platform.claude.com/docs/en/about-claude/pricing (HTTP 200, 2026-11-12) |
| F5 | Fable 5.2/Mythos 5.2 (2026-11-09) — 동일 기반 모델: Fable=일반 공개(사이버·바이오 안전장치), Mythos=Life Sciences·Cyber 검증 프로그램 조직; 5.1 대비 30% 빠름; fast mode 2.5×; 최신 증류 방어 | 확인 | anthropic.com/claude-fable-and-mythos-5-2 (HTTP 200, 2026-11-12) |
| F6 | 벤치마크 비교 (공고 수치) — FrontierCode 2.0: Fable 5.2(Xhigh) 49.1% > Opus 5.5 45.5% > GPT-6 Astra 42.8% > Gemini 4 Carbon 41.1%; Humanity's Last Exam(tools): Fable 74.2% vs GPT-6 Astra 57.2% | 확인(한측 소스) | F5 동일 (Anthropic 공고 — OpenAI 독립 보고 미취득) |
| F7 | Anthropic 구조 신호 — PBC(공익법인) · S-1 IPO 신청(2026-10-26) · Public Benefit Fund(2026-10-18) · 약물 개발 연구(2026-10-27) | 확인 | anthropic.com/news (HTTP 200, 2026-11-12) |
| F8 | OpenAI 전략 추구(AGI·소비자 우선 등 공식 입장) — 이번 세션에 직접 진술 미취득 | 미검증 (주장 없음) | — |
| F9 | 독립 벤치마크(비벤더) 비교 — 이번 세션에서 수행하지 않음 | 미검증 (주장 없음) | — |

## 사용 규칙

- **확인**: 소스 병기 후 주장. **확인(한측 소스)**: "벤더 발표" 라벨 필수 — F6 수치에는 반드시 amber + 한측 소스 표기.
- **추론**: 제품 라인업·신호(F1~F7)로부터의 유추만 — "추론" 라벨. **미검증**: 절대 주장하지 않음.
- '장단점' 슬라이드는 F1~F7 기반 **추론**이며, 각 사의 공식 인정 진술이 아님.

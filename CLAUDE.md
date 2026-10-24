# CLAUDE.md - PPT 제작 하네스

## 프로젝트 개요
이 프로젝트는 PPT(PowerPoint)를 만드는 프로젝트입니다.
사용하는 스킬은 Anthropic 공식 pptx 스킬입니다.
(npx skills add https://github.com/anthropics/skills --skill pptx --agent claude-code)

사내 템플릿이 존재하지 않으므로 템플릿 관련 내용은 생략합니다.
생성 시 일관된 색상 테마, 글자 깨짐 방지, 적절한 로고/요소 위치를 준수하여 톤앤매너를 유지합니다.

## 핵심 규칙
- 샘플 우선: 전체 생성 전 항상 3장 샘플을 먼저 생성하고 시각 QA를 통과한다.
- 결론형 타이틀: 슬라이드 제목은 섹션 레이블이 아닌 판단 문장으로 작성한다.
- 소스 충실성: PageDetail.md에 명시된 데이터 외에 새로운 숫자를 추가하지 않는다.
- 네이티브 객체: 테이블과 차트는 OOXML 네이티브로 생성한다 (그림 금지).
- 시각 QA 강제: 생성 후 슬라이드를 이미지로 렌더링하여 오버플로우·대비를 확인한다.
- 한 슬라이드 한 아이디어.

## 참조 문서
- 자유 아이디어: docs/Brain.md
- 논리 구체화: docs/UpgradeBrain.md
- PPT 전체 흐름: docs/Phase.md
- 페이지별 상세: docs/PageDetail.md
- 페이지별 레이아웃: docs/PageLayout.md
- 상세 워크플로: docs/ppt-harness-workflow.md

## 하네스 원칙 (요약)
- No One-Shot: 샘플 검증 후 전체 생성.
- 단계별 문서 기반 진행.
- 실패 시 compound-log.md에 기록.
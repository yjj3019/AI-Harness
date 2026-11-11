# 근거표 — OpenShift Virtualization 통합 실습 (확인일: 2026-11-11)

## A. 확인된 사실 (직접 취득)

| # | 사실 | 근거(출처) | 취득 결과 | 확인일 | 상태 |
| --- | --- | --- | --- | --- | --- |
| F1 | Red Hat OpenShift Virtualization은 조직이 가상 머신(VM)을 컨테이너와 같은 근대적 워크로드와 **함께 마이그레이션·실행·관리**하도록 돕는 제품이다. | https://developers.redhat.com/products/openshift/virtualization | HTML 직접 취득 (HTTP 200) | 2026-11-11 | **확인** |
| F2 | 가상화는 하이퍼바이저가 단일 물리 하드웨어에서 여러 VM을 생성·실행하고 CPU·스토리지·메모리를 호스트 간 풀링·재배치할 수 있게 하는 기술이다. | https://developers.redhat.com/products/openshift/virtualization (What is virtualization 절) | HTML 직접 취득 (HTTP 200) | 2026-11-11 | **확인** |
| F3 | 구체 아키텍처·컴포넌트·CRD·라이브 마이그레이션 등 설계 세부 | https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/virtualization/index · https://docs.openshift.com/container-platform/4.17/virt/about_virt/about-virt.html | **둘 다 403 (Access Denied)** | 2026-11-11 | **미검증 → 재실측 필요** |
| F4 | 버전 지원 범위·인증: 시스템 요구 사항 등 수치·제약 | `docs.redhat.com` (위 경로) | **403** | 2026-11-11 | **미검증 → 재실측 필요** |
| F5 | 실습 프레임(의사결정 축·파이프라인 8단계·8종 산출물·게이트) | 본 저장소 헌법(AGENTS.md) · 형식 게이트(references/format-gate.md) | 파일 실측 | 2026-11-11 | **제안(가설)** |

## B. 규칙 (본 실습에 적용)

- **근거 없는 제품 기능·수치 없음**: F1·F2 외 기능/수치는 어떤 문서에도 수치를 부여하지 않음.
- **미검증을 실증으로 표현 금지**: F3·F4는 전 자산에 '미검증(403 — 재실측 필요)' 라벨 유지.
- 변환해도 수치·도표 의미 불변: 모든 산출물이 동일 근거표(F1~F5)를 공유.

## C. 한계 (남은 한계 명시)

- 공식 설계 문서 접근 제한(403) → 설계 수준 검증은 **미수행** — 설치·클러스터 실측과 함께 별도 세션에서 재실측.

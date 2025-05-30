"""
모델 라벨 목록

[0] 다크패턴 아님

[1] 오도형
ex) 아니요, 정가를 지불하고 싶습니다
‘사용자를 혼란시키거나 헷갈리게 할 수 있어요’

[2] 압박형 /소비유도
ex) 20개 남음 / 함께할인 / 3개 담으면 2000원 할인
‘압박감을 주거나 소비를 유도해요’

[3] 긴급성
ex) 기간 한정 세일, 품절 임박
‘결정을 빠르게 하도록 유도해요’

[4] 다른 소비자 행동 알림
ex) 100명이 보고있습니다, 300개 판매됨
‘다른 사용자의 행동을 따라하도록 유도해요’
"""

site_darkpatterns = {
	"site_name": {
		"num_label[int]": [
			"\d+개 남음",  # 다크 패턴을 정규 표현식 형태로 입력
			"품절 임박",
		],
	}
}


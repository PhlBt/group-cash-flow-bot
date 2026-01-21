const markets = [
  {
    "title": "Повышение цен на золото",
    "description": "Военные действия на Среднем Востоке вызвали рост цен на нефть. Цена золота взлетела до 18 тыс ₽ за унцию. \nВсе кто имеет золотые монеты ЮАР (весом 1 унция) могут продать по этой цене.",
    "cost": 180000,
    "relatedDeals": ["small_deal_38"]
  },
  {
    "title": "Покупка партнерства",
    "description": "Бизнес был продан и вы получаете двойную стоимость от первоначальной, за вашу долю в нем. \nВсе кто имеют ограниченное партнерство могут продать.",
    "costMultiple": 2,
    "relatedDeals": ["big_deal_13", "big_deal_15", "big_deal_16", "big_deal_24"]
  },
  {
    "title": "Куплю квартиру - 2/1",
    "description": "Покупатель предлагает 1.9 млн ₽ за двухкомнатную квартиру 2/1. Имеет собственное финансирование. \nВсе могут продать по этой цене.",
    "cost": 1900000,
    "relatedDeals": ["small_deal_0", "small_deal_2", "small_deal_15", "small_deal_41", "small_deal_48"]
  },
  {
    "title": "Куплю 20 акров земли",
    "description": "Покупатель ищет земельный участок на 20 акров в жилом районе для коммерческого ис-пользования. Предлагается 6.0 млн ₽ каждому кто владеет 20 акрами земли в жилом районе.",
    "cost": 6000000,
    "relatedDeals": ["big_deal_28"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 1.1 млн ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 1100000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю мотель",
    "description": "Два корпоративных служащих заработав много наличных, решили изменить жизнь и заняться бизнесом. Они ищут подходящий им мотель и согласны заплатить 7.5 млн ₽ хоть сегодня. Все могут продать по этой цене.",
    "cost": 7500000,
    "relatedDeals": ["big_deal_2", "big_deal_7"]
  },
  {
    "title": "Куплю квартиру - 2/1",
    "description": "Покупатель предлагает 1.6 млн ₽ за двухкомнатную квартиру 2/1. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 1600000,
    "relatedDeals": ["small_deal_0", "small_deal_2", "small_deal_15", "small_deal_41", "small_deal_48"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 1.2 млн ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 1200000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Снижение процентных ставок",
    "description": "Процентные ставки на внутренних займах понижаются до 5%.",
    "creditMultiple": -0.005,
  },
  {
    "title": "Куплю золотые монеты",
    "description": "Коллекционер ищет подлинные золотые монеты Нового Мира Королевской Испании 1500 года (отчеканенные в Гаване). Он предлагает 150 тыс ₽ за каждую монету.",
    "cost": 150000,
    "relatedDeals": ["small_deal_24"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 900 тыс ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 900000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю торговый центр",
    "description": "Крупный торговец приехал в город в поисках небольшого торгового центра для покупки. Он готов заплатить 3.0 млн ₽ любому кто владеет таким торговым центром.",
    "cost": 3000000,
    "relatedDeals": ["big_deal_27"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 3.0 млн ₽ за дом. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 3000000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 1.1 млн ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 1100000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю жилой дом",
    "description": "Покупатель предлагает 1.4 млн ₽ за каждую квартиру в жилом доме любого размера. Имеет собственное финансирование. [У него заканчивается срок налогового кредита, он спешит.] Все могут продать по этой цене.",
    "apartmentCost": 1400000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_21", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35", "big_deal_36", "big_deal_37"]
  },
  {
    "title": "Куплю жилой дом",
    "description": "Покупатель предлагает 1.2 млн ₽ за каждую квартиру в жилом доме любого размера. Имеет собственное финансирование и должен вло-жить капитал сейчас. Все могут продать по этой цене.",
    "apartmentCost": 1200000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_21", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35", "big_deal_36", "big_deal_37"]
  },
  {
    "title": "Куплю квартиру - 2/1",
    "description": "Покупатель предлагает 1.4 млн ₽ за двухкомнатную квартиру 2/1. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 1400000,
    "relatedDeals": ["small_deal_0", "small_deal_2", "small_deal_15", "small_deal_41", "small_deal_48"]
  },
  {
    "title": "Куплю компанию",
    "description": "Крупная компания по производству программного обеспечения предлагает 3.0 млн ₽ за небольшую компанию, занимающуюся разработками программного обеспечения. \nВсе кто владеет такой компанией, могут продать по этой цене.",
    "cost": 3000000,
    "relatedDeals": ["small_deal_10", "small_deal_39"]
  },
  {
    "title": "Экономический рост",
    "description": "Основанная вами компания заключила дистрибьюторский договор с крупной компанией. Что привело к увеличению продаж на 150%. \nЭто приносит больше проблем и требует больше времени, однако пассивный доход увеличился на 12 тыс ₽.",
    "passiveIncome": 12000,
    "relatedDeals": ["small_deal_10", "small_deal_39"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 4.0 млн ₽ за дом. Имеет собственное финансирование Все могут продать по этой цене.",
    "cost": 4000000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Застройщик ищет землю",
    "description": "Городская архитектура потребовала от застройщика внести в планы еще и 10-акровый парк, в противном случае они не утвердят его проект. Приходится искать 10 акров земли. Он предлагает 4.5 млн ₽ каждому кто продаст ему такой участок.",
    "cost": 4500000,
    "relatedDeals": ["small_deal_16"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 900 тыс ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 900000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 3.0 млн ₽ за дом. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 3000000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Удары инфляции!",
    "description": "Инфляция 10%.",
    "inflation": 1.1,
  },
  {
    "title": "Инфляция падает!",
    "description": "Инфляция -5%",
    "inflation": 0.95,
  },
  {
    "title": "Банковский кризис!",
    "description": "Процентные ставки на внутренних займах повышаются на 10%.",
    "creditMultiple": 0.01,
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 750 тыс ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 750000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 2.7 млн ₽ за дом. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 2700000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Куплю квартиру - 2/1",
    "description": "Покупатель предлагает 1 650 тыс ₽ за двухкомнатную квартиру 2/1. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 1650000,
    "relatedDeals": ["small_deal_0", "small_deal_2", "small_deal_15", "small_deal_41", "small_deal_48"]
  },
  {
    "title": "Куплю жилой дом",
    "description": "Покупатель предлагает 750 тыс ₽ за каждую квартиру в жилом доме любого размера. Имеет собственное финансирование. [У него заканчивается срок налогового кредита, он спешит.] Все могут продать по этой цене.",
    "apartmentCost": 750000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_17", "big_deal_26", "big_deal_31", "big_deal_34"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 4.0 млн ₽ за дом. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 4000000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Куплю дом - 3/2",
    "description": "Покупатель предлагает 3.3 млн ₽ за дом. Имеет собственное финансирование. Все могут продать по этой цене.",
    "cost": 3300000,
    "relatedDeals": ["big_deal_14", "big_deal_18", "big_deal_25", "big_deal_30", "big_deal_32", "big_deal_33", "big_deal_38", "big_deal_41", "small_deal_4", "small_deal_8", "small_deal_11", "small_deal_12", "small_deal_19", "small_deal_33", "small_deal_44"]
  },
  {
    "title": "Куплю автомойку",
    "description": "Покупать очень жаждет приобрести автомойку. Готов заплатить 7.5 млн ₽. Но это его предел. Все могут продать по этой цене.",
    "cost": 7500000,
    "relatedDeals": ["big_deal_1", "big_deal_6"]
  },
  {
    "title": "Куплю жилой дом",
    "description": "Трастовый фонд предлагает 900 тыс ₽ за каждую квартиру в 12-ти квартирном или большем доме. Имеет собственное финансирование и фонды от продажи комплекса в другом городе. Все могут продать по этой цене.",
    "apartmentCost": 900000,
    "relatedDeals": ["big_deal_20", "big_deal_21", "big_deal_36", "big_deal_37"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 1.1 млн ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 1100000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Покупка партнерства",
    "description": "Бизнес был продан и вы получаете двойную стоимость от первоначальной, за вашу долю в нем. Все кто имеют ограниченное партнерство могут продать.",
    "costMultiple": 2,
    "relatedDeals": ["big_deal_13", "big_deal_15", "big_deal_16", "big_deal_24"]
  },
  {
    "title": "Покупка партнерства",
    "description": "Бизнес был продан и вы получаете тройную стоимость от первоначальной, за вашу долю в нем. Все кто имеют ограниченное партнерство могут продать.",
    "costMultiple": 3,
    "relatedDeals": ["big_deal_13", "big_deal_15", "big_deal_16", "big_deal_24"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 750 тыс ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 750000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 900 тыс ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 900000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Куплю многоквартирный дом",
    "description": "Покупатель предлагает 1.2 млн ₽ за каждую квартиру в 2-х, 4-х или 8-ми квартирном доме. Имеет собственное финансирование. Все могут продать по этой цене.",
    "apartmentCost": 1200000,
    "relatedDeals": ["big_deal_0", "big_deal_3", "big_deal_4", "big_deal_5", "big_deal_8", "big_deal_9", "big_deal_11", "big_deal_12", "big_deal_17", "big_deal_22", "big_deal_23", "big_deal_26", "big_deal_31", "big_deal_34", "big_deal_35"]
  },
  {
    "title": "Признание успехов",
    "description": "Основанная вами компания награждена за заслуги в разработке новых продуктов. Большая огласка привела к удвоению уровня продаж. Вам приходится больше работать. Однако пассивный доход увеличился на 7 500 ₽. \nВсе владельцы вновь созданных компаний увеличивают пассивный доход на 7 500 ₽ на каждое предприятие.",
    "passiveIncome": 7500,
    "relatedDeals": ["small_deal_10", "small_deal_39"]
  }
]

module.exports = { markets }

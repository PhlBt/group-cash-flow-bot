const fastTrackRaw = [
  { title: 'Спасите лес', description: 'Остановите гибель древних деревьев. Пожертвовав 1 000 акров леса создайте заповедник. Место где можно наслаждаться дикой природой', cost: 7500000 },
  { title: 'Судебный процесс', description: 'Заплатите половину ваших наличных.', expenseBalanceMultiply: 0.5 },
  { title: 'Африканская фото-охота', description: 'Возьмите 6 друзей на дикое сафари. Фотографируя наиболее экзотических животных мира, насладитесь 5-звёздочной роскошью вашей палатки', cost: 3000000 },
  { title: 'Съемка рекламных роликов', cost: 6750000, passiveIncome: 1500000, dice: 4 },
  { title: 'Городская мини-ферма', description: 'Создайте реальную экосистему фермы. Чтобы дети живущие в городе могли изучать животных и растениями, а также учиться ухаживать за ними.', cost: 4500000 },
  { cashFlow: true },
  { title: 'Средиземноморский круиз на частной яхте.', description: 'Посетите тихие гавани Италии и Франции, а так-же скалистой Греции в течении месяца с 12 друзьями.', cost: 3000000 },
  { title: 'Химчистка (2 отделения)', cost: 3000000, passiveIncome: 90000 },
  { title: 'Капиталистический корпус мира', description: 'Основать предпринимательские бизнес школы в странах 3-го мира Преподаватели деловые люди,передающие в дар свои знания и время.', cost: 6000000 },
  { title: 'Био-техническая компания', description: 'Покупайте 500 тыс акций по цене 3 ₽. Если повезет получите 15 млн ₽.', cost: 1500000, cash: 15000000, dice: 5 },
  { title: 'Южные моря, фантастические острова', description: 'Балующие роскошью два месяца отдыха, успокаивающая теплая вода,пустынные берега, романтические ночи.', cost: 3000000 },
  { title: '200 мини хранилищ', cost: 6000000, passiveIncome: 180000 },
  { title: 'Детская библиотека', description: 'Расширьте библиотеку вашего города, посвященную молодым авторам и художникам. Частые посещения знаменитостей искусства, поддерживают вашу работу.', cost: 5250000 },
  { title: 'Франчайзи пиццы (2 отделения)', cost: 6750000, passiveIncome: 210000 },
  { title: 'Кругосветный гольф тур', description: 'Возьмите 3-х друзей в первоклассный 5-ти звёздочный тур для игры на 50 лучших гольф полях мира.', cost: 4500000 },
  { title: '60 жилых домов', cost: 9000000, passiveIncome: 240000 },
  { title: 'Приобрести реактивный самолет', description: 'Имея свой личный самолет, доступный вам в течении года, вы сможете позволить себе оказываться там, где только пожелаете.', cost: 7500000 },
  { title: 'Развод', description: 'Вы теряете все ваши наличные.', expenseBalanceMultiply: 1 },
  { title: 'Спасите океанских млекопитающих', description: 'Профинансируйте и примите участие в исследовательской экспедиции по защите морских животных подвергнутых опасности', cost: 3750000 },
  { title: 'Компания по разработке ПО', description: 'Покупайте 250 тыс акций по цене 3 ₽. Если повезет получите 15 млн ₽.', cost: 750000, cash: 15000000, dice: 4 },
  { title: 'Семь чудес света', description: 'На самолете, теплоходе, велосипеде, верблюдах, каноэ, лимузине к семи чудесам света. Наслаждайтесь поездкой.', cost: 6000000 },
  { cashFlow: true },
  { title: 'Исследовательский центр рака и СПИДа', description: 'Ваши деньги объединят лучших исследователей и докторов в одном месте, специализирующемся на печении этих 2 болезней.', cost: 6750000 },
  { title: 'Магазины футболок (5 торговых точек)', cost: 6000000, passiveIncome: 240000 },
  { title: 'Обед с Президентом', description: 'Закажите стол на 10 персон, чтобы отобедать с Президентом на праздничном балу, посещаемом сановниками со всего мира.', cost: 3000000 },
  { title: 'Российский нефтяной бизнес', cost: 9000000, passiveIncome: 2250000, dice: 4 },
  { title: 'Лыжные курорты в Швейцарских Альпах', description: 'Доставка вертолетом, проживание в средневековом замке, катания на лыжах днем, игры в чарующих ночных клубах ночью.', cost: 4500000 },
  { title: 'Авторемонтная мастерская', cost: 4500000, passiveIncome: 180000 },
  { title: 'Подарок вере...', description: 'Ваша религиозная организация растет. Новостройки необходимы. Вы жертвуете...', cost: 5250000 },
  { title: 'Салоны красоты (3 салона)', cost: 7500000, passiveIncome: 300000 },
  { title: 'Баллотируйтесь в Мэры', description: 'Ваше знание дела побуждает народ предложить вам стать мэром. Вы участвуете в выборах и, конечно, выигрываете. Это начало вашего пути. Дело стоит того.', cost: 3750000 },
  { title: 'Франчайзи птицеводческой фермы', cost: 9000000, passiveIncome: 300000 },
  { title: 'Парк названный в вашу честь', description: 'Разберите брошенный склад и постройте новый парк. Примите в дар полицейский участок для безопасности парка.', cost: 6750000 },
  { title: 'Налоговая ревизия', description: 'Заплатите ревизорам и юристам половину ваших наличных.', expenseBalanceMultiply: 0.5 },
  { title: 'Частная рыбацкая хижина на Озере Штата Монтана', description: 'Порыбачьте в этой отдаленной хижине. Насладитесь 6 месяцами одиночества. В вашем распоряжении гидросамолет.', cost: 3000000 },
  { title: 'Золотой прииск', cost: 4500000, passiveIncome: 750000, dice: 3 },
  { title: 'Каннский кинофестиваль', description: 'Вечеринка со звездами! Совершите поездку по Франции, плюс неделя в Каннах, рядом со знаменитостями и даже исполнителями лучших ролей.', cost: 3750000 },
  { cashFlow: true },
  { title: 'Производство автозапчастей', cost: 4500000, passiveIncome: 150000, dice: 4 },
  { title: 'Парусная регата', description: 'Вы и ваша команда летите в Австралию. Проведите неделю, соревнуясь с самыми быстрыми яхтами мира', cost: 4500000 },
  { title: 'Сервисные службы', cost: 6000000, passiveIncome: 300000, dice: 4 },
  { title: 'Акция милосердия', description: 'За 3 млн ₽ вы можете бросать 1, 2 или 3 кубика при каждом ходе.', cost: 3000000, charity: true },
  { title: 'Рынок акций для детей', description: 'Деловая инвестиция в школу для юных бизнесменов. Школа включает мини фондовую биржу, управляемую студентами.', cost: 3750000 },
  { title: 'Сеть магазинов быстрого обслуживания (3 магазина)', cost: 3600000, passiveIncome: 150000 },
  { title: 'Древние азиатские города', description: 'Частный самолет с гидом на борту доставит вас и 5 друзей в наиболее отдаленные места Азии. В места где прежде не ступала нога туриста.', cost: 4500000 },
  { title: 'Франчайзи кондитерский', cost: 9000000, passiveIncome: 285000 },
  { title: 'Торговля на стадионе', description: 'Лицензируйте 12 продавцов в частных палатках для торговли продуктами и напитками на стадионе вашей любимой команды.', cost: 6000000 },
  { title: 'Сеть фамильных ресторанов', cost: 9000000, passiveIncome: 420000, dice: 4 },
];

/**
 * Преобразует сырой массив fastTrack в формат FAST_TRACK_FIELDS
 * @param {Object} FIELD_TYPES - Типы полей из board.js
 */
function createFastTrackFields(FIELD_TYPES) {
  return fastTrackRaw.map((item, index) => {
    // Генерируем короткий уникальный ID для поля
    const generateFieldId = (type, index) => {
      const typePrefix = {
        [FIELD_TYPES.PAYDAY]: 'pay',
        [FIELD_TYPES.CHARITY]: 'c',
        [FIELD_TYPES.EXPENSES]: 'e',
        [FIELD_TYPES.INVESTING]: 'i',
        [FIELD_TYPES.DREAM]: 'd'
      }[type] || 'u';

      // Для PAYDAY всегда один и тот же ID
      if (type === FIELD_TYPES.PAYDAY) {
        return 'pay';
      }

      // Для других полей - префикс типа + индекс в массиве
      return `${typePrefix}${index}`;
    };

    const fieldId = generateFieldId(item.cashFlow ? FIELD_TYPES.PAYDAY :
                                   item.charity ? FIELD_TYPES.CHARITY :
                                   item.expenseBalanceMultiply !== undefined ? FIELD_TYPES.EXPENSES :
                                   (item.cost !== undefined && item.passiveIncome !== undefined) ? FIELD_TYPES.INVESTING :
                                   (item.cost !== undefined && item.dice !== undefined) ? FIELD_TYPES.INVESTING :
                                   (item.cost !== undefined && item.passiveIncome === undefined) ? FIELD_TYPES.DREAM :
                                   FIELD_TYPES.INVESTING, index, item.title);

    if (item.cashFlow) {
      return {
        id: fieldId,
        type: FIELD_TYPES.PAYDAY,
        name: 'День выплаты',
        title: 'День выплаты',
        description: 'Получите доход от ваших активов и зарплаты.'
      };
    }

    if (item.charity) {
      return {
        id: fieldId,
        type: FIELD_TYPES.CHARITY,
        name: item.title,
        title: item.title,
        description: item.description,
        data: item
      };
    }

    if (item.expenseBalanceMultiply !== undefined) {
      return {
        id: fieldId,
        type: FIELD_TYPES.EXPENSES,
        name: item.title,
        title: item.title,
        description: item.description,
        data: item
      };
    }

    if (item.cost !== undefined && item.passiveIncome !== undefined) {
      return {
        id: fieldId,
        type: FIELD_TYPES.INVESTING,
        name: item.title,
        title: item.title,
        description: item.description,
        data: item
      };
    }

    if (item.cost !== undefined && item.dice !== undefined) {
      return {
        id: fieldId,
        type: FIELD_TYPES.INVESTING,
        name: item.title,
        title: item.title,
        description: item.description,
        data: item
      };
    }

    if (item.cost !== undefined && item.passiveIncome === undefined) {
      return {
        id: fieldId,
        type: FIELD_TYPES.DREAM,
        name: item.title,
        title: item.title,
        description: item.description,
        data: item
      };
    }

    // Fallback
    return {
      id: fieldId,
      type: FIELD_TYPES.INVESTING,
      name: item.title || `Событие ${index + 1}`,
      title: item.title || `Событие ${index + 1}`,
      description: item.description || 'Событие скоростной дорожки.',
      data: item
    };
  });
}

module.exports = { fastTrackRaw, createFastTrackFields };

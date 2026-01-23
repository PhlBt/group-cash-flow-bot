# Handlers - Обработчики команд

## Последние изменения

### Версия [текущая]
- **Глобальная проверка перехода на Fast Track**: Добавлена проверка `nextTurnResult.transitioned` во всех местах вызова `gameService.nextTurn()` в handlers (callbacks.js, miscellaneous.js, charity.js, market.js, deals.js). Теперь сообщение о переходе на скоростную дорожку отправляется автоматически при передаче хода любому игроку
- **Новая функция sendFastTrackTransitionMessage**: Добавлена в MessageService функция для отправки поздравительного сообщения о переходе на скоростную дорожку
- **Исправление ошибки ReferenceError в handleRollDice**: Устранено повторное объявление переменной `game` в блоке обработки поля "Ребенок", вызывавшее ошибку "Cannot access 'game' before initialization"
- **Добавление поля "Благотворительность"**: Реализована логика попадания на поле благотворительности с выбором: пожертвовать 10% дохода и получить бонус на 3 хода (возможность бросать 1 или 2 кубика), или пропустить ход
- **Новый модуль charity.js**: Добавлены обработчики handleCharity, handleDonateCharity, handleSkipCharity для управления благотворительностью
- **Обновление клавиатур**: Добавлена charityChoiceKeyboard с кнопками выбора действия на поле благотворительности
- **Изменение текста кнопки в waitingRoomKeyboard**: Кнопка "🎮 Играть!" заменена на "🎮 Присоединиться к игре"
- **Изменение логики комнаты ожидания**: При присоединении нового игрока к игре теперь всегда удаляется старое сообщение комнаты ожидания и отправляется новое, вместо обновления существующего сообщения
- **Добавление механизма предложения сделок другим игрокам**: Реализован механизм предложения сделок с комиссией через кнопку "👥 Предложить другому" для сделок с canSellToOthers: true
- **Новые обработчики в callbacks.js**: Добавлены функции handleOfferDeal, handleSelectCommission, handleSelectUser, handleCancelOffer для управления предложениями сделок
- **Обновление логики miscellaneous карт**: Для карт с `credit: true` теперь сразу показываются две кнопки оплаты: наличными и кредитной картой
- **Обновление generateMiscellaneousKeyboard**: Добавлена логика генерации клавиатуры с кнопкой "💳 Кредитная карта" для карт с поддержкой кредита
- **Добавление поля "Безработица"**: Реализована логика попадания на поле безработицы с обязательной оплатой общих расходов и пропуском 2 ходов
- **Новые обработчики в callbacks.js**: Добавлены функции handlePayDismissal, handlePayDismissalCreditCard для оплаты расходов на поле безработицы
- **Обновление клавиатур**: Добавлена generateDismissalKeyboard с кнопкой оплаты расходов
- **Изменение логики циркуляции карт рынка**: Циркуляция теперь завершается только после выбора всех игроков, а не при первой продаже. Добавлено уведомление о переходе очереди к следующему игроку
- **Обновление sendMarketCardWithSellOptions**: Добавлен параметр customTitle для кастомного заголовка в сообщении

## Назначение и архитектура модуля

Handlers - модуль функций-обработчиков команд Telegram бота, разделенный на специализированные файлы для лучшей поддерживаемости. Отвечает за:

- Парсинг и валидацию входящих данных из сообщений Telegram
- Координацию между gameService и messageService
- Обработку ошибок и исключений
- Формирование ответов пользователю
- Управление началом игровых сессий

Архитектурно модуль состоит из нескольких файлов:
- **index.js**: Главный экспорт всех обработчиков
- **commands.js**: Обработчики команд бота (/start, /help, /newgame и т.д.)
- **callbacks.js**: Обработчики callback-запросов от inline кнопок
- **deals.js**: Логика обработки инвестиционных сделок
- **miscellaneous.js**: Обработка miscellaneous карт
- **charity.js**: Обработка поля благотворительности
- **market.js**: Обработка поля "Рынок"
- **profile.js**: Профиль игрока и статистика

Каждый файл:
- Экспортирует функции-обработчики для соответствующих команд
- Принимает объект services с messageService и gameService
- Использует асинхронные функции для всех операций
- Обеспечивает разделение логики обработки команд от Telegram API

### index.js - Главный экспорт обработчиков

Экспортирует все обработчики из других модулей для удобного импорта в main.js:

**Команды:**
- handleStart, handleHelp, handleNewGame, handlePlay, handleEndGame

**Callbacks:**
- handleCallbackQuery, handleRollDice, handleEndGameVote
- handleOfferDeal, handleSelectCommission, handleSelectUser, handleCancelOffer
- handleSellAsset, handlePayLiability, handleAssetsPage, handleCreditsPage
- handlePayDismissal, handlePayDismissalCreditCard

**Сделки:**
- handleDealType, handleBuyDeal, handleSkipDeal, handleBuyDealWithCreditCard
- handleChangeQuantity, handleSellStocks, handlePayExpenses

**Профиль:**
- handleProfile, handleStats, handleAssets, handleCredits

## Структура модулей

### commands.js - Обработчики команд бота

#### handleStart(msg, services)
- **Назначение**: Обработка команды /start - приветствие пользователя
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { messageService, gameService }
- **Функционал**:
  - Извлекает chatId и userName из сообщения
  - Вызывает messageService.sendWelcomeMessage() для отправки приветствия

### handleHelp(msg, services)
- **Назначение**: Обработка команды /help - показ справки
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { messageService, gameService }
- **Функционал**:
  - Извлекает chatId из сообщения
  - Вызывает messageService.sendHelpMessage() для отправки справки

### handleNewGame(msg, services)
- **Назначение**: Обработка команды /newgame - создание новой игры
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { messageService, gameService }
- **Функционал**:
  - Извлекает chatId и userId из сообщения
  - Вызывает gameService.createGame() для создания игры
  - В случае успеха вызывает messageService.sendGameCreatedMessage()
  - В случае ошибки вызывает messageService.sendGameCreationErrorMessage()

### handlePlay(msg, match, services)
- **Назначение**: Обработка команды /play - начало игры
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `match` (Array): Результат парсинга команды (match[1] = gameId)
  - `services` (Object): Объект с сервисами { messageService, gameService }
- **Функционал**:
  - Извлекает chatId, userId из сообщения, gameId из match
  - Валидирует gameId (проверка на пустоту перед передачей в gameService)
  - Вызывает gameService.startGame() для начала игры
  - В случае успеха вызывает messageService.sendPlaySuccessMessage()
  - В случае ошибки вызывает messageService.sendPlayErrorMessage() с соответствующим кодом

### handleEndGame(msg, services)
- **Назначение**: Обработка команды /endgame - окончание игры
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Извлекает chatId, userId из сообщения
  - Находит активную игру пользователя
  - Если игроков меньше 3 - сразу завершает игру через gameService.finishGame() и messageService.sendGameFinishedMessage()
  - Если игроков 3 и больше - инициирует голосование: отправляет сообщение через messageService.sendEndGameVoteMessage(), сохраняет messageId через gameService.initiateEndGameVote()
  - Обрабатывает ошибки через messageService.sendEndGameErrorMessage()

### handleLeave(msg, services)
- **Назначение**: Обработка команды /leave - выход игрока из активной игры
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Извлекает chatId и userId из сообщения
  - Находит активную игру пользователя в чате
  - Удаляет игрока из игры через gameService.removePlayerFromGame()
  - Отправляет подтверждение выхода в чат
  - Проверяет, завершилась ли игра после выхода

### handleRules(msg, services)
- **Назначение**: Обработка команды /rules - показ правил игры
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { messageService }
- **Функционал**:
  - Извлекает chatId из сообщения
  - Вызывает messageService.sendRulesMessage() для отправки правил игры

### handleVoteKick(msg, services)
- **Назначение**: Обработка команды /votekick - голосование за исключение игрока
- **Параметры**:
  - `msg` (Object): Сообщение Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Извлекает chatId, userId из сообщения
  - Находит активную игру в чате
  - Проверяет, что игроков минимум 3 и пользователь участник игры
  - Инициирует голосование через messageService.sendKickVoteMessage() и gameService.initiateKickVote()
  - Обрабатывает ошибки через messageService.sendErrorMessage()

### callbacks.js - Обработчики callback-запросов

#### handleEndGameVote(query, services)
- **Назначение**: Обработка голосования за окончание игры
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService, bot }
- **Функционал**:
  - Извлекает chatId, userId из query
  - Находит активную игру в чате
  - Вызывает gameService.voteToEndGame() для голосования
  - Обновляет сообщение через messageService.updateEndGameVoteMessage()
  - Если достигнуто majority - завершает игру через gameService.finishGame() и messageService.sendGameFinishedMessage()
  - Обрабатывает ошибки через messageService.sendEndGameErrorMessage()

### handleRollDice(query, diceCount, services)
- **Назначение**: Обработка броска кубика и перемещения игрока
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `diceCount` (number): Количество кубиков (1 или 2)
  - `services` (Object): Объект с сервисами { gameService, messageService, bot }
- **Функционал**:
  - Удаляет сообщение с кнопкой "Бросить кубик" через messageService.deleteMessage()
  - Извлекает chatId, userId из query
  - Находит активную игру в чате
  - Проверяет, что пользователь - текущий игрок
  - Бросает кубик(и) через gameService.rollDice()
  - Перемещает игрока через gameService.movePlayer() и получает события PAYDAY
  - Проверяет тип поля назначения:
    - **Обычное поле**: Отправляет комбинированное сообщение и передает ход следующему игроку
    - **Поле "Сделки" (DEAL)**: Отправляет комбинированное сообщение и показывает выбор типа сделки
    - **Поле "Ребенок" (CHILD)**: Обрабатывает рождение ребенка через gameService.processChildBirth(), получает обновленные данные игрока, отправляет комбинированное сообщение и автоматически передает ход следующему игроку
    - **Поле "Miscellaneous" (MISCELLANEOUS)**: Обрабатывает miscellaneous карту, показывает комбинированное сообщение и ждет оплаты
    - **Поле "Благотворительность" (CHARITY)**: Показывает выбор действия на поле благотворительности
    - **Поле "Безработица" (DISMISSAL)**: Показывает комбинированное сообщение и ждет оплаты расходов
  - Уменьшает счетчик благотворительности через gameService.decreaseCharityTurns() (если активен)
  - **Передает ход следующему игроку** через gameService.nextTurn()
  - **Проверяет автоматический переход на Fast Track** для нового игрока - если transitioned = true, отправляет поздравительное сообщение через messageService.sendFastTrackTransitionMessage()
  - Показывает ход новому игроку через messageService.sendPlayerTurnMessage()
  - Обрабатывает ошибки через messageService.sendErrorMessage()

### handleCallbackQuery(query, services)
- **Назначение**: Обработка callback_query от inline кнопок
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { messageService, gameService, bot }
- **Функционал**:
  - Извлекает chatId, userId из query, data из query.data
  - Подтверждает получение callback с bot.answerCallbackQuery()
  - В зависимости от data:
    - 'play': Удаляет сообщение с кнопками через messageService.deleteMessage(). Проверяет наличие активной игры для chatId через gameService.getActiveGameByChatId(). Если есть - присоединяет пользователя через gameService.joinGame(), отправляет карточку игрока через messageService.sendPlayerCard(), удаляет старое сообщение комнаты ожидания (если есть) через messageService.deleteMessage() и отправляет новое через messageService.sendWaitingRoomMessage(), сохраняет ID через gameService.setWaitingMessageId(). Иначе создает новую игру через gameService.createGame(), отправляет карточку игрока создателю через messageService.sendPlayerCard(), отправляет сообщение комнаты ожидания через messageService.sendWaitingRoomMessage() и сохраняет ID через gameService.setWaitingMessageId()
    - 'start_game': Находит активную игру в чате через gameService.getActiveGameByChatId(), проверяет, что пользователь является создателем, удаляет сообщение с кнопками через messageService.deleteMessage(), вызывает gameService.startGame(), в случае успеха начинает игру с первого игрока через messageService.sendPlayerTurnMessage()
    - 'rules': Отправляет правила через messageService.sendRulesMessage()
    - 'help': Отправляет справку через messageService.sendHelpMessage()
    - 'roll_dice': Вызывает handleRollDice() с 1 кубиком
    - 'roll_dice_1': Вызывает handleRollDice() с 1 кубиком (режим благотворительности)
    - 'roll_dice_2': Вызывает handleRollDice() с 2 кубиками (режим благотворительности)
    - 'end_game_vote': Вызывает handleEndGameVote() для обработки голосования
    - 'small_deal': Вызывает handleDealType() для выбора мелкой сделки
    - 'big_deal': Вызывает handleDealType() для выбора крупной сделки
    - 'buy_deal': Вызывает handleBuyDeal() для покупки сделки
    - 'offer_deal': Вызывает handleOfferDeal() для начала предложения сделки другому игроку
    - 'select_commission_*': Вызывает handleSelectCommission() для выбора комиссии
    - 'select_user_*': Вызывает handleSelectUser() для выбора игрока для предложения
    - 'cancel_offer': Вызывает handleCancelOffer() для отмены предложения
    - 'skip_deal': Вызывает handleSkipDeal() для пропуска сделки
    - 'pay_miscellaneous': Вызывает handlePayMiscellaneous() для оплаты miscellaneous наличными
    - 'pay_miscellaneous_credit_card': Вызывает handlePayMiscellaneousCreditCard() для оплаты miscellaneous кредитной картой
    - 'skip_miscellaneous': Вызывает handleSkipMiscellaneous() для пропуска miscellaneous
  - Обрабатывает ошибки и отправляет сообщение об ошибке пользователю

#### handleOfferDeal(query, services)
- **Назначение**: Обработка начала предложения сделки другому игроку
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет существование активной игры и что пользователь - текущий игрок
  - Проверяет, что сделка поддерживает предложения (canSellToOthers)
  - Инициализирует состояние предложения через dealOffer.initializeDealOffer()
  - Обновляет сообщение с выбором комиссии

#### handleSelectCommission(query, commission, services)
- **Назначение**: Обработка выбора комиссии для предложения сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `commission` (number): Выбранная комиссия (%)
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Обрабатывает выбор комиссии через dealOffer.processOfferStep()
  - Обновляет состояние предложения на 'select_user'
  - Показывает клавиатуру выбора игрока

#### handleSelectUser(query, targetUserId, services)
- **Назначение**: Обработка выбора игрока для предложения сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `targetUserId` (string): ID выбранного игрока
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Обрабатывает выбор игрока через dealOffer.processOfferStep()
  - Создает предложение сделки с комиссией
  - Отправляет карточку сделки выбранному игроку
  - Передает ход следующему игроку

#### handleCancelOffer(query, services)
- **Назначение**: Обработка отмены предложения сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Очищает состояние предложения через dealOffer.processOfferStep()
  - Возвращает к обычному виду карточки сделки

### deals.js - Логика обработки сделок

#### handleDealType(query, dealType, services)
- **Назначение**: Обработка выбора типа сделки (мелкая/крупная)
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `dealType` (string): Тип сделки ('small' или 'big')
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с выбором типа сделки
  - Фильтрует доступные карты по использованным ID (usedBigDealIds/usedSmallDealIds)
  - Если доступных карт нет - очищает массив использованных и фильтрует заново
  - Выбирает случайную карту из доступных, добавляет её ID в использованные
  - Сохраняет текущую сделку в состоянии игры
  - Отправляет карточку сделки через messageService.sendDealCardMessage()

### handleBuyDeal(query, services)
- **Назначение**: Обработка покупки сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает сохраненную сделку из состояния игры
  - Определяет тип сделки и вызывает соответствующий метод (buySmallDeal/buyBigDeal)
  - В случае успеха: удаляет карточку, отправляет подтверждение, передает ход следующему игроку
  - В случае ошибки: сообщает о недостатке средств или предлагает кредитку

### handleSkipDeal(query, services)
- **Назначение**: Обработка пропуска сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с карточкой сделки
  - Отправляет сообщение о пропуске
  - Передает ход следующему игроку через gameService.nextTurn()

### handleBuyDealWithCreditCard(query, services)
- **Назначение**: Обработка покупки сделки кредитной картой
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает сохраненную сделку из состояния игры
  - Вызывает gameService.buyDealWithCreditCard() для покупки
  - В случае успеха: удаляет сообщение, отправляет подтверждение, передает ход следующему игроку
  - В случае ошибки: отправляет сообщение об ошибке

### handleChangeQuantity(query, delta, services)
- **Назначение**: Обработка изменения количества для unlimitedStocks сделок
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `delta` (number): Изменение количества (+1, -1, +10, -10, +100, -100)
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает текущую сделку и проверяет, что она поддерживает unlimitedStocks
  - Вычисляет новое количество с учетом ограничений (минимум 1)
  - Сохраняет новое количество через databaseService.setCurrentDealQuantity()
  - Обновляет сообщение с карточкой сделки новыми данными

### handleSellStocks(query, services)
- **Назначение**: Обработка продажи акций
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает текущую сделку и проверяет, что она поддерживает продажу акций
  - Вызывает gameService.sellStocks() для продажи
  - В случае успеха: удаляет сообщение, отправляет подтверждение, передает ход следующему игроку
  - В случае ошибки: отправляет сообщение об ошибке

### handlePayExpenses(query, services)
- **Назначение**: Обработка оплаты расходов
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает текущую сделку и проверяет, что она требует оплаты расходов
  - Проверяет наличие недвижимости у игрока
  - Вызывает gameService.payExpenses() для оплаты
  - В случае успеха: удаляет сообщение, отправляет подтверждение, передает ход следующему игроку
  - В случае недостатка средств: предлагает оплату кредиткой

### profile.js - Профиль игрока и статистика

#### handleProfile(query, services)
- **Назначение**: Обработка запроса профиля игрока
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService, userStatsService }
- **Функционал**:
  - Находит активную игру в чате
  - Находит игрока по userId
  - Получает статистику пользователя через userStatsService
  - Вызывает messageService.sendPlayerProfileMessage() для отправки профиля с кнопками активов/кредитов и статистикой

### handleStats(query, services)
- **Назначение**: Обработка запроса статистики игры
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Находит активную игру в чате
  - Вызывает messageService.sendGameStatsMessage() для отправки статистики всех игроков

### handleAssets(query, services)
- **Назначение**: Обработка запроса активов игрока
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Находит активную игру в чате
  - Находит игрока по userId
  - Форматирует и отправляет список всех активов игрока через messageService.sendPlayerAssetsMessage()

### handleCredits(query, services)
- **Назначение**: Обработка запроса кредитов игрока
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Находит активную игру в чате
  - Находит игрока по userId
  - Форматирует и отправляет информацию о кредитах игрока через messageService.sendPlayerCreditsMessage()

### miscellaneous.js - Обработка miscellaneous карт

#### handleMiscellaneous(gameId, userId, services)
- **Назначение**: Обработка попадания игрока на поле miscellaneous
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Выбирает случайную неиспользованную miscellaneous карту
  - Сохраняет карту в состоянии игры
  - Возвращает объект карты для использования в сообщениях

#### handlePayMiscellaneous(query, services)
- **Назначение**: Обработка оплаты miscellaneous наличными
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает сохраненную miscellaneous карту
  - Проверяет условия (hasKids для семейных карт)
  - Для карт с credit: true вызывает buyMiscellaneousWithCredit
  - Для обычных карт вызывает payMiscellaneousExpenses
  - В случае недостатка средств для credit карт предлагает оплату кредиткой
  - В случае успеха передает ход следующему игроку

#### handlePayMiscellaneousCreditCard(query, services)
- **Назначение**: Обработка оплаты miscellaneous кредитной картой
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает сохраненную miscellaneous карту
  - Вызывает payMiscellaneousWithCreditCard для оплаты
  - В случае успеха передает ход следующему игроку

#### handleSkipMiscellaneous(query, services)
- **Назначение**: Обработка пропуска miscellaneous карты
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с карточкой
  - Отправляет сообщение о пропуске
  - Передает ход следующему игроку

### fastTrack.js - Обработка полей скоростной дорожки

#### handleFastTrack(gameId, userId, fieldData, services)
- **Назначение**: Обрабатывает попадание игрока на поле fastTrack
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `fieldData` (Object): Данные поля fastTrack
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Сохраняет fastTrack событие в состоянии игры через gameService.setCurrentFastTrack()

#### handlePayFastTrack(query, services)
- **Назначение**: Обрабатывает оплату fastTrack события
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Получает сохраненное fastTrack событие
  - Обрабатывает разные типы событий: расходы, инвестиции, получение наличных, благотворительность, рискованные события
  - Выполняет соответствующие действия (оплата, покупка активов, получение денег, активация эффектов)
  - Передает ход следующему игроку

#### handleRollDiceFastTrack(query, services)
- **Назначение**: Обрабатывает бросок кубика для fastTrack события
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Бросает кубик и проверяет успех
  - При успехе применяет награду (наличные или пассивный доход)
  - Передает ход следующему игроку

#### handleSkipFastTrack(query, services)
- **Назначение**: Обрабатывает пропуск fastTrack события
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Пропускает событие без действий
  - Передает ход следующему игроку

### market.js - Обработка поля "Рынок"

#### handleMarket(gameId, userId, services)
- **Назначение**: Обработка попадания игрока на поле "Рынок"
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Выбирает случайную market карточку с трекингом использованных
  - Применяет автоматические эффекты (passiveIncome)
  - Инициализирует циркуляцию для эффектов продажи
  - Возвращает объект market карточки для отображения

#### handleSkipMarket(query, services)
- **Назначение**: Обработка пропуска market события
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с market карточкой
  - Переходит к следующему игроку в циркуляции

#### handleSellMarketAsset(query, assetIndex, services)
- **Назначение**: Обработка продажи актива по market цене
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `assetIndex` (number): Индекс актива в списке подходящих
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Получает market карточку из состояния игры
  - Находит подходящий актив игрока по индексу
  - Рассчитывает цену продажи по типу market эффекта
  - Продает актив и обновляет финансы игрока
  - Переходит к следующему игроку в циркуляции

#### sendMarketCardWithSellOptions(chatId, marketCard, player, game, customTitle)
- **Назначение**: Отправляет market карточку с опциями продажи активов
- **Параметры**:
  - `chatId` (number): ID чата
  - `marketCard` (Object): Market карточка
  - `player` (Object): Объект игрока
  - `game` (Object): Объект игры
  - `customTitle` (string, опционально): Кастомный заголовок для уведомления о переходе очереди
- **Функционал**:
  - Формирует сообщение с информацией о market карточке
  - Добавляет кастомный заголовок если передан (для уведомления о переходе очереди)
  - Показывает подходящие активы игрока с кнопками продажи
  - Всегда добавляет кнопку "Пропустить"
  - Отправляет сообщение с inline клавиатурой

### charity.js - Обработка поля благотворительности

#### handleCharity(gameId, userId, services)
- **Назначение**: Обработка попадания игрока на поле благотворительности
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет существование игры и что пользователь - текущий игрок
  - Отправляет комбинированное сообщение с выбором действия на поле благотворительности
  - Не передает ход следующему игроку - ждет выбора пользователя

#### handleDonateCharity(query, services)
- **Назначение**: Обработка пожертвования на благотворительность
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Вызывает gameService.donateCharity() для пожертвования 10% дохода
  - Удаляет сообщение с выбором действия
  - Отправляет подтверждение с информацией о пожертвовании и бонусе
  - Передает ход следующему игроку

#### handleSkipCharity(query, services)
- **Назначение**: Обработка пропуска благотворительности
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с выбором действия
  - Отправляет сообщение о пропуске
  - Передает ход следующему игроку

## Бизнес-правила и проверки

### Общие правила обработки команд
- Все функции принимают объект services для доступа к сервисам
- Каждая функция отвечает за одну команду
- Ошибки логируются в консоль с префиксом названия функции
- Все операции асинхронны и используют await

### Правила валидации данных
- **handleStart**: userName по умолчанию 'игрок' если не указан
- **handleHelp**: Только извлечение chatId, дополнительных проверок нет
- **handleNewGame**: userId обязателен (из msg.from.id)
- **handlePlay**: gameId валидируется на пустоту перед передачей в gameService

### Обработка ошибок
- Исключения в gameService перехватываются и обрабатываются
- Пользователь получает понятные сообщения об ошибках
- Технические ошибки логируются для отладки
- Критические ошибки не должны ломать работу бота

### Архитектурные принципы
- Handlers не знают о структуре базы данных
- Handlers не формируют текст сообщений (делегируют messageService)
- Handlers не реализуют бизнес-логику игры (делегируют gameService)
- Handlers обеспечивают поток управления между сервисами

# Handlers - Обработчики команд

## Назначение и архитектура сервиса

Handlers - модуль функций-обработчиков команд Telegram бота. Отвечает за:

- Парсинг и валидацию входящих данных из сообщений Telegram
- Координацию между gameService и messageService
- Обработку ошибок и исключений
- Формирование ответов пользователю
- Управление началом игровых сессий

Архитектурно модуль:
- Экспортирует функции-обработчики для каждой команды
- Принимает объект services с messageService и gameService
- Использует асинхронные функции для всех операций
- Обеспечивает разделение логики обработки команд от Telegram API

## Методы с их функционалом

### handleStart(msg, services)
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
  - `services` (Object): Объект с сервисами { messageService, gameService }
- **Функционал**:
  - Извлекает chatId, userId из сообщения
  - Находит активную игру пользователя
  - Если игрок один - сразу завершает игру через gameService.finishGame() и messageService.sendGameFinishedMessage()
  - Если игроков много - инициирует голосование: отправляет сообщение через messageService.sendEndGameVoteMessage(), сохраняет messageId через gameService.initiateEndGameVote()
  - Обрабатывает ошибки через messageService.sendEndGameErrorMessage()

### handleEndGameVote(query, services)
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
  - Уменьшает счетчик благотворительности через gameService.decreaseCharityTurns() (если активен)
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
    - 'play': Удаляет сообщение с кнопками через messageService.deleteMessage(). Проверяет наличие активной игры для chatId через gameService.getActiveGameByChatId(). Если есть - присоединяет пользователя через gameService.joinGame(), отправляет карточку игрока через messageService.sendPlayerCard(), удаляет старое сообщение комнаты ожидания (если есть) и отправляет новое через messageService.sendWaitingRoomMessage(), сохраняет ID через gameService.setWaitingMessageId(). Иначе создает новую игру через gameService.createGame(), отправляет карточку игрока создателю через messageService.sendPlayerCard(), отправляет сообщение комнаты ожидания через messageService.sendWaitingRoomMessage() и сохраняет ID через gameService.setWaitingMessageId()
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
    - 'offer_deal': Отправляет заглушку (функция не реализована)
    - 'skip_deal': Вызывает handleSkipDeal() для пропуска сделки
  - Обрабатывает ошибки и отправляет сообщение об ошибке пользователю

### handleDealType(query, dealType, services)
- **Назначение**: Обработка выбора типа сделки (мелкая/крупная)
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `dealType` (string): Тип сделки ('small' или 'big')
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Удаляет сообщение с выбором типа сделки
  - Генерирует случайную сделку выбранного типа
  - Отправляет карточку сделки через messageService.sendDealCardMessage()

### handleBuyDeal(query, services)
- **Назначение**: Обработка покупки сделки
- **Параметры**:
  - `query` (Object): Callback query от Telegram
  - `services` (Object): Объект с сервисами { gameService, messageService }
- **Функционал**:
  - Проверяет, что пользователь - текущий игрок
  - Определяет тип сделки по содержимому сообщения
  - Генерирует объект сделки (временная заглушка)
  - Вызывает gameService.buySmallDeal() или gameService.buyBigDeal()
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

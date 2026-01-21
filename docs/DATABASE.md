# DatabaseService - Сервис работы с базой данных

## Назначение и архитектура сервиса

DatabaseService - это класс, отвечающий за все взаимодействие с базой данных MongoDB в Telegram боте CashFlow. Сервис инкапсулирует:

- Подключение к MongoDB
- Управление соединением с базой данных
- Все CRUD операции с коллекциями
- Обеспечение доступа к коллекциям для других сервисов

Архитектурно сервис:
- Использует официальный MongoDB Node.js драйвер
- Предоставляет асинхронные методы для всех операций
- Реализует паттерн Singleton для управления соединением
- Содержит бизнес-логику работы с данными
- Возвращает структурированные результаты операций

## Методы подключения

### connect()
- **Назначение**: Устанавливает соединение с MongoDB
- **Параметры**: Нет
- **Возвращает**: Promise<void>
- **Функционал**:
  - Создает клиента MongoDB с указанным URL
  - Подключается к базе данных
  - Сохраняет ссылку на базу данных
  - Логирует успешное подключение

### getDb()
- **Назначение**: Возвращает экземпляр базы данных
- **Параметры**: Нет
- **Возвращает**: Db - экземпляр MongoDB базы данных
- **Функционал**:
  - Проверяет, установлено ли соединение
  - Возвращает ссылку на базу данных или выбрасывает ошибку

### getCollection(collectionName)
- **Назначение**: Возвращает коллекцию по имени
- **Параметры**:
  - `collectionName` (string): Имя коллекции
- **Возвращает**: Collection - коллекция MongoDB
- **Функционал**:
  - Получает базу данных через getDb()
  - Возвращает указанную коллекцию

### close()
- **Назначение**: Закрывает соединение с базой данных
- **Параметры**: Нет
- **Возвращает**: Promise<void>
- **Функционал**:
  - Закрывает клиент MongoDB
  - Логирует закрытие соединения

## Структура данных

### Документ игры (коллекция 'games')
Все денежные суммы в рублях по курсу 1$ = 30₽.
```javascript
{
  gameId: "string", // Уникальный ID игры
  chatId: "string", // ID чата Telegram
  creatorId: "string", // ID создателя игры
  players: [
    {
      userId: "string", // ID пользователя Telegram
      username: "string", // Имя пользователя
      profession: "string", // Название профессии
      cash: number, // Денежные средства (руб.)
      salary: number, // Зарплата (руб.)
      expenses: number, // Базовые расходы без кредитов (руб.)
      childrenCount: number, // Количество детей
      childrenExpenses: number, // Расходы на детей (руб.)
      passiveIncome: number, // Пассивный доход (руб.)
      totalIncome: number, // Общий доход (руб.)
      totalExpenses: number, // Общие расходы включая кредиты (руб.)
      cashFlow: number, // Денежный поток (руб.)
      assets: Array, // Массив активов игрока
      assetsCount: number, // Количество активов
      liabilities: Array, // Массив пассивов/кредитов игрока (включая начальные кредиты профессии)
      loansCount: number, // Количество кредитов
      totalLoans: number, // Общая сумма кредитов (руб.)
      totalLoanPayments: number, // Платежи по кредитам (руб.)
      kidCost: number, // Расходы на детей по профессии (руб.)
      position: number, // Позиция игрока (0-based)
      inFastTrack: boolean, // Находится ли на скоростной дорожке
      fastTrackCash: number, // Капитал на скоростной дорожке (руб.)
      fastTrackIncome: number, // Доход на скоростной дорожке (руб.)
      dreamCost: number // Стоимость мечты (руб.)
    }
  ],
  status: "waiting|active|finished", // Статус игры
  createdAt: Date, // Время создания
  startedAt: Date, // Время начала (опционально)
  finishedAt: Date, // Время завершения (опционально)
  endGameVotes: ["string"], // Массив ID пользователей, проголосовавших за окончание
  endGameMessageId: number, // ID сообщения голосования за окончание (опционально)
  waitingMessageId: number, // ID сообщения комнаты ожидания (опционально)
  usedBigDealIds: Array, // ID выданных крупных сделок
  usedSmallDealIds: Array, // ID выданных мелких сделок
  currentMarket: Object, // Текущая market карточка (опционально)
  usedMarketIds: Array, // Названия использованных market карточек
  marketCirculationPlayers: Array, // ID игроков для циркуляции market
  marketCirculationIndex: number, // Текущий индекс в циркуляции market
  marketCirculationOriginalIndex: number // Оригинальный индекс циркуляции market
}
```

## Структура данных

### Документ статистики пользователя (коллекция 'userStats')
```javascript
{
  userId: "string",     // ID пользователя Telegram
  username: "string",   // Имя пользователя
  totalGames: number,   // Общее количество сыгранных игр
  wins: number,         // Количество побед
  losses: number,       // Количество поражений
  createdAt: Date,      // Дата создания записи
  updatedAt: Date       // Дата последнего обновления
}
```

## Методы работы с играми

### createGame(chatId, userId, username)
- **Назначение**: Создает новую игровую сессию
- **Параметры**:
  - `chatId` (string): ID чата
  - `userId` (string): ID пользователя-создателя игры
  - `username` (string): Имя пользователя
- **Возвращает**: Promise<string> - ID созданной игры
- **Функционал**:
  - Генерирует уникальный ID игры на основе timestamp
  - Генерирует случайную профессию для создателя
  - Создает объект игрока с начальными данными
  - Создает документ игры в коллекции 'games' с массивом players
  - Устанавливает статус 'waiting' и время создания

### joinGame(userId, gameId, username)
- **Назначение**: Присоединяет игрока к существующей игре
- **Параметры**:
  - `userId` (string): ID игрока
  - `gameId` (string): ID игры
  - `username` (string): Имя пользователя
- **Возвращает**: Promise<{success: boolean, error?: string, player?: Object}> - результат операции
- **Функционал**:
  - Ищет игру по ID в коллекции 'games'
  - Проверяет существование игры
  - Проверяет, не присоединился ли уже игрок
  - Проверяет статус игры ('waiting')
  - Генерирует случайную профессию для игрока
  - Создает объект игрока с начальными данными
  - Добавляет объект игрока в массив players
  - Возвращает объект игрока в случае успеха

### getGame(gameId)
- **Назначение**: Получает информацию об игре
- **Параметры**:
  - `gameId` (string): ID игры
- **Возвращает**: Promise<Object|null> - документ игры или null
- **Функционал**:
  - Ищет игру по ID в коллекции 'games'
  - Возвращает полный документ игры

### startGame(userId, gameId)
- **Назначение**: Начинает игру (меняет статус на 'active')
- **Параметры**:
  - `userId` (string): ID пользователя (должен быть создателем)
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Ищет игру по ID в коллекции 'games'
  - Проверяет существование игры
  - Проверяет права создателя
  - Проверяет статус 'waiting'
  - Обновляет статус на 'active' и добавляет время начала

### getUserGames(userId)
- **Назначение**: Получает активные игры пользователя
- **Параметры**:
  - `userId` (string): ID пользователя
- **Возвращает**: Promise<Array> - массив документов игр
- **Функционал**:
  - Ищет игры где пользователь в массиве players
  - Фильтрует по статусам 'waiting' и 'active'
  - Возвращает массив найденных игр

### getActiveGameByChatId(chatId)
- **Назначение**: Получает активную игру для чата
- **Параметры**:
  - `chatId` (string): ID чата
- **Возвращает**: Promise<Object|null> - документ игры или null
- **Функционал**:
  - Ищет игру в чате со статусом 'waiting' или 'active'
  - Возвращает найденную игру

### initiateEndGameVote(userId, gameId, messageId)
- **Назначение**: Инициирует голосование за окончание игры
- **Параметры**:
  - `userId` (string): ID пользователя
  - `gameId` (string): ID игры
  - `messageId` (number): ID сообщения голосования
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Проверяет существование игры и статус
  - Проверяет, что пользователь участник
  - Сохраняет массив голосов [userId] и messageId

### voteToEndGame(userId, gameId)
- **Назначение**: Голосует за окончание игры
- **Параметры**:
  - `userId` (string): ID пользователя
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string, shouldFinish?: boolean}> - результат операции
- **Функционал**:
  - Проверяет существование игры и статус
  - Проверяет, что пользователь участник и не голосовал
  - Добавляет голос, проверяет majority (>50% игроков)

### finishGame(gameId)
- **Назначение**: Завершает игру
- **Параметры**:
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Меняет статус на 'finished', добавляет время завершения

### setWaitingMessageId(gameId, messageId)
- **Назначение**: Устанавливает ID сообщения комнаты ожидания
- **Параметры**:
  - `gameId` (string): ID игры
  - `messageId` (number): ID сообщения
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет ID сообщения комнаты ожидания для возможности его удаления

### setUsedBigDealIds(gameId, usedIds)
- **Назначение**: Устанавливает массив использованных ID крупных сделок
- **Параметры**:
  - `gameId` (string): ID игры
  - `usedIds` (Array<string>): Массив использованных ID
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет массив ID выданных крупных сделок для предотвращения дубликатов

### setUsedSmallDealIds(gameId, usedIds)
- **Назначение**: Устанавливает массив использованных ID мелких сделок
- **Параметры**:
  - `gameId` (string): ID игры
  - `usedIds` (Array<string>): Массив использованных ID
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет массив ID выданных мелких сделок для предотвращения дубликатов

### setCurrentMarket(gameId, marketCard)
- **Назначение**: Устанавливает текущую market карточку
- **Параметры**:
  - `gameId` (string): ID игры
  - `marketCard` (Object): Объект market карточки
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет объект текущей market карточки в состоянии игры

### setUsedMarketIds(gameId, usedIds)
- **Назначение**: Устанавливает массив использованных названий market карточек
- **Параметры**:
  - `gameId` (string): ID игры
  - `usedIds` (Array<string>): Массив использованных названий
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет массив названий выданных market карточек для предотвращения повторений

### setMarketCirculationPlayers(gameId, players)
- **Назначение**: Устанавливает список игроков для циркуляции market события
- **Параметры**:
  - `gameId` (string): ID игры
  - `players` (Array<string>): Массив ID игроков
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет массив ID игроков, которые могут взаимодействовать с market карточкой

### setMarketCirculationIndex(gameId, index)
- **Назначение**: Устанавливает текущий индекс в циркуляции market
- **Параметры**:
  - `gameId` (string): ID игры
  - `index` (number): Индекс циркуляции
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет текущий индекс игрока в очереди циркуляции

### incrementMarketCirculationIndex(gameId)
- **Назначение**: Увеличивает индекс циркуляции market
- **Параметры**:
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string, completed?: boolean}> - результат операции
- **Функционал**:
  - Увеличивает индекс на 1, проверяет завершение циркуляции

### setMarketCirculationOriginalIndex(gameId, originalIndex)
- **Назначение**: Устанавливает оригинальный индекс циркуляции market
- **Параметры**:
  - `gameId` (string): ID игры
  - `originalIndex` (number): Оригинальный индекс
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сохраняет индекс игрока, который начал циркуляцию

### clearMarketCirculation(gameId)
- **Назначение**: Очищает данные циркуляции market
- **Параметры**:
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Сбрасывает все поля циркуляции market в начальное состояние

### updatePlayerPosition(gameId, userId, newPosition, inFastTrack)
- **Назначение**: Обновляет позицию игрока
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `newPosition` (number): Новая позиция
  - `inFastTrack` (boolean): Находится ли на Fast Track
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Находит игрока по userId в массиве players
  - Обновляет поля position и inFastTrack

### setCharityEffect(gameId, userId, effect, turnsLeft)
- **Назначение**: Устанавливает эффект благотворительности для игрока
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `effect` (boolean): Включить/выключить эффект
  - `turnsLeft` (number): Количество ходов (если effect = true)
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Находит игрока по userId в массиве players
  - Устанавливает charityEffect и charityTurnsLeft

### decreaseCharityTurns(gameId, userId)
- **Назначение**: Уменьшает счетчик ходов благотворительности
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
- **Возвращает**: Promise<{success: boolean, error?: string, turnsLeft?: number, effectEnded?: boolean}> - результат операции
- **Функционал**:
  - Находит игрока по userId в массиве players
  - Уменьшает charityTurnsLeft на 1
  - Отключает эффект при достижении 0

### nextTurn(gameId)
- **Назначение**: Передает ход следующему игроку
- **Параметры**:
  - `gameId` (string): ID игры
- **Возвращает**: Promise<{success: boolean, error?: string, nextPlayerIndex?: number}> - результат операции
- **Функционал**:
  - Вычисляет следующий индекс игрока (currentPlayerIndex + 1) % players.length
  - Обновляет currentPlayerIndex в документе игры

### addAsset(gameId, userId, asset)
- **Назначение**: Добавляет актив игроку
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `asset` (Object): Объект актива {title, cost, cashFlow, type, description}
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Находит игрока по userId в массиве players
  - Добавляет актив в массив assets
  - Увеличивает assetsCount
  - Пересчитывает passiveIncome, totalIncome и cashFlow

### addLiability(gameId, userId, liability)
- **Назначение**: Добавляет пассив (кредит) игроку
- **Параметры**:
  - `gameId` (string): ID игры
  - `userId` (string): ID игрока
  - `liability` (Object): Объект пассива {title, cost, downPayment, loanAmount, monthlyPayment, type}
- **Возвращает**: Promise<{success: boolean, error?: string}> - результат операции
- **Функционал**:
  - Находит игрока по userId в массиве players
  - Добавляет пассив в массив liabilities
  - Увеличивает  loansCount
  - Пересчитывает totalLoans, totalLoanPayments, totalExpenses и cashFlow

## Бизнес-правила и проверки

### Правила создания игры
- ID игры генерируется как timestamp для уникальности
- Создатель автоматически становится участником
- Начальный статус всегда 'waiting'
- Сохраняются метаданные создания

### Правила присоединения к игре
- Игра должна существовать
- Игрок не должен быть уже участником
- Игра должна быть в статусе 'waiting'
- Операция атомарна для предотвращения race conditions

### Правила начала игры
- Игра должна существовать
- Только создатель может начать игру
- Игра должна быть в статусе 'waiting'
- После начала статус меняется на 'active'

### Статусы игр
- `waiting`: Ожидание игроков
- `active`: Игра в процессе
- `finished`: Игра завершена (резервировано)

### Обработка ошибок
- Все методы асинхронны и возвращают Promise
- Методы joinGame и startGame возвращают объект с success/error
- Специфические коды ошибок: 'not_found', 'already_joined', 'game_started', 'not_creator', 'already_started'
- Ошибки подключения к БД пробрасываются выше

## Архитектурные принципы

- **Единственная ответственность**: DatabaseService отвечает только за работу с БД
- **Абстракция**: Скрывает детали MongoDB от остального приложения
- **Переиспользование**: Методы могут использоваться разными сервисами
- **Безопасность**: Проверки и валидации предотвращают некорректные операции
- **Производительность**: Использует индексы и оптимизированные запросы

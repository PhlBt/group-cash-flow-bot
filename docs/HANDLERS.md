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
  - Валидирует gameId (проверка на пустоту)
  - Вызывает gameService.startGame() для начала игры
  - В случае успеха вызывает messageService.sendPlaySuccessMessage()
  - В случае ошибки вызывает messageService.sendPlayErrorMessage() с соответствующим кодом

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

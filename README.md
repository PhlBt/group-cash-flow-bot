# CashFlow Telegram Bot

Telegram бот для игры в настольную игру CashFlow. Позволяет пользователям создавать игровые сессии, присоединяться к существующим играм и взаимодействовать с игровым процессом.

## Установка

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Создайте файл `.env` в корне проекта и добавьте переменные окружения:
   ```
   BOT_TOKEN=ваш_токен_бота
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DATABASE=cashflow
   ```

## Запуск

### Локально
```bash
npm run serve
```

### Через Docker
```bash
docker-compose up --build -d
```

## 📖 Документация

- [Команды бота](./docs/COMMANDS.md)
- [Работа с базой данных](./docs/DATABASE.md)
- [Система сделок](./docs/DEALS.md)
- [Игровые механики](./docs/GAME.md)
- [Обработчики](./docs/HANDLERS.md)
- [Сообщения](./docs/MESSAGE.md)
- [Проект](./docs/PROJECT.md)
- [Правила](./docs/RULES.md)
- [Статистика пользователей](./docs/USERSTATS.md)
- [Утилиты](./docs/UTILS.md)
- [ChatUserStorage](./src/modules/chatUserStorage/README.md) - Универсальный модуль для хранения данных пользователей и чатов

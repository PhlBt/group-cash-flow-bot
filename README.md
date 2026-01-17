# CashFlow Telegram Bot

Telegram бот для игры в настольную игру CashFlow. Позволяет пользователям создавать игровые сессии, присоединяться к существующим играм и взаимодействовать с игровым процессом.

## Установка

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Создайте файл `.env` в корне проекта и добавьте переменные окружения:
   ```
   TELEGRAM_TOKEN=ваш_токен_бота
   MONGODB_URI=mongodb://localhost:27017/cashflow
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
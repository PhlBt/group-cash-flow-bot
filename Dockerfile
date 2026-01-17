FROM node:18-alpine

LABEL maintainer="PhlBt <ph@borbot.ru>"

# Установка bash для совместимости
RUN apk add --no-cache bash

# Создание рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production && npm cache clean --force

# Копирование исходного кода
COPY src/ ./src/

# Копирование .env файла (если существует)
COPY .env* ./

# Создание непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cashflow -u 1001

# Изменение владельца файлов
RUN chown -R cashflow:nodejs /app
USER cashflow

# Запуск приложения
CMD ["npm", "start"]

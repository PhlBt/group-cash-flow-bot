/**
 * Обрабатывает сообщение с описанием ошибки от пользователя
 * @param {Object} msg - Сообщение от Telegram
 * @param {Object} services - Объект с сервисами { gameService, messageService, bot }
 */
async function handleErrorMessage(msg, services) {
  const { gameService, messageService } = services;
  const chatId = msg.chat.id;
  const threadId = require('../utils').getThreadId(msg);
  const userId = msg.from.id;
  const username = msg.from.first_name || msg.from.username || 'игрок';
  const description = msg.text.trim();

  try {
    // Проверяем, что пользователь действительно ожидает ввода ошибки
    const ErrorStateManager = require('../utils/errorStateManager');
    if (!ErrorStateManager.isWaiting(userId)) {
      await messageService.sendErrorMessage(chatId, 'Вы не запрашивали сообщение об ошибке.', threadId);
      return;
    }

    // Проверяем длину описания
    if (description.length < 10) {
      await messageService.sendErrorMessage(chatId, 'Описание ошибки должно быть не менее 10 символов.', threadId);
      return;
    }

    // Создаем отчет об ошибке в базе данных с полными данными пользователя
    const errorId = await gameService.databaseService.createErrorReport(
      userId,
      username,
      description,
      chatId,
      msg.message_id,
      msg.from, // Полные данные пользователя
      msg.chat, // Данные чата
      msg      // Данные сообщения
    );

    // Отправляем уведомление в чат разработчиков
    await messageService.sendErrorNotificationToDevChat(
      errorId,
      msg.from,
      description,
      msg.chat,
      new Date()
    );

    // Очищаем состояние ожидания
    ErrorStateManager.clearWaiting(userId);

    // Отправляем подтверждение пользователю
    await messageService.sendErrorMessage(chatId, `✅ Спасибо за сообщение об ошибке!`, threadId);

  } catch (error) {
    console.error('Error in handleErrorMessage:', error);
    await messageService.sendErrorMessage(chatId, 'Произошла ошибка при обработке сообщения об ошибке. Попробуйте еще раз.', threadId);
  }
}

module.exports = {
  handleErrorMessage
};

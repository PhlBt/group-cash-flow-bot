/**
 * Утилиты валидации для обработчиков команд и callback'ов
 */

/**
 * Проверяет, является ли пользователь текущим игроком
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {Object} services - объект сервисов { gameService, messageService }
 * @param {number} chatId - ID чата для отправки сообщений об ошибках
 * @param {number|null} threadId - ID треда (для супергрупп) или null
 * @returns {Promise<Object|null>} объект игрока или null
 */
async function validateCurrentPlayer(gameId, userId, services, chatId, threadId = null) {
  const { gameService, messageService } = services;

  try {
    const currentPlayer = await gameService.getCurrentPlayer(gameId);

    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!', threadId);
      return null;
    }

    return currentPlayer;
  } catch (error) {
    console.error('Error validating current player:', error);
    await messageService.sendErrorMessage(chatId, 'Ошибка проверки игрока.', threadId);
    return null;
  }
}

module.exports = {
  validateCurrentPlayer
};

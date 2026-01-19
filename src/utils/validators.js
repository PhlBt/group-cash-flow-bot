/**
 * Утилиты валидации для обработчиков команд и callback'ов
 */

/**
 * Проверяет, является ли пользователь текущим игроком
 * @param {string} gameId - ID игры
 * @param {string} userId - ID пользователя
 * @param {Object} services - объект сервисов { gameService, messageService }
 * @param {number} chatId - ID чата для отправки сообщений об ошибках
 * @returns {Promise<Object|null>} объект игрока или null
 */
async function validateCurrentPlayer(gameId, userId, services, chatId) {
  const { gameService, messageService } = services;

  try {
    const currentPlayer = await gameService.getCurrentPlayer(gameId);

    if (!currentPlayer || currentPlayer.userId !== userId) {
      await messageService.sendErrorMessage(chatId, 'Сейчас не ваш ход!');
      return null;
    }

    return currentPlayer;
  } catch (error) {
    console.error('Error validating current player:', error);
    await messageService.sendErrorMessage(chatId, 'Ошибка проверки игрока.');
    return null;
  }
}

module.exports = {
  validateCurrentPlayer
};

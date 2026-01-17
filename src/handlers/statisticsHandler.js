/**
 * Обработчики команд статистики
 */

class StatisticsHandler {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Обработка команды /mystats
   */
  async handleMyStats(msg, sendMessage) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const playerStats = await this.gameManager.getPlayerStats(userId);

      if (!playerStats) {
        await sendMessage(chatId, "У вас еще нет статистики. Сыграйте в игру!");
        return;
      }

      let message = `📊 ВАША СТАТИСТИКА\n\n`;
      message += `👤 Имя: ${playerStats.username}\n`;
      message += `🎮 Игр сыграно: ${playerStats.gamesPlayed}\n`;
      message += `🏆 Побед: ${playerStats.gamesWon}\n`;
      message += `💀 Банкротств: ${playerStats.gamesBankrupt}\n`;
      message += `📈 Лучший денежный поток: $${playerStats.bestCashFlow}\n`;
      message += `💰 Средний денежный поток: $${Math.round(playerStats.averageCashFlow)}\n`;

      if (playerStats.fastTrackEntries > 0) {
        message += `\n🚀 СКОРОСТНАЯ ДОРОЖКА:\n`;
        message += `Входов: ${playerStats.fastTrackEntries}\n`;
        message += `Побед на СД: ${playerStats.fastTrackWins}\n`;
        message += `Лучший капитал: $${playerStats.bestFastTrackCash}\n`;
      }

      if (playerStats.professionsPlayed.length > 0) {
        message += `\n💼 Любимые профессии:\n`;
        playerStats.professionsPlayed
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .forEach(prof => {
            message += `${prof.name}: ${prof.count} раз\n`;
          });
      }

      if (playerStats.achievements.length > 0) {
        message += `\n🏅 Достижения:\n`;
        playerStats.achievements.forEach(achievement => {
          message += `• ${achievement.name}\n`;
        });
      }

      await sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      await sendMessage(chatId, "Ошибка получения статистики");
    }
  }

  /**
   * Обработка команды /leaderboard
   */
  async handleLeaderboard(msg, match, sendMessage) {
    const chatId = msg.chat.id;
    const criteria = match && match[1] ? match[1] : 'wins';

    const criteriaMap = {
      'wins': 'gamesWon',
      'cash': 'bestCashFlow',
      'games': 'gamesPlayed'
    };

    const sortBy = criteriaMap[criteria] || 'gamesWon';

    try {
      const topPlayers = await this.gameManager.getTopPlayers(sortBy, 10);

      if (!topPlayers || topPlayers.length === 0) {
        await sendMessage(chatId, "Пока нет игроков с статистикой");
        return;
      }

      let message = `🏆 ТОП ИГРОКОВ\n\n`;

      const criteriaNames = {
        'gamesWon': 'по победам',
        'bestCashFlow': 'по лучшему денежному потоку',
        'gamesPlayed': 'по количеству игр'
      };

      message += `📊 ${criteriaNames[sortBy]}\n\n`;

      topPlayers.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        message += `${medal} ${player.username}\n`;

        if (sortBy === 'gamesWon') {
          message += `   🏆 ${player.gamesWon} побед\n`;
        } else if (sortBy === 'bestCashFlow') {
          message += `   💰 $${player.bestCashFlow} макс. поток\n`;
        } else if (sortBy === 'gamesPlayed') {
          message += `   🎮 ${player.gamesPlayed} игр\n`;
        }

        message += `   💸 $${player.totalCashEarned} заработано\n\n`;
      });

      message += `Используйте:\n`;
      message += `/leaderboard wins - по победам\n`;
      message += `/leaderboard cash - по денежному потоку\n`;
      message += `/leaderboard games - по количеству игр`;

      await sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения топа игроков:', error);
      await sendMessage(chatId, "Ошибка получения рейтинга");
    }
  }
}

module.exports = StatisticsHandler;

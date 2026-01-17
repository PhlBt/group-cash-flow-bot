/**
 * Сервис игровых событий
 * Обрабатывает все игровые события: броски кубика, карты, сделки и т.д.
 */
const { formatNumber } = require('../utils/formatters');

class GameEventsService {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  /**
   * Обработка броска кубика
   */
  async processDiceRoll(chatId, userId, updateStats = true) {
    const game = await this.gameManager.getGame(chatId);
    if (!game) {
      return { success: false, message: "Игра не найдена" };
    }

    if (game.currentPlayerId !== userId) {
      const currentPlayer = game.getCurrentPlayer();
      return { success: false, message: `Сейчас ход игрока: ${currentPlayer.username}` };
    }

    // Проверяем, нужно ли пропустить ход (увольнение)
    const player = game.getCurrentPlayer();
    if (player.shouldSkipTurn()) {
      const skipResult = player.processSkipTurn();
      game.nextTurn();
      return {
        success: true,
        message: skipResult.message,
        skipped: true,
        player: player.getStatus()
      };
    }

    // Проверяем бонус от благотворительности
    let dice1 = Math.floor(Math.random() * 6) + 1;
    let dice2 = null;
    let totalDice = dice1;

    if (player.charityTurnsLeft > 0) {
      // Игрок может выбрать сколько кубиков бросать
      game.currentCard = { type: 'dice_choice', waitingForChoice: true, firstDice: dice1 };
      game.waitingForAction = true;
      return {
        success: true,
        message: `🎲 БОНУС ОТ БЛАГОТВОРИТЕЛЬНОСТИ!\nВы можете бросить 1 или 2 кубика.\n\nПервый кубик: ${dice1}\nВыберите количество кубиков:`,
        card: { type: 'dice_choice', firstDice: dice1 },
        player: player.getStatus()
      };
    }

    // Обычный бросок кубика
    return this.processNormalDiceRoll(game, player, totalDice);
  }

  /**
   * Обработка обычного броска кубика
   */
  processNormalDiceRoll(game, player, totalDice) {
    player.position = (player.position + totalDice) % 24;

    const cellType = this.getCellType(player.position);
    let card = null;
    let message = `🎲 Выпало: ${totalDice}. Позиция: ${player.position + 1}`;

    switch (cellType) {
      case 'small_deal':
      case 'big_deal':
        card = cellType === 'small_deal'
          ? require('../game/cards').generateSmallDeal()
          : require('../game/cards').generateBigDeal();
        game.currentCard = card;
        game.waitingForAction = true;
        message += `\n\n${cellType === 'small_deal' ? '🎯 МАЛАЯ' : '💼 БОЛЬШАЯ'} СДЕЛКА:\n${game.formatCard(card)}`;
        break;

      case 'market':
        card = require('../game/cards').generateMarketCard();
        message += `\n\n📈 РЫНОК:\n${game.formatCard(card)}`;
        const marketResult = this.applyMarketEffectToAll(game, card);
        message += "\n" + marketResult.message;
        game.nextTurn();
        break;

      case 'opportunity':
        return this.processOpportunityCell(game, player, message);

      case 'doodad':
        card = require('../game/cards').generateDoodadCard();
        game.currentCard = card;
        game.waitingForAction = true;
        message += `\n\n💸 РАСХОДЫ:\n${game.formatCard(card)}`;
        break;

      case 'payday':
        return this.processPayday(game, player, message);

      case 'charity':
        card = {
          type: "charity",
          title: "Благотворительность",
          description: "Пожертвуйте 10% дохода за право в следующие 3 хода бросать 1 или 2 кубика",
          effect: "charity",
          skip: false
        };
        game.currentCard = card;
        game.waitingForAction = true;
        message += "\n\n🎗️ БЛАГОТВОРИТЕЛЬНОСТЬ:\n" + game.formatCard(card);
        break;

      default:
        game.nextTurn();
    }

    return { success: true, message, card, player: player.getStatus() };
  }

  /**
   * Получение типа клетки по позиции
   */
  getCellType(position) {
    const board = [
      'small_deal', 'doodad', 'small_deal', 'charity', 'small_deal', 'payday',
      'small_deal', 'market', 'small_deal', 'doodad', 'small_deal', 'opportunity',
      'small_deal', 'payday', 'small_deal', 'market', 'small_deal', 'doodad',
      'small_deal', 'opportunity', 'small_deal', 'payday', 'small_deal', 'market'
    ];
    return board[position];
  }

  /**
   * Обработка клетки "Возможность"
   */
  processOpportunityCell(game, player, message) {
    if (player.position === 11) { // Увольнение
      const firedResult = player.getFired();
      message += "\n\n💼 УВОЛЬНЕНИЕ:\n" + firedResult.message;
      if (firedResult.bankrupt) {
        this.handleBankruptcy(game, player);
      } else {
        game.nextTurn();
      }
    } else if (player.position === 19) { // Рождение ребенка
      const childResult = player.addChild();
      message += "\n\n👶 РЕБЕНОК:\n" + childResult.message;
      game.nextTurn();
    } else {
      // Случайная возможность
      const card = require('../game/cards').generateOpportunityCard();
      const oppResult = this.processOpportunityEffect(game, player, card);
      message += "\n\n🎁 ВОЗМОЖНОСТЬ:\n" + game.formatCard(card);
      message += "\n" + oppResult.message;
      if (oppResult.newDeal) {
        game.currentCard = oppResult.newDeal;
        game.waitingForAction = true;
      } else if (!oppResult.extraTurn) {
        game.nextTurn();
      }
    }

    return { success: true, message, player: player.getStatus() };
  }

  /**
   * Обработка дня выплат
   */
  processPayday(game, player, message) {
    const paydayAmount = player.cashFlow;
    if (paydayAmount >= 0) {
      player.receive(paydayAmount);
      message += "\n\n💰 ДЕНЬ ВЫПЛАТ!\n";
      message += `💵 Зарплата: +${formatNumber(player.salary)} ₽\n`;
      message += `📈 Пассивный доход: +${formatNumber(player.passiveIncome)} ₽\n`;
      message += `💸 Расходы: -${formatNumber(player.totalExpenses)} ₽\n`;
      message += `💹 Чистый денежный поток: +${formatNumber(paydayAmount)} ₽\n`;
      message += `💰 Баланс: ${formatNumber(player.cash)} ₽`;
    } else {
      const penalty = Math.abs(paydayAmount);
      player.pay(penalty);
      message += "\n\n💸 ДЕНЬ ВЫПЛАТ!\n";
      message += `💵 Зарплата: +${formatNumber(player.salary)} ₽\n`;
      message += `📈 Пассивный доход: +${formatNumber(player.passiveIncome)} ₽\n`;
      message += `💸 Расходы: -${formatNumber(player.totalExpenses)} ₽\n`;
      message += `💹 Чистый денежный поток: -${formatNumber(penalty)} ₽\n`;
      message += `⚠️ Штраф: -${formatNumber(penalty)} ₽\n`;
      message += `💰 Баланс: ${formatNumber(player.cash)} ₽`;
    }

    // Проверяем банкротство после выплат
    const bankruptCheck = this.checkBankruptcy(game, player);
    if (bankruptCheck.bankrupt) {
      message += bankruptCheck.message;
    } else {
      game.nextTurn();
    }

    return { success: true, message, player: player.getStatus() };
  }

  /**
   * Применение рыночных эффектов ко всем игрокам
   */
  applyMarketEffectToAll(game, card) {
    let message = '';

    switch (card.effect) {
      case 'salary_bonus':
        game.players.forEach(player => {
          const bonus = Math.floor(player.salary * 0.5);
          player.receive(bonus);
        });
        message = `💰 Все игроки получают бонус в размере 50% месячной зарплаты!`;
        break;

      case 'half_real_estate':
        let count = 0;
        game.players.forEach(player => {
          player.assets.forEach(asset => {
            if (this.isRealEstate(asset)) {
              asset.cost = Math.floor(asset.cost * 0.75);
              asset.passiveIncome = Math.floor(asset.passiveIncome * 0.9);
              count++;
            }
          });
        });
        message = `🏠 Рынок недвижимости падает! Стоимость активов уменьшилась на 25%, доходы на 10% (${count} объектов)`;
        break;

      case 'double_real_estate':
        let totalCount = 0;
        game.players.forEach(player => {
          player.assets.forEach(asset => {
            if (this.isRealEstate(asset)) {
              asset.cost = Math.floor(asset.cost * 1.25);
              asset.passiveIncome = Math.floor(asset.passiveIncome * 1.05);
              totalCount++;
            }
          });
        });
        message = `🏠 Рынок недвижимости растет! Стоимость активов увеличилась на 25%, доходы на 5% (${totalCount} объектов)`;
        break;

      case 'double_stocks':
        let stocksCount = 0;
        game.players.forEach(player => {
          player.assets.forEach(asset => {
            if (this.isStock(asset)) {
              asset.cost = Math.floor(asset.cost * 0.75);
              asset.passiveIncome = Math.floor(asset.passiveIncome * 0.85);
              stocksCount++;
            }
          });
        });
        message = `📉 Рынок акций падает! Стоимость активов уменьшилась на 25%, доходы на 15% (${stocksCount} активов)`;
        break;

      case 'halve_stocks':
        let stocksHCount = 0;
        game.players.forEach(player => {
          player.assets.forEach(asset => {
            if (this.isStock(asset)) {
              asset.cost = Math.floor(asset.cost * 1.15);
              asset.passiveIncome = Math.floor(asset.passiveIncome * 1.1);
              stocksHCount++;
            }
          });
        });
        message = `📈 Рынок акций растет! Стоимость активов увеличилась на 15%, доходы на 10% (${stocksHCount} активов)`;
        break;

      case 'increase_expenses':
        game.players.forEach(player => {
          const increase = Math.floor(player.expenses * 0.07);
          player.expenses += increase;
          player.totalExpenses += increase;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `💸 Экономические трудности! Расходы всех игроков увеличились на 7%`;
        break;

      case 'increase_income':
        game.players.forEach(player => {
          const salaryIncrease = Math.floor(player.salary * 0.08);
          const incomeIncrease = Math.floor(player.passiveIncome * 0.08);
          player.salary += salaryIncrease;
          player.passiveIncome += incomeIncrease;
          player.totalIncome = player.salary + player.passiveIncome;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `💰 Экономический рост! Доходы всех игроков увеличились на 8%`;
        break;

      case 'decrease_passive_income':
        game.players.forEach(player => {
          const decrease = Math.floor(player.passiveIncome * 0.12);
          player.passiveIncome -= decrease;
          player.totalIncome = player.salary + player.passiveIncome;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `📉 Экономический спад! Пассивные доходы всех игроков уменьшились на 12%`;
        break;

      case 'increase_passive_income':
        game.players.forEach(player => {
          const increase = Math.floor(player.passiveIncome * 0.1);
          player.passiveIncome += increase;
          player.totalIncome = player.salary + player.passiveIncome;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `📈 Бум технологий! Пассивные доходы всех игроков увеличились на 10%`;
        break;

      default:
        message = "Экономическое событие применено ко всем игрокам";
    }

    return { message };
  }

  /**
   * Обработка эффектов возможностей
   */
  processOpportunityEffect(game, player, card) {
    let message = '';
    let newDeal = null;
    let extraTurn = false;

    switch (card.effect) {
      case 'random_deal':
        newDeal = Math.random() > 0.5
          ? require('../game/cards').generateSmallDeal()
          : require('../game/cards').generateBigDeal();
        message = `🎯 НОВАЯ СДЕЛКА:\n${game.formatCard(newDeal)}`;
        break;

      case 'lottery_win':
        player.receive(100000);
        message = `🎰 Выигрыш в лотерею! 💰 Получено: ${formatNumber(100000)} ₽`;
        break;

      case 'lawsuit_win':
        player.receive(500000);
        message = `⚖️ Коллективный иск выиграл! 💰 Получено: ${formatNumber(500000)} ₽`;
        break;

      case 'inheritance':
        player.receive(2000000);
        message = `🤑 Получено наследство! 💰 Получено: ${formatNumber(2000000)} ₽`;
        break;

      case 'car_accident':
        message = `🚗 Вы попали в аварию. Нужно заплатить ${formatNumber(150000)} ₽`;
        return { message, cost: 150000, canSkip: true };

      case 'surgery':
        message = `🏥 Необходима операция. Нужно заплатить ${formatNumber(200000)} ₽`;
        return { message, cost: 200000, canSkip: true };

      case 'home_improvement':
        message = `🏠 Улучшение дома. Нужно заплатить ${formatNumber(250000)} ₽`;
        return { message, cost: 250000, canSkip: true };

      case 'charity':
        const charityAmount = Math.floor(player.totalIncome * 0.1);
        if (player.cash >= charityAmount) {
          player.pay(charityAmount);
          player.charityTurnsLeft = 3;
          message = `🎗️ Благотворительность!\n💸 Пожертвовано: ${formatNumber(charityAmount)} ₽ (10% от дохода)\n🎲 Следующие 3 хода: право бросать 1 или 2 кубика`;
        } else {
          message = `❌ Недостаточно средств для благотворительности!\nНужно: ${formatNumber(charityAmount)} ₽, у вас: ${formatNumber(player.cash)} ₽`;
          return { message, canSkip: true };
        }
        break;

      default:
        message = "Эффект применен";
    }

    return { message, newDeal, extraTurn };
  }

  /**
   * Проверка и обработка банкротства
   */
  checkBankruptcy(game, player) {
    if (player.checkBankruptcy()) {
      return this.handleBankruptcy(game, player);
    }
    return { bankrupt: false };
  }

  /**
   * Обработка банкротства игрока
   */
  handleBankruptcy(game, player) {
    game.loser = player;
    game.players.delete(player.userId);

    if (game.players.size === 1) {
      game.winner = Array.from(game.players.values())[0];
      game.gameFinished = true;
    } else if (game.players.size === 0) {
      game.gameFinished = true;
    }

    return {
      bankrupt: true,
      message: `\n\n💀 БАНКРОТСТВО!\n${player.username} обанкротился и выбывает из игры!`
    };
  }

  /**
   * Проверка является ли актив недвижимостью
   */
  isRealEstate(asset) {
    return asset.title.includes('квартира') || asset.title.includes('дом') ||
           asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
           asset.title.includes('Торговый');
  }

  /**
   * Проверка является ли актив акцией
   */
  isStock(asset) {
    return asset.title.includes('Акции') || asset.title.includes('акции') ||
           asset.title.includes('Облигации');
  }

  /**
   * Обработка выбора количества кубиков (бонус от благотворительности)
   */
  async processDiceChoice(chatId, userId, diceCount) {
    const game = await this.gameManager.getGame(chatId);
    if (!game || game.currentPlayerId !== userId) {
      return { success: false, message: "Не ваш ход или игра не найдена" };
    }

    if (!game.currentCard || game.currentCard.type !== 'dice_choice') {
      return { success: false, message: "Сейчас не время выбирать количество кубиков" };
    }

    const player = game.getCurrentPlayer();
    if (diceCount !== 1 && diceCount !== 2) {
      return { success: false, message: "Выберите 1 или 2 кубика" };
    }

    let totalDice = game.currentCard.firstDice;
    let message = `🎲 Выбрано: ${diceCount} кубик(ов)\nПервый кубик: ${game.currentCard.firstDice}`;

    if (diceCount === 2) {
      const secondDice = Math.floor(Math.random() * 6) + 1;
      totalDice += secondDice;
      message += `\nВторой кубик: ${secondDice}`;
    }

    message += `\nИтого: ${totalDice}`;

    // Продолжаем как обычный бросок кубика
    game.currentCard = null;
    game.waitingForAction = false;

    player.position = (player.position + totalDice) % 24;
    return this.processNormalDiceRoll(game, player, totalDice);
  }
}

module.exports = GameEventsService;

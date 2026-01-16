const Player = require('./player');
const { getRandomProfession } = require('./professions');
const {
  generateSmallDeal,
  generateBigDeal,
  generateMarketCard,
  generateOpportunityCard,
  generateDoodadCard
} = require('./cards');

class CashFlowGame {
  constructor(chatId) {
    this.chatId = chatId;
    this.players = new Map();
    this.currentPlayerId = null;
    this.gameStarted = false;
    this.gameFinished = false;
    this.currentCard = null;
    this.waitingForAction = false;
    this.winner = null;
    this.loser = null;
    this.kickVotes = new Map(); // targetUserId -> Set of voterIds
  }

  addPlayer(userId, username) {
    if (this.players.has(userId)) {
      return { success: false, message: "Вы уже в игре!" };
    }
    if (this.gameStarted) {
      return { success: false, message: "Игра уже началась!" };
    }

    const profession = getRandomProfession();
    const player = new Player(userId, username, profession);
    this.players.set(userId, player);

    if (this.players.size === 1) {
      this.currentPlayerId = userId;
    }

    return {
      success: true,
      message: `Добро пожаловать, ${username}! Вы получили профессию: ${profession.name}`,
      player: player.getStatus()
    };
  }

  removePlayer(userId) {
    this.players.delete(userId);
    if (this.currentPlayerId === userId) {
      const playerIds = Array.from(this.players.keys());
      this.currentPlayerId = playerIds.length > 0 ? playerIds[0] : null;
    }
  }

  startGame() {
    if (this.players.size < 1) {
      return { success: false, message: "Нужно минимум 1 игрок!" };
    }
    if (this.gameStarted) {
      return { success: false, message: "Игра уже началась!" };
    }

    this.gameStarted = true;
    this.currentPlayerId = Array.from(this.players.keys())[0];
    return { success: true, message: "Игра началась!" };
  }

  getCurrentPlayer() {
    return this.players.get(this.currentPlayerId);
  }

  rollDice() {
    if (!this.gameStarted) {
      return { success: false, message: "Игра еще не началась!" };
    }
    if (this.waitingForAction) {
      return { success: false, message: "Завершите текущее действие!" };
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const previousPosition = player.position;
    const newPosition = (player.position + dice) % 24; // 24 клетки на поле

    // Проверяем, прошел ли игрок полный круг (пересек позицию 0)
    const completedLap = previousPosition + dice >= 24;

    player.position = newPosition;

    // Определяем тип клетки
    const cellType = this.getCellType(player.position);
    let card = null;
    let message = `🎲 Выпало: ${dice}. Позиция: ${player.position + 1}`;

    // Если игрок прошел полный круг, начисляем месячный баланс
    if (completedLap && previousPosition !== 0) {
      const monthResult = player.processMonthEnd();
      message += "\n\n📅 КОНЕЦ МЕСЯЦА!\n";
      message += `💰 Зарплата: +$${monthResult.salary}\n`;
      message += `📈 Пассивный доход: +$${monthResult.passiveIncome}\n`;
      message += `💸 Расходы: -$${monthResult.actualExpensesPaid}`;
      if (monthResult.actualExpensesPaid < monthResult.totalExpenses) {
        message += ` (недостаточно средств, осталось: $${monthResult.totalExpenses - monthResult.actualExpensesPaid})`;
      }
      message += `\n💹 Чистый денежный поток: $${monthResult.netCashFlow}\n`;
      message += `💵 Новый баланс: $${monthResult.newCash}`;
      if (monthResult.isBankrupt) {
        message += `\n⚠️ ВНИМАНИЕ: Недостаточно средств для оплаты всех расходов!`;
      }
    }

    switch (cellType) {
      case 'small_deal':
        card = generateSmallDeal();
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n🎯 МАЛАЯ СДЕЛКА:\n" + this.formatCard(card);
        break;
      case 'big_deal':
        card = generateBigDeal();
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n💼 БОЛЬШАЯ СДЕЛКА:\n" + this.formatCard(card);
        break;
      case 'market':
        card = generateMarketCard();
        message += "\n\n📈 РЫНОК:\n" + this.formatCard(card);
        // Применяем эффект сразу
        const marketResult = this.applyMarketEffect(player, card);
        message += "\n" + marketResult.message;
        this.nextTurn();
        break;
      case 'opportunity':
        card = generateOpportunityCard();
        message += "\n\n🎁 ВОЗМОЖНОСТЬ:\n" + this.formatCard(card);
        // Применяем эффект сразу
        const oppResult = this.applyOpportunityEffect(player, card);
        message += "\n" + oppResult.message;
        if (oppResult.newDeal) {
          // Если получена новая сделка - ждём действия
          this.currentCard = oppResult.newDeal;
          this.waitingForAction = true;
          card = oppResult.newDeal;
        } else if (!oppResult.extraTurn) {
          this.nextTurn();
        }
        break;
      case 'doodad':
        card = generateDoodadCard();
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n💸 РАСХОДЫ:\n" + this.formatCard(card);
        break;
      case 'payday':
        // День зарплаты - только начисляем доходы (расходы списываются в конце месяца)
        player.receive(player.salary);
        message += "\n\n💰 ДЕНЬ ЗАРПЛАТЫ!\n";
        message += `💵 Зарплата: +$${player.salary}\n`;
        message += `💰 Баланс: $${player.cash}`;
        this.nextTurn();
        break;
      default:
        this.nextTurn();
    }

    return { success: true, message, card, player: player.getStatus() };
  }

  getCellType(position) {
    // Упрощенная карта: каждые 4 клетки - новый тип
    const types = ['small_deal', 'big_deal', 'market', 'opportunity', 'doodad', 'payday'];
    return types[position % types.length];
  }

  formatCard(card) {
    let text = `📋 ${card.title}\n${card.description}\n`;
    if (card.cost) {
      text += `💰 Стоимость: $${card.cost}\n`;
    }
    if (card.downPayment) {
      text += `💵 Первый взнос: $${card.downPayment}\n`;
    }
    if (card.cashFlow) {
      text += `📊 Денежный поток: +$${card.cashFlow}/месяц\n`;
    }
    return text;
  }

  buyAsset(useLoan = false) {
    if (!this.waitingForAction || !this.currentCard) {
      return { success: false, message: "Нет активной сделки!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const card = this.currentCard;
    if (card.type !== 'small' && card.type !== 'big') {
      return { success: false, message: "Это не сделка!" };
    }

    const downPayment = card.downPayment || card.cost;
    const hasDownPayment = card.downPayment && card.downPayment < card.cost;
    let message = `✅ Вы купили: ${card.title}\n`;
    let loanTaken = null;

    if (useLoan && hasDownPayment) {
      // Покупка в кредит: платим первый взнос, остальное в кредит
      if (player.cash < downPayment) {
        return { 
          success: false, 
          message: `Недостаточно денег для первого взноса! Нужно: $${downPayment}, у вас: $${player.cash}` 
        };
      }

      const loanAmount = card.cost - downPayment;
      const monthlyPayment = Math.ceil(loanAmount * 0.01);

      // Проверяем, что ежемесячный платеж меньше денежного потока
      if (monthlyPayment >= player.cashFlow) {
        return {
          success: false,
          message: `Кредит не одобрен! Ежемесячный платеж ($${monthlyPayment}) должен быть меньше вашего денежного потока ($${player.cashFlow})`
        };
      }

      // Оплачиваем первый взнос
      console.log('buy asset downPayment', downPayment);
      console.log('buy asset player before', player);
      player.pay(downPayment);
      console.log('buy asset player after', player);
      
      // Берем кредит на остаток
      loanTaken = player.takeLoan(loanAmount, card.title);
      
      message += `💵 Первый взнос: $${downPayment}\n`;
      message += `💰 Кредит: $${loanAmount}\n`;
      message += `💸 Ежемесячный платеж: $${loanTaken.monthlyPayment}\n`;
    } else {
      // Покупка за наличные: платим полную стоимость
      if (player.cash < card.cost) {
        if (hasDownPayment) {
          const loanAmount = card.cost - downPayment;
          const monthlyPayment = Math.ceil(loanAmount * 0.01);
          return {
            success: false,
            message: `Недостаточно денег! Нужно: $${card.cost}, у вас: $${player.cash}\n\n💳 Можно купить в кредит:\n💵 Первый взнос: $${downPayment}\n💰 Сумма кредита: $${loanAmount}\n💸 Ежемесячный платеж: $${monthlyPayment}`,
            canUseLoan: true,
            downPayment: downPayment,
            loanAmount: loanAmount,
            monthlyPayment: monthlyPayment
          };
        } else {
          return {
            success: false,
            message: `Недостаточно денег! Нужно: $${card.cost}, у вас: $${player.cash}`
          };
        }
      }

      // Оплачиваем полную стоимость
      player.pay(card.cost);
      message += `💵 Оплачено: $${card.cost}\n`;
    }

    const asset = {
      id: Date.now(),
      title: card.title,
      cost: card.cost,
      downPayment: useLoan ? downPayment : card.cost,
      passiveIncome: card.cashFlow,
      type: card.type,
      loanId: loanTaken ? loanTaken.id : null
    };

    player.addAsset(asset);
    this.currentCard = null;
    this.waitingForAction = false;

    message += `📈 Пассивный доход: +$${card.cashFlow}/месяц\n`;
    message += `💹 Ваш денежный поток: $${player.cashFlow}/месяц`;

    if (loanTaken) {
      message += `\n\n⚠️ У вас кредит с платежом $${loanTaken.monthlyPayment}/мес`;
    }

    // Проверяем выход из крысиных бегов
    const escapeCheck = this.checkEscapeRatRace(player);
    if (escapeCheck.escaped) {
      message += escapeCheck.message;
    } else {
      this.nextTurn();
    }

    return { success: true, message, player: player.getStatus(), loan: loanTaken };
  }

  skipDeal() {
    if (!this.waitingForAction) {
      return { success: false, message: "Нет активного действия!" };
    }

    this.currentCard = null;
    this.waitingForAction = false;
    this.nextTurn();

    return { success: true, message: "Сделка пропущена" };
  }

  payExpense(useLoan = false) {
    if (!this.waitingForAction || !this.currentCard) {
      return { success: false, message: "Нет активного действия!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const card = this.currentCard;
    if (card.type !== 'doodad') {
      return { success: false, message: "Это не расход!" };
    }

    // Если денег не хватает
    if (player.cash < card.cost) {
      const shortage = card.cost - player.cash;
      const monthlyPayment = Math.ceil(shortage * 0.01);

      if (useLoan) {
        // Пытаемся взять кредит
        if (monthlyPayment >= player.cashFlow) {
          // Кредит не дают - предлагаем продать активы или банкротство
          if (player.assets.length > 0) {
            return {
              success: false,
              message: `❌ Кредит не одобрен! Платёж ($${monthlyPayment}) >= денежный поток ($${player.cashFlow})\n\n📦 У вас есть активы для продажи:\n${this.formatAssetsForSale(player)}`,
              needSellAsset: true
            };
          } else {
            // Нет активов - банкротство
            const bankruptResult = this.forceBankruptcy(player);
            return {
              success: false,
              message: `❌ Кредит не одобрен и нет активов для продажи!\n${bankruptResult.message}`,
              bankrupt: true
            };
          }
        }

        // Берём кредит
        const loan = player.takeLoan(shortage, `Расход: ${card.title}`);
        player.pay(card.cost - loan.amount);

        this.currentCard = null;
        this.waitingForAction = false;
        this.nextTurn();

        return {
          success: true,
          message: `💸 Оплачено: $${card.cost} за ${card.title}\n💳 Взят кредит: $${shortage}\n💸 Ежемесячный платёж: $${loan.monthlyPayment}`,
          player: player.getStatus()
        };
      } else {
        // Предлагаем варианты
        let message = `❌ Недостаточно денег! Нужно: $${card.cost}, у вас: $${player.cash}\n\n`;
        
        if (monthlyPayment < player.cashFlow) {
          message += `💳 Можно взять кредит:\n`;
          message += `Сумма: $${shortage}\n`;
          message += `Платёж: $${monthlyPayment}/мес\n\n`;
        } else {
          message += `❌ Кредит недоступен (платёж $${monthlyPayment} меньше чем денежный поток $${player.cashFlow})\n\n`;
        }

        if (player.assets.length > 0) {
          message += `📦 Можно продать активы:\n${this.formatAssetsForSale(player)}\n`;
        } else if (monthlyPayment >= player.cashFlow) {
          message += `⚠️ Нет активов для продажи - грозит банкротство!`;
        }

        return {
          success: false,
          message,
          canUseLoan: monthlyPayment < player.cashFlow,
          needSellAsset: player.assets.length > 0
        };
      }
    }

    // Денег хватает - просто платим
    player.pay(card.cost);
    this.currentCard = null;
    this.waitingForAction = false;

    let message = `✅ Оплачено: $${card.cost} за ${card.title}`;

    // Проверяем банкротство после оплаты
    const bankruptCheck = this.checkBankruptcy(player);
    if (bankruptCheck.bankrupt) {
      message += bankruptCheck.message;
      return { success: true, message, player: player.getStatus(), bankrupt: true };
    }

    this.nextTurn();
    return { success: true, message, player: player.getStatus() };
  }

  // Форматирование активов для продажи
  formatAssetsForSale(player) {
    return player.assets.map((a, i) => 
      `${i + 1}. ${a.title} - $${a.cost} (доход: $${a.passiveIncome}/мес)`
    ).join('\n');
  }

  // Продажа актива
  sellAsset(assetIndex) {
    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    if (assetIndex < 0 || assetIndex >= player.assets.length) {
      return { success: false, message: "Неверный номер актива!" };
    }

    const asset = player.assets[assetIndex];
    const salePrice = Math.floor(asset.cost * 0.8); // Продаём за 80% стоимости

    // Удаляем актив и получаем деньги
    player.removeAsset(asset.id);
    player.receive(salePrice);

    let message = `✅ Продано: ${asset.title}\n`;
    message += `💵 Получено: $${salePrice} (80% от $${asset.cost})\n`;
    message += `📉 Потерян доход: -$${asset.passiveIncome}/мес\n`;
    message += `💰 Баланс: $${player.cash}`;

    return { success: true, message, player: player.getStatus() };
  }

  // Принудительное банкротство
  forceBankruptcy(player) {
    this.loser = player;
    this.players.delete(player.userId);
    this.currentCard = null;
    this.waitingForAction = false;

    if (this.players.size === 1) {
      this.winner = Array.from(this.players.values())[0];
      this.gameFinished = true;
      return {
        message: `💀 ${player.username} обанкротился!\n\n🏆 ${this.winner.username} побеждает!`
      };
    } else if (this.players.size === 0) {
      this.gameFinished = true;
      return { message: `💀 ${player.username} обанкротился! Игра окончена.` };
    }

    this.nextTurn();
    return { message: `💀 ${player.username} обанкротился и выбывает из игры!` };
  }

  // Применение эффекта карты рынка
  applyMarketEffect(player, card) {
    let message = '';

    switch (card.effect) {
      case 'salary_bonus':
        player.receive(player.salary);
        message = `💰 Получено: $${player.salary}`;
        break;
      case 'half_real_estate':
        let realEstateCount = 0;
        player.assets.forEach(asset => {
          if (asset.title.includes('квартира') || asset.title.includes('дом') || 
              asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
              asset.title.includes('Торговый')) {
            asset.cost /= 2;
            realEstateCount++;
          }
        });
        message = `🏠 Недвижимость теряет 50% стоимости! (${realEstateCount} объектов)`;
        break;
      case 'double_real_estate':
        let realDEstateCount = 0;
        player.assets.forEach(asset => {
          if (asset.title.includes('квартира') || asset.title.includes('дом') || 
              asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
              asset.title.includes('Торговый')) {
            asset.cost *= 2;
            realDEstateCount++;
          }
        });
        message = `🏠 Недвижимость удвоилась в цене! (${realDEstateCount} объектов)`;
        break;
      case 'double_stocks':
        let stocksDCount = 0;
        player.assets.forEach(asset => {
          if (asset.title.includes('Акции') || asset.title.includes('акции') || 
              asset.title.includes('Облигации')) {
            asset.cost = Math.floor(asset.cost / 2);
            stocksDCount++;
          }
        });
        message = `📉 Акции удвоились в цене! (${stocksDCount} активов)`;
        break;
      case 'halve_stocks':
        let stocksCount = 0;
        player.assets.forEach(asset => {
          if (asset.title.includes('Акции') || asset.title.includes('акции') || 
              asset.title.includes('Облигации')) {
            asset.cost = Math.floor(asset.cost / 2);
            stocksCount++;
          }
        });
        message = `📉 Акции потеряли 50% стоимости! (${stocksCount} активов)`;
        break;
      case 'increase_salary':
        const increaseR = Math.floor(player.salary * 0.1);
        player.salary += increase;
        player.totalExpenses += increase;
        player.cashFlow = player.totalIncome - player.totalExpenses;
        message = `💸 Расходы увеличились на $${increase}/мес`;
        break;
      case 'increase_expenses':
        const increase = Math.floor(player.totalIncome * 0.1);
        player.totalIncome += increase;
        player.cashFlow = player.totalIncome - player.totalExpenses;
        message = `💸 Доходы увеличились на $${increase}/мес`;
        break;
      default:
        message = "Эффект применен";
    }

    message += `\n💰 Баланс: $${player.cash}`;
    return { message };
  }

  // Применение эффекта карты возможности
  applyOpportunityEffect(player, card) {
    let message = '';
    let newDeal = null;
    let extraTurn = false;

    switch (card.effect) {
      case 'random_deal':
        newDeal = Math.random() > 0.5 ? generateSmallDeal() : generateBigDeal();
        message = `🎯 НОВАЯ СДЕЛКА:\n${this.formatCard(newDeal)}`;
        break;
      case 'tax_refund':
        player.receive(1000);
        message = `💰 Получено: $1000`;
        break;
      case 'extra_turn':
        extraTurn = true;
        message = `🎲 Дополнительный ход! Бросьте кубик ещё раз.`;
        break;
      default:
        message = "Эффект применен";
    }

    return { message, newDeal, extraTurn };
  }

  nextTurn() {
    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentPlayerId = playerIds[nextIndex];
  }

  // Проверка и обработка выхода из крысиных бегов
  checkEscapeRatRace(player) {
    if (player.canEscapeRatRace() && !player.inFastTrack) {
      const result = player.enterFastTrack();
      if (result.success) {
        return { escaped: true, message: `\n\n${result.message}` };
      }
    }
    return { escaped: false };
  }

  // Бросок кубика на Fast Track
  rollDiceFastTrack() {
    if (!this.gameStarted) {
      return { success: false, message: "Игра еще не началась!" };
    }

    const player = this.getCurrentPlayer();
    if (!player || !player.inFastTrack) {
      return { success: false, message: "Вы не на скоростной дорожке!" };
    }

    const dice = Math.floor(Math.random() * 6) + 1;

    player.fastTrackPosition = (player.fastTrackPosition + dice) % 12;

    // Получаем ежемесячный доход на Fast Track
    player.fastTrackCash += player.fastTrackIncome;

    let message = `🎲 Выпало: ${dice}\n`;
    message += `📍 Позиция на Fast Track: ${player.fastTrackPosition + 1}\n`;
    message += `💰 Получен доход: +$${player.fastTrackIncome}\n`;
    message += `💵 Баланс: $${player.fastTrackCash}\n`;
    message += `🎯 До мечты: $${player.dreamCost - player.fastTrackCash}`;

    // Генерируем событие Fast Track
    const event = this.generateFastTrackEvent();
    this.currentCard = event;
    this.waitingForAction = true;

    message += `\n\n${event.icon} ${event.title}\n${event.description}`;

    // Проверяем победу
    if (player.checkWin()) {
      message += `\n\n🏆 ПОБЕДА! Вы достигли своей мечты и выиграли игру!`;
      this.gameFinished = true;
      this.winner = player;
    }

    return { success: true, message, player: player.getStatus(), event };
  }

  // Генерация событий Fast Track
  generateFastTrackEvent() {
    const events = [
      {
        type: 'business',
        icon: '🏢',
        title: 'Бизнес-возможность',
        description: 'Инвестируйте $50,000 в новый бизнес. Доход: +$5,000/мес',
        cost: 50000,
        income: 5000
      },
      {
        type: 'investment',
        icon: '📈',
        title: 'Инвестиция в акции',
        description: 'Купите акции за $30,000. Потенциальная прибыль: $20,000',
        cost: 30000,
        profit: 20000
      },
      {
        type: 'charity',
        icon: '🎗️',
        title: 'Благотворительность',
        description: 'Пожертвуйте $10,000 на благотворительность. Бонус: дополнительный ход',
        cost: 10000,
        bonus: 'extra_turn'
      },
      {
        type: 'cashflow_day',
        icon: '💰',
        title: 'День денежного потока',
        description: 'Получите дополнительный доход!',
        income: 10000
      },
      {
        type: 'divorce',
        icon: '💔',
        title: 'Развод',
        description: 'Потеряйте половину наличных',
        penalty: 0.5
      },
      {
        type: 'lawsuit',
        icon: '⚖️',
        title: 'Судебный иск',
        description: 'Заплатите $25,000 на юридические расходы',
        cost: 25000
      }
    ];

    return events[Math.floor(Math.random() * events.length)];
  }

  // Обработка события Fast Track
  processFastTrackEvent(accept = true) {
    if (!this.currentCard || !this.waitingForAction) {
      return { success: false, message: "Нет активного события!" };
    }

    const player = this.getCurrentPlayer();
    if (!player || !player.inFastTrack) {
      return { success: false, message: "Вы не на скоростной дорожке!" };
    }

    const event = this.currentCard;
    let message = '';

    if (event.type === 'divorce' || event.type === 'lawsuit') {
      // Обязательные события
      if (event.penalty) {
        const loss = Math.floor(player.fastTrackCash * event.penalty);
        player.fastTrackCash -= loss;
        message = `💔 Потеряно: $${loss}`;
      } else if (event.cost) {
        player.fastTrackCash -= event.cost;
        message = `⚖️ Оплачено: $${event.cost}`;
      }
    } else if (accept) {
      // Добровольные события
      if (event.cost && player.fastTrackCash < event.cost) {
        return { success: false, message: `Недостаточно средств! Нужно: $${event.cost}` };
      }

      if (event.cost) {
        player.fastTrackCash -= event.cost;
      }
      if (event.income) {
        player.fastTrackIncome += event.income;
        message = `✅ Инвестиция совершена! Доход увеличен на $${event.income}/мес`;
      } else if (event.profit) {
        player.fastTrackCash += event.profit;
        message = `✅ Получена прибыль: $${event.profit}`;
      } else if (event.bonus === 'extra_turn') {
        message = `✅ Благотворительность! Получите дополнительный ход.`;
        // Не переключаем ход
        this.currentCard = null;
        this.waitingForAction = false;
        return { success: true, message, extraTurn: true, player: player.getStatus() };
      }
    } else {
      message = "Событие пропущено";
    }

    message += `\n💵 Баланс: $${player.fastTrackCash}`;
    message += `\n💰 Доход: $${player.fastTrackIncome}/мес`;

    // Проверяем победу
    if (player.checkWin()) {
      message += `\n\n🏆 ПОБЕДА! Вы достигли своей мечты и выиграли игру!`;
      this.gameFinished = true;
      this.winner = player;
    }

    // Проверяем банкротство на Fast Track
    const bankruptCheck = this.checkBankruptcy(player);
    if (bankruptCheck.bankrupt) {
      message += bankruptCheck.message;
      return { success: true, message, player: player.getStatus(), bankrupt: true };
    }

    this.currentCard = null;
    this.waitingForAction = false;
    this.nextTurn();

    return { success: true, message, player: player.getStatus() };
  }

  // Получить победителя
  getWinner() {
    if (!this.gameFinished || !this.winner) {
      return null;
    }
    return {
      username: this.winner.username,
      profession: this.winner.profession.name,
      finalCash: this.winner.inFastTrack ? this.winner.fastTrackCash : this.winner.cash,
      dreamCost: this.winner.dreamCost
    };
  }

  // Получить проигравшего
  getLoser() {
    if (!this.loser) {
      return null;
    }
    return {
      username: this.loser.username,
      profession: this.loser.profession.name,
      finalCash: this.loser.cash,
      cashFlow: this.loser.cashFlow
    };
  }

  // Голосование за кик игрока
  voteKick(voterId, targetUserId) {
    if (!this.players.has(voterId)) {
      return { success: false, message: "Вы не в игре!" };
    }
    if (!this.players.has(targetUserId)) {
      return { success: false, message: "Игрок не найден!" };
    }
    if (voterId === targetUserId) {
      return { success: false, message: "Нельзя голосовать за себя!" };
    }

    // Инициализируем голосование если нет
    if (!this.kickVotes.has(targetUserId)) {
      this.kickVotes.set(targetUserId, new Set());
    }

    const votes = this.kickVotes.get(targetUserId);
    
    // Проверяем, голосовал ли уже
    if (votes.has(voterId)) {
      return { success: false, message: "Вы уже голосовали за исключение этого игрока!" };
    }

    votes.add(voterId);
    const targetPlayer = this.players.get(targetUserId);
    const voterPlayer = this.players.get(voterId);
    const votesNeeded = Math.floor(this.players.size / 2) + 1;
    const currentVotes = votes.size;

    // Проверяем, достаточно ли голосов
    if (currentVotes >= votesNeeded) {
      return this.kickPlayer(targetUserId);
    }

    return {
      success: true,
      message: `🗳️ ${voterPlayer.username} проголосовал за исключение ${targetPlayer.username}\n📊 Голосов: ${currentVotes}/${votesNeeded}`,
      kicked: false,
      votesNeeded,
      currentVotes
    };
  }

  // Исключение игрока
  kickPlayer(targetUserId) {
    const player = this.players.get(targetUserId);
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const playerName = player.username;
    
    // Если кикаем текущего игрока, переключаем ход
    if (this.currentPlayerId === targetUserId) {
      this.nextTurn();
    }

    // Удаляем игрока
    this.players.delete(targetUserId);
    this.kickVotes.delete(targetUserId);

    // Проверяем окончание игры
    if (this.players.size === 1) {
      this.winner = Array.from(this.players.values())[0];
      this.gameFinished = true;
      return {
        success: true,
        message: `🚫 ${playerName} исключен из игры!\n\n🏆 ${this.winner.username} побеждает!`,
        kicked: true,
        gameFinished: true
      };
    } else if (this.players.size === 0) {
      this.gameFinished = true;
      return {
        success: true,
        message: `🚫 ${playerName} исключен из игры!\nВсе игроки выбыли.`,
        kicked: true,
        gameFinished: true
      };
    }

    return {
      success: true,
      message: `🚫 ${playerName} исключен из игры большинством голосов!`,
      kicked: true,
      gameFinished: false
    };
  }

  // Отменить свой голос
  cancelVoteKick(voterId, targetUserId) {
    if (!this.kickVotes.has(targetUserId)) {
      return { success: false, message: "Голосование не найдено!" };
    }

    const votes = this.kickVotes.get(targetUserId);
    if (!votes.has(voterId)) {
      return { success: false, message: "Вы не голосовали за этого игрока!" };
    }

    votes.delete(voterId);
    if (votes.size === 0) {
      this.kickVotes.delete(targetUserId);
    }

    return { success: true, message: "Ваш голос отменен!" };
  }

  // Получить статус голосования
  getKickVoteStatus(targetUserId) {
    if (!this.kickVotes.has(targetUserId)) {
      return { votes: 0, needed: Math.floor(this.players.size / 2) + 1 };
    }
    return {
      votes: this.kickVotes.get(targetUserId).size,
      needed: Math.floor(this.players.size / 2) + 1
    };
  }

  // Проверка банкротства игрока
  checkBankruptcy(player) {
    if (player.checkBankruptcy()) {
      this.loser = player;
      // Удаляем игрока из игры
      this.players.delete(player.userId);
      
      // Если остался только один игрок - он победитель
      if (this.players.size === 1) {
        this.winner = Array.from(this.players.values())[0];
        this.gameFinished = true;
      } else if (this.players.size === 0) {
        this.gameFinished = true;
      }
      
      return {
        bankrupt: true,
        message: `\n\n💀 БАНКРОТСТВО!\n${player.username} обанкротился и выбывает из игры!`
      };
    }
    return { bankrupt: false };
  }

  getStatus() {
    const players = Array.from(this.players.values()).map(p => p.getStatus());
    return {
      gameStarted: this.gameStarted,
      gameFinished: this.gameFinished,
      currentPlayer: this.currentPlayerId,
      players: players,
      waitingForAction: this.waitingForAction
    };
  }
}

module.exports = CashFlowGame;

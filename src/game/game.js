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

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    // Проверяем, нужно ли пропустить ход (увольнение)
    if (player.shouldSkipTurn()) {
      const skipResult = player.processSkipTurn();
      this.nextTurn();
      return {
        success: true,
        message: skipResult.message,
        skipped: true,
        player: player.getStatus()
      };
    }

    // Проверяем бонус от благотворительности
    let dice1 = Math.floor(Math.random() * 6) + 1;
    let totalDice = dice1;

    if (player.charityTurnsLeft > 0) {
      // Игрок может выбрать сколько кубиков бросать
      this.currentCard = { type: 'dice_choice', waitingForChoice: true };
      this.waitingForAction = true;
      return {
        success: true,
        message: `🎲 БОНУС ОТ БЛАГОТВОРИТЕЛЬНОСТИ!\nВы можете бросить 1 или 2 кубика.`,
        card: { type: 'dice_choice' },
        player: player.getStatus()
      };
    }

    player.position = (player.position + totalDice) % 24; // 24 клетки на поле

    // Определяем тип клетки
    const cellType = this.getCellType(player.position);
    let card = null;
    let message = `🎲 Выпало: ${totalDice}. Позиция: ${player.position + 1}`;

    switch (cellType) {
      case 'small_deal':
        // При попадании на клетку "Сделка" даем выбор между малой и большой сделкой
        card = { type: 'deal_choice', waitingForChoice: true };
        this.currentCard = card;
        this.waitingForAction = true;
        message += `\n\n💰 Баланс: ₽${player.cash}`;
        message += "\n\n🎯 СДЕЛКА!\n";
        message += "Выберите тип сделки:\n\n";
        message += "🔹 Малая сделка - небольшие инвестиции\n";
        message += "🔺 Большая сделка - крупные инвестиции\n\n";
        break;
      case 'big_deal':
        card = generateBigDeal();
        this.currentCard = card;
        this.waitingForAction = true;
        message += `\n\n💰 Баланс: ₽${player.cash}`;
        message += "\n\n💼 БОЛЬШАЯ СДЕЛКА:\n" + this.formatCard(card);
        message += "\n\nВыберите действие:\n";
        break;
      case 'market':
        card = generateMarketCard();
        message += "\n\n📈 РЫНОК:\n" + this.formatCard(card);

        if (card.subtype === "economic") {
          // Экономические события применяются автоматически ко всем игрокам
          const marketResult = this.applyMarketEffectToAll(card);
          message += "\n" + marketResult.message;
          this.nextTurn();
        } else if (card.subtype === "trade") {
          // Торговое предложение - один актив с выбором купить/продать
          card.type = 'market_trade'; // Изменяем тип для правильного отображения кнопок
          this.currentCard = card;
          this.waitingForAction = true;
        }
        break;
      case 'opportunity':
        card = generateOpportunityCard();
        const oppResult = this.applyOpportunityEffect(player, card);
        message += "\n\n🎁 ВОЗМОЖНОСТЬ:\n" + this.formatCard(card);
        let resultCard = null;
        if (oppResult.newDeal) {
          // Если получена новая сделка - ждём действия
          this.currentCard = oppResult.newDeal;
          this.waitingForAction = true;
          resultCard = oppResult.newDeal;
          message += `\n\n💰 Баланс: ₽${player.cash}`;
        } else if (oppResult.cost) {
          // Если есть стоимость - ждём оплаты
          this.currentCard = card;
          this.waitingForAction = true;
          resultCard = card;
        } else {
          // Применяем эффект сразу
          message += "\n" + oppResult.message;
          if (!oppResult.extraTurn) {
            this.nextTurn();
          }
        }
        card = resultCard;
        break;
      case 'doodad':
        card = generateDoodadCard();
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n💸 РАСХОДЫ:\n" + this.formatCard(card);
        break;
      case 'charity':
        // Благотворительность - игрок может отказаться
        card = {
          type: "charity",
          title: "Благотворительность",
          description: "Пожертвуйте 10% дохода за право в следующие 3 хода бросать 1 или 2 кубика",
          effect: "charity",
          skip: false
        };
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n🎗️ БЛАГОТВОРИТЕЛЬНОСТЬ:\n" + this.formatCard(card);
        break;
      case 'payday':
        // День выплат - зарплата + пассивный доход - расходы (денежный поток)
        const paydayAmount = player.cashFlow;
        if (paydayAmount >= 0) {
          player.receive(paydayAmount);
          message += "\n\n💰 ДЕНЬ ВЫПЛАТ!\n";
          message += `💵 Зарплата: +₽${player.salary}\n`;
          message += `📈 Пассивный доход: +₽${player.passiveIncome}\n`;
          message += `💸 Расходы: -₽${player.totalExpenses}\n`;
          message += `💹 Чистый денежный поток: +₽${paydayAmount}\n`;
          message += `💰 Баланс: ₽${player.cash}`;
        } else {
          // Отрицательный денежный поток - вычитаем из баланса
          const penalty = Math.abs(paydayAmount);
          player.pay(penalty);
          message += "\n\n💸 ДЕНЬ ВЫПЛАТ!\n";
          message += `💵 Зарплата: +₽${player.salary}\n`;
          message += `📈 Пассивный доход: +₽${player.passiveIncome}\n`;
          message += `💸 Расходы: -₽${player.totalExpenses}\n`;
          message += `💹 Чистый денежный поток: -₽${penalty}\n`;
          message += `⚠️ Штраф: -₽${penalty}\n`;
          message += `💰 Баланс: ₽${player.cash}`;
        }
        this.nextTurn();
        break;
      default:
        this.nextTurn();
    }

    return { success: true, message, card, player: player.getStatus() };
  }

  getCellType(position) {
    // Жесткий порядок клеток на крысиных бегах (24 клетки)
    const board = [
      'small_deal',      // 1. Сделка
      'doodad',          // 2. Всякая всячина
      'small_deal',      // 3. Сделка
      'charity',         // 4. Благотворительность
      'small_deal',      // 5. Сделка
      'payday',          // 6. День выплат
      'small_deal',      // 7. Сделка
      'market',          // 8. Рынок
      'small_deal',      // 9. Сделка
      'doodad',          // 10. Всякая всячина
      'small_deal',      // 11. Сделка
      'opportunity',     // 12. Увольнение
      'small_deal',      // 13. Сделка
      'payday',          // 14. День выплат
      'small_deal',      // 15. Сделка
      'market',          // 16. Рынок
      'small_deal',      // 17. Сделка
      'doodad',          // 18. Всякая всячина
      'small_deal',      // 19. Сделка
      'opportunity',     // 20. Ребенок
      'small_deal',      // 21. Сделка
      'payday',          // 22. День выплат
      'small_deal',      // 23. Сделка
      'market'           // 24. Рынок
    ];

    return board[position];
  }

  formatCard(card) {
    let text = `📋 ${card.title}\n${card.description}\n`;
    if (card.cost) {
      text += `💰 Стоимость: ₽${card.cost}\n`;
    }
    if (card.downPayment) {
      text += `💵 Первый взнос: ₽${card.downPayment}\n`;
    }
    if (card.cashFlow) {
      text += `📊 Денежный поток: +₽${card.cashFlow}/месяц\n`;
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

    // Проверяем, является ли актив недвижимостью
    const isRealEstate = card.title.includes('квартира') || card.title.includes('дом') ||
      card.title.includes('центр') || card.title.includes('Многоквартирный') ||
      card.title.includes('Торговый');

    if (useLoan && hasDownPayment) {
      // Покупка в кредит: платим первый взнос, остальное в кредит
      if (player.cash < downPayment) {
        return {
          success: false,
          message: `Недостаточно денег для первого взноса! Нужно: ₽${downPayment}, у вас: ₽${player.cash}`
        };
      }

      const loanAmount = card.cost - downPayment;

      // Для недвижимости предлагаем ипотеку, для других активов - обычный кредит
      if (isRealEstate) {
        const mortgagePayment = Math.ceil(loanAmount * 0.005); // 0.5% для ипотеки

        // Проверяем, что ежемесячный платеж меньше денежного потока
        if (mortgagePayment >= player.cashFlow) {
          return {
            success: false,
            message: `Ипотека не одобрена! Ежемесячный платеж (₽${mortgagePayment}) должен быть меньше вашего денежного потока (₽${player.cashFlow})`
          };
        }

        // Оплачиваем первый взнос
        player.pay(downPayment);

        // Берем ипотеку
        loanTaken = player.takeMortgage(loanAmount, card.title);

        message += `💵 Первый взнос: ₽${downPayment}\n`;
        message += `🏠 Ипотека: ₽${loanAmount}\n`;
        message += `💸 Ежемесячный платеж: ₽${loanTaken.monthlyPayment} (6% годовых)\n`;
      } else {
        const monthlyPayment = Math.ceil(loanAmount * 0.01); // 1% для обычного кредита

        // Проверяем, что ежемесячный платеж меньше денежного потока
        if (monthlyPayment >= player.cashFlow) {
          return {
            success: false,
            message: `Кредит не одобрен! Ежемесячный платеж (₽${monthlyPayment}) должен быть меньше вашего денежного потока (₽${player.cashFlow})`
          };
        }

        // Оплачиваем первый взнос
        player.pay(downPayment);

        // Берем обычный кредит
        loanTaken = player.takeLoan(loanAmount, card.title);

        message += `💵 Первый взнос: ₽${downPayment}\n`;
        message += `💰 Кредит: ₽${loanAmount}\n`;
        message += `💸 Ежемесячный платеж: ₽${loanTaken.monthlyPayment} (12% годовых)\n`;
      }
    } else {
      // Покупка за наличные: платим полную стоимость
      if (player.cash < card.cost) {
        if (hasDownPayment) {
          const loanAmount = card.cost - downPayment;

          if (isRealEstate) {
            const mortgagePayment = Math.ceil(loanAmount * 0.005);
            return {
              success: false,
              message: `Недостаточно денег! Нужно: ₽${card.cost}, у вас: ₽${player.cash}\n\n🏠 Можно купить в ипотеку:\n💵 Первый взнос: ₽${downPayment}\n💰 Сумма ипотеки: ₽${loanAmount}\n💸 Ежемесячный платеж: ₽${mortgagePayment} (6% годовых)`,
              canUseLoan: true,
              downPayment: downPayment,
              loanAmount: loanAmount,
              monthlyPayment: mortgagePayment,
              isMortgage: true
            };
          } else {
            return {
              success: false,
              message: `Недостаточно денег! Нужно: ₽${card.cost}, у вас: ₽${player.cash}`
            };
          }
        } else {
          return {
            success: false,
            message: `Недостаточно денег! Нужно: ₽${card.cost}, у вас: ₽${player.cash}`
          };
        }
      }

      // Оплачиваем полную стоимость
      player.pay(card.cost);
      message += `💵 Оплачено: ₽${card.cost}\n`;
    }

    const asset = {
      id: Date.now(),
      title: card.title,
      cost: card.cost,
      downPayment: useLoan ? downPayment : card.cost,
      passiveIncome: card.cashFlow,
      type: card.type,
      loanId: loanTaken ? loanTaken._id : null
    };

    player.addAsset(asset);
    this.currentCard = null;
    this.waitingForAction = false;

    message += `📈 Пассивный доход: +₽${card.cashFlow}/месяц\n`;
    message += `💹 Ваш денежный поток: ₽${player.cashFlow}/месяц`;

    if (loanTaken) {
      message += `\n\n⚠️ У вас кредит с платежом ₽${loanTaken.monthlyPayment}/мес`;
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
        // Кредит не дают - предлагаем кредитную карту или продажу активов
        const creditCardPayment = Math.ceil(shortage * 0.02); // 2% для кредитной карты

        if (creditCardPayment < player.cashFlow) {
          // Предлагаем кредитную карту
          return {
            success: false,
            message: `❌ Кредит не одобрен! Но можно использовать кредитную карту:\n💳 Сумма: ₽${shortage}\n💸 Платёж: ₽${creditCardPayment}/мес (24% годовых)\n\nИспользуйте /use_credit_card для оплаты`,
            canUseCreditCard: true,
            shortage: shortage,
            creditCardPayment: creditCardPayment
          };
        } else if (player.assets.length > 0) {
          // Предлагаем продать активы
          return {
            success: false,
            message: `❌ Кредит не одобрен! Платёж (₽${monthlyPayment}) >= денежный поток (₽${player.cashFlow})\n\n📦 У вас есть активы для продажи:\n${this.formatAssetsForSale(player)}`,
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
      } else {
        // Предлагаем варианты
        let message = `❌ Недостаточно денег! Нужно: ₽${card.cost}, у вас: ₽${player.cash}\n\n`;

        const creditCardPayment = Math.ceil(shortage * 0.02); // 2% для кредитной карты

        if (creditCardPayment < player.cashFlow) {
          message += `💳 Можно использовать кредитную карту:\n`;
          message += `Сумма: ₽${shortage}\n`;
          message += `Платёж: ₽${creditCardPayment}/мес (24% годовых)\n\n`;
        }

        if (player.assets.length > 0) {
          message += `📦 Можно продать активы:\n${this.formatAssetsForSale(player)}\n`;
        } else if (creditCardPayment >= player.cashFlow && monthlyPayment >= player.cashFlow) {
          message += `⚠️ Нет активов для продажи - грозит банкротство!`;
        }

        return {
          success: false,
          message,
          canUseLoan: monthlyPayment < player.cashFlow,
          canUseCreditCard: creditCardPayment < player.cashFlow,
          needSellAsset: player.assets.length > 0
        };
      }
    }

    // Денег хватает - просто платим
    player.pay(card.cost);
    this.currentCard = null;
    this.waitingForAction = false;

    let message = `✅ Оплачено: ₽${card.cost} за ${card.title}`;

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
      `${i + 1}. ${a.title} - ₽${a.cost} (доход: ₽${a.passiveIncome}/мес)`
    ).join('\n');
  }

  // Продажа актива
  sellAsset(assetId, customPriceMultiplier = null) {
    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const asset = player.assets.find(l => l.id === assetId);

    if (!asset) {
      return { success: false, message: "Актив не найден!" };
    }

    // Используем рыночную цену если это торговая карта рынка
    const priceMultiplier = customPriceMultiplier || 0.8;
    const salePrice = Math.floor(asset.cost * priceMultiplier);

    // Удаляем актив и получаем деньги
    player.removeAsset(asset.id);
    player.receive(salePrice);

    let message = `✅ Продано: ${asset.title}\n`;
    const percentage = Math.round(priceMultiplier * 100);
    message += `💵 Получено: ₽${salePrice} (${percentage}% от ₽${asset.cost})\n`;
    message += `📉 Потерян доход: -₽${asset.passiveIncome}/мес\n`;
    message += `💰 Баланс: ₽${player.cash}`;

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

  // Применение экономических эффектов рынка ко всем игрокам
  applyMarketEffectToAll(card) {
    let message = '';

    switch (card.effect) {
      case 'salary_bonus':
        // Уменьшаем бонус до 50% зарплаты (было 100%)
        this.players.forEach(player => {
          const bonus = Math.floor(player.salary * 0.5);
          player.receive(bonus);
        });
        message = `💰 Все игроки получают бонус в размере 50% месячной зарплаты!`;
        break;
      case 'half_real_estate':
        let totalRealEstateCount = 0;
        this.players.forEach(player => {
          let playerCount = 0;
          player.assets.forEach(asset => {
            if (asset.title.includes('квартира') || asset.title.includes('дом') ||
              asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
              asset.title.includes('Торговый')) {
              asset.cost = Math.floor(asset.cost * 0.75); // Уменьшаем до 75% (было 50%)
              asset.passiveIncome = Math.floor(asset.passiveIncome * 0.9); // -10% дохода
              playerCount++;
            }
          });
          totalRealEstateCount += playerCount;
        });
        message = `🏠 Рынок недвижимости падает! Стоимость активов уменьшилась на 25%, доходы на 10% (${totalRealEstateCount} объектов)`;
        break;
      case 'double_real_estate':
        let totalRealDEstateCount = 0;
        this.players.forEach(player => {
          let playerCount = 0;
          player.assets.forEach(asset => {
            if (asset.title.includes('квартира') || asset.title.includes('дом') ||
              asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
              asset.title.includes('Торговый')) {
              asset.cost = Math.floor(asset.cost * 1.25); // Увеличиваем до 125% (было 200%)
              asset.passiveIncome = Math.floor(asset.passiveIncome * 1.05); // +5% дохода
              playerCount++;
            }
          });
          totalRealDEstateCount += playerCount;
        });
        message = `🏠 Рынок недвижимости растет! Стоимость активов увеличилась на 25%, доходы на 5% (${totalRealDEstateCount} объектов)`;
        break;
      case 'double_stocks':
        let totalStocksDCount = 0;
        this.players.forEach(player => {
          let playerCount = 0;
          player.assets.forEach(asset => {
            if (asset.title.includes('Акции') || asset.title.includes('акции') ||
              asset.title.includes('Облигации')) {
              asset.cost = Math.floor(asset.cost * 0.75); // Уменьшаем до 75% (было 50%)
              asset.passiveIncome = Math.floor(asset.passiveIncome * 0.85); // -15% дохода
              playerCount++;
            }
          });
          totalStocksDCount += playerCount;
        });
        message = `📉 Рынок акций падает! Стоимость активов уменьшилась на 25%, доходы на 15% (${totalStocksDCount} активов)`;
        break;
      case 'halve_stocks':
        let totalStocksCount = 0;
        this.players.forEach(player => {
          let playerCount = 0;
          player.assets.forEach(asset => {
            if (asset.title.includes('Акции') || asset.title.includes('акции') ||
              asset.title.includes('Облигации')) {
              asset.cost = Math.floor(asset.cost * 1.15); // Увеличиваем до 115% (было 50%)
              asset.passiveIncome = Math.floor(asset.passiveIncome * 1.1); // +10% дохода
              playerCount++;
            }
          });
          totalStocksCount += playerCount;
        });
        message = `📈 Рынок акций растет! Стоимость активов увеличилась на 15%, доходы на 10% (${totalStocksCount} активов)`;
        break;
      case 'increase_expenses':
        // Уменьшаем эффект до 7% (было 10%)
        this.players.forEach(player => {
          const increase = Math.floor(player.expenses * 0.07);
          player.expenses += increase;
          player.totalExpenses += increase;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `💸 Экономические трудности! Расходы всех игроков увеличились на 7%`;
        break;
      case 'increase_income':
        // Уменьшаем эффект до 8% (было 10%)
        this.players.forEach(player => {
          const increaseSalary = Math.floor(player.salary * 0.08);
          const increasePIncome = Math.floor(player.passiveIncome * 0.08);
          player.salary += increaseSalary;
          player.passiveIncome += increasePIncome;
          player.totalIncome = player.salary + player.passiveIncome;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `💰 Экономический рост! Доходы всех игроков увеличились на 8%`;
        break;
      case 'decrease_passive_income':
        // Уменьшаем эффект до 12% (было 20%)
        this.players.forEach(player => {
          const decrease = Math.floor(player.passiveIncome * 0.12);
          player.passiveIncome -= decrease;
          player.totalIncome = player.salary + player.passiveIncome;
          player.cashFlow = player.totalIncome - player.totalExpenses;
        });
        message = `📉 Экономический спад! Пассивные доходы всех игроков уменьшились на 12%`;
        break;
      case 'increase_passive_income':
        // Уменьшаем эффект до 10% (было 15%)
        this.players.forEach(player => {
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

  // Получение активов игрока подходящих для продажи по типу
  getSellableAssetsForType(player, assetType) {
    return player.assets.filter(asset => {
      switch (assetType) {
        case 'real_estate':
          return asset.title.includes('квартира') || asset.title.includes('дом') ||
            asset.title.includes('центр') || asset.title.includes('Многоквартирный') ||
            asset.title.includes('Торговый');
        case 'stocks':
          return asset.title.includes('Акции') || asset.title.includes('акции') ||
            asset.title.includes('Облигации');
        case 'business':
          return asset.title.includes('франшиза') || asset.title.includes('бизнес') ||
            asset.title.includes('компания') || asset.title.includes('магазин') ||
            asset.title.includes('кафе') || asset.title.includes('автомоек');
        default:
          return false;
      }
    });
  }

  // Форматирование активов для продажи с учетом цены рынка
  formatAssetsForSaleByType(assets, priceMultiplier) {
    return assets.map((asset, index) => {
      const marketPrice = Math.floor(asset.cost * priceMultiplier);
      const originalPrice = asset.cost;
      const priceDiff = marketPrice - originalPrice;
      const sign = priceDiff >= 0 ? '+' : '';
      return `${index + 1}. ${asset.title}\n   💰 Рыночная цена: ₽${marketPrice} (${sign}₽${priceDiff})\n   📈 Доход: ₽${asset.passiveIncome}/мес`;
    }).join('\n\n');
  }

  // Покупка актива с рынка
  buyMarketAsset() {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.subtype !== 'trade') {
      return { success: false, message: "Нет активного торгового предложения!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const card = this.currentCard;
    if (!card.asset) {
      return { success: false, message: "Неверная торговая карта!" };
    }

    const asset = card.asset;

    // Проверяем, достаточно ли денег
    if (player.cash < asset.cost) {
      return {
        success: false,
        message: `Недостаточно денег! Нужно: ₽${asset.cost}, у вас: ₽${player.cash}`
      };
    }

    // Покупаем актив
    player.pay(asset.cost);

    const newAsset = {
      id: Date.now(),
      title: asset.title,
      cost: asset.cost,
      downPayment: asset.cost, // Полная оплата
      passiveIncome: asset.cashFlow,
      type: asset.type,
      loanId: null
    };

    player.addAsset(newAsset);
    this.currentCard = null;
    this.waitingForAction = false;

    let message = `✅ Куплено с рынка: ${asset.title}\n`;
    message += `💵 Оплачено: ₽${asset.cost}\n`;
    message += `📈 Пассивный доход: +₽${asset.cashFlow}/месяц\n`;
    message += `💹 Ваш денежный поток: ₽${player.cashFlow}/месяц`;

    // Проверяем выход из крысиных бегов
    const escapeCheck = this.checkEscapeRatRace(player);
    if (escapeCheck.escaped) {
      message += escapeCheck.message;
    } else {
      this.nextTurn();
    }

    return { success: true, message, player: player.getStatus() };
  }

  // Продажа актива с рынка
  sellMarketAsset() {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.subtype !== 'trade') {
      return { success: false, message: "Нет активного торгового предложения!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const card = this.currentCard;
    if (!card.asset) {
      return { success: false, message: "Неверная торговая карта!" };
    }

    // Ищем актив с таким же названием у игрока
    const assetIndex = player.assets.findIndex(asset => asset.title === card.asset.title);

    if (assetIndex === -1) {
      return { success: false, message: `У вас нет актива "${card.asset.title}" для продажи!` };
    }

    const asset = player.assets[assetIndex];
    const salePrice = Math.floor(asset.cost * card.priceMultiplier);

    // Продаем актив
    player.removeAsset(asset.id);
    player.receive(salePrice);

    this.currentCard = null;
    this.waitingForAction = false;

    let message = `✅ Продано с рынка: ${asset.title}\n`;
    const percentage = Math.round(card.priceMultiplier * 100);
    message += `💵 Получено: ₽${salePrice} (${percentage}% от ₽${asset.cost})\n`;
    message += `📉 Потерян доход: -₽${asset.passiveIncome}/месяц\n`;
    message += `💰 Баланс: ₽${player.cash}`;

    this.nextTurn();

    return { success: true, message, player: player.getStatus() };
  }

  // Использование кредитной карты для оплаты расходов
  useCreditCard() {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.type !== 'doodad') {
      return { success: false, message: "Нет активного расхода!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    const card = this.currentCard;
    const amount = card.cost;
    const creditCardPayment = Math.ceil(amount * 0.02); // 2% в месяц

    // Проверяем, что платеж по кредитной карте меньше денежного потока
    if (creditCardPayment >= player.cashFlow) {
      return {
        success: false,
        message: `❌ Кредитная карта недоступна! Платёж (₽${creditCardPayment}) >= денежный поток (₽${player.cashFlow})`
      };
    }

    // Используем кредитную карту
    const creditCard = player.useCreditCard(amount, card.title);

    this.currentCard = null;
    this.waitingForAction = false;

    let message = `💳 Оплачено кредитной картой: ₽${card.cost} за ${card.title}\n\n`;
    message += `💰 ВЫДАН КРЕДИТ КАРТОЙ:\n`;
    message += `💵 Сумма кредита: ₽${amount}\n`;
    message += `📊 Процентная ставка: 24% годовых\n`;
    message += `💸 Ежемесячный платеж: ₽${creditCard.monthlyPayment} (2% от суммы)\n`;
    message += `⚠️ Кредитная карта - дорогой способ! Рассмотрите другие варианты\n\n`;
    message += `💹 Ваш денежный поток: ₽${player.cashFlow}/месяц`;

    this.nextTurn();

    return { success: true, message, player: player.getStatus() };
  }

  // Начало продажи сделки другому игроку
  startSellDeal() {
    if (!this.waitingForAction || !this.currentCard || (this.currentCard.type !== 'small' && this.currentCard.type !== 'big')) {
      return { success: false, message: "Нет активной сделки для продажи!" };
    }

    const seller = this.getCurrentPlayer();
    if (!seller) {
      return { success: false, message: "Игрок не найден!" };
    }

    // Получаем список других игроков
    const otherPlayers = Array.from(this.players.values())
      .filter(p => p.userId !== seller.userId);

    if (otherPlayers.length === 0) {
      return { success: false, message: "Нет других игроков для продажи сделки!" };
    }

    // Устанавливаем состояние продажи сделки
    this.currentCard.sellDealState = 'select_player';
    this.currentCard.sellerId = seller.userId;

    const playerList = otherPlayers.map((p, i) =>
      `${i + 1}. ${p.username} (💰 ₽${p.cash})`
    ).join('\n');

    const message = `🤝 ПРОДАЖА СДЕЛКИ\n\n${this.formatCard(this.currentCard)}\n\nВыберите игрока для предложения сделки:\n\n${playerList}\n\nИспользуйте /offer_deal <номер_игрока> для выбора`;

    return { success: true, message };
  }

  // Предложение сделки игроку с выбором наценки
  offerDealToPlayer(targetPlayerIndex) {
    if (!this.waitingForAction || !this.currentCard || !this.currentCard.sellDealState) {
      return { success: false, message: "Нет активного процесса продажи сделки!" };
    }

    const seller = this.getCurrentPlayer();
    if (!seller) {
      return { success: false, message: "Продавец не найден!" };
    }

    // Получаем список других игроков
    const otherPlayers = Array.from(this.players.values())
      .filter(p => p.userId !== seller.userId);

    if (targetPlayerIndex < 1 || targetPlayerIndex > otherPlayers.length) {
      return { success: false, message: `Неверный номер игрока! Выберите от 1 до ${otherPlayers.length}` };
    }

    const targetPlayer = otherPlayers[targetPlayerIndex - 1];
    this.currentCard.targetPlayerId = targetPlayer.userId;
    this.currentCard.sellDealState = 'select_markup';

    const message = `🤝 ПРЕДЛОЖЕНИЕ СДЕЛКИ\n\nИгроку: ${targetPlayer.username}\n\n${this.formatCard(this.currentCard)}\n\nВыберите наценку:\n\n1️⃣ +1% к стоимости\n2️⃣ +3% к стоимости\n3️⃣ +5% к стоимости\n\nИспользуйте /set_markup <номер> для выбора`;

    return { success: true, message };
  }

  // Установка наценки и отправка предложения
  setMarkupAndOffer(markupPercent) {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.sellDealState !== 'select_markup') {
      return { success: false, message: "Нет активного предложения сделки!" };
    }

    const validMarkups = [1, 3, 5];
    if (!validMarkups.includes(markupPercent)) {
      return { success: false, message: "Неверная наценка! Выберите 1, 3 или 5%" };
    }

    const seller = this.players.get(this.currentCard.sellerId);
    const buyer = this.players.get(this.currentCard.targetPlayerId);

    if (!seller || !buyer) {
      return { success: false, message: "Игроки не найдены!" };
    }

    // Рассчитываем цену с наценкой
    const basePrice = this.currentCard.cost;
    const markupAmount = Math.floor(basePrice * (markupPercent / 100));
    const finalPrice = basePrice + markupAmount;

    // Сохраняем информацию о предложении
    this.currentCard.finalPrice = finalPrice;
    this.currentCard.markupPercent = markupPercent;
    this.currentCard.sellDealState = 'waiting_response';

    const message = `💰 СДЕЛКА ПРЕДЛОЖЕНА!\n\nПродавец: ${seller.username}\nПокупатель: ${buyer.username}\n\n${this.formatCard(this.currentCard)}\n\n💵 Цена с наценкой ${markupPercent}%: ₽${finalPrice} (+₽${markupAmount})\n\n${buyer.username}, согласны ли вы купить эту сделку?\n\n• /accept_deal - принять сделку\n• /decline_deal - отказаться`;

    return { success: true, message, buyer: buyer.username };
  }

  // Принятие сделки покупателем
  acceptDeal() {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.sellDealState !== 'waiting_response') {
      return { success: false, message: "Нет активного предложения сделки!" };
    }

    const seller = this.players.get(this.currentCard.sellerId);
    const buyer = this.players.get(this.currentCard.targetPlayerId);

    if (!seller || !buyer) {
      return { success: false, message: "Игроки не найдены!" };
    }

    const finalPrice = this.currentCard.finalPrice;
    const markupPercent = this.currentCard.markupPercent;
    const basePrice = this.currentCard.cost;
    const markupAmount = finalPrice - basePrice;

    // Проверяем, достаточно ли денег у покупателя
    if (buyer.cash < finalPrice) {
      // Сделка отменяется
      this.currentCard = null;
      this.waitingForAction = false;
      this.nextTurn();

      return {
        success: false,
        message: `❌ Сделка отменена!\n${buyer.username} не имеет достаточно денег (нужно ₽${finalPrice}, есть ₽${buyer.cash})`
      };
    }

    // Совершаем сделку
    buyer.pay(finalPrice);
    seller.receive(markupAmount); // Продавец получает только наценку!

    // Добавляем актив покупателю
    const asset = {
      id: Date.now(),
      title: this.currentCard.title,
      cost: basePrice, // Стоимость актива остается базовой
      downPayment: basePrice,
      passiveIncome: this.currentCard.cashFlow,
      type: this.currentCard.type,
      loanId: null
    };

    buyer.addAsset(asset);

    this.currentCard = null;
    this.waitingForAction = false;

    let message = `✅ СДЕЛКА СОВЕРШЕНА!\n\n`;
    message += `🏠 Актив: ${asset.title}\n`;
    message += `💵 Базовая стоимость: ₽${basePrice}\n`;
    message += `📈 Наценка ${markupPercent}%: +₽${markupAmount}\n`;
    message += `💰 Итоговая цена: ₽${finalPrice}\n`;
    message += `📊 Доход: +₽${asset.cashFlow}/месяц\n\n`;
    message += `Продавец ${seller.username} получил наценку ₽${markupAmount}\n`;
    message += `Покупатель ${buyer.username} получил актив`;

    // Проверяем выход из крысиных бегов для покупателя
    const escapeCheck = this.checkEscapeRatRace(buyer);
    if (escapeCheck.escaped) {
      message += escapeCheck.message;
    } else {
      this.nextTurn();
    }

    return { success: true, message, seller: seller.username, buyer: buyer.username };
  }

  // Отказ от сделки
  declineDeal() {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.sellDealState !== 'waiting_response') {
      return { success: false, message: "Нет активного предложения сделки!" };
    }

    const seller = this.players.get(this.currentCard.sellerId);
    const buyer = this.players.get(this.currentCard.targetPlayerId);

    this.currentCard = null;
    this.waitingForAction = false;
    this.nextTurn();

    const message = `❌ Сделка отклонена!\n${buyer.username} отказался от предложения ${seller.username}`;

    return { success: true, message };
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
      case 'lottery_win':
        player.receive(100000);
        message = `🎰 Выигрыш в лотерею! 💰 Получено: ₽100000`;
        break;
      case 'lawsuit_win':
        player.receive(500000);
        message = `⚖️ Коллективный иск выиграл! 💰 Получено: ₽500000`;
        break;
      case 'inheritance':
        player.receive(2000000);
        message = `🤑 Получено наследство! 💰 Получено: ₽2000000`;
        break;
      case 'car_accident':
        message = `🚗 Вы попали в аварию. Нужно заплатить ₽150000`;
        return { message, cost: 150000, canSkip: true };
      case 'surgery':
        message = `🏥 Необходима операция. Нужно заплатить ₽200000`;
        return { message, cost: 200000, canSkip: true };
      case 'home_improvement':
        message = `🏠 Улучшение дома. Нужно заплатить ₽250000`;
        return { message, cost: 250000, canSkip: true };
      case 'charity':
        // Благотворительность: 10% от общего дохода за бонус 3 ходов
        const charityAmount = Math.floor(player.totalIncome * 0.1);
        if (player.cash >= charityAmount) {
          player.pay(charityAmount);
          player.charityTurnsLeft = 3;
          message = `🎗️ Благотворительность!\n💸 Пожертвовано: ₽${charityAmount} (10% от дохода)\n🎲 Следующие 3 хода: право бросать 1 или 2 кубика`;
        } else {
          message = `❌ Недостаточно средств для благотворительности!\nНужно: ₽${charityAmount}, у вас: ₽${player.cash}`;
          // Возвращаем false, чтобы игрок мог отказаться
          return { message, canSkip: true };
        }
        break;
      default:
        message = "Эффект применен";
    }

    return { message, newDeal, extraTurn };
  }

  nextTurn() {
    // Уменьшаем счетчик ходов с бонусом от благотворительности для текущего игрока
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer && currentPlayer.charityTurnsLeft > 0) {
      currentPlayer.charityTurnsLeft -= 1;
    }

    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentPlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentPlayerId = playerIds[nextIndex];
  }

  // Выбор количества кубиков для броска (бонус от благотворительности)
  chooseDiceCount(diceCount) {
    if (!this.waitingForAction || !this.currentCard || this.currentCard.type !== 'dice_choice') {
      return { success: false, message: "Сейчас не время выбирать количество кубиков!" };
    }

    const player = this.getCurrentPlayer();
    if (!player) {
      return { success: false, message: "Игрок не найден!" };
    }

    if (diceCount !== 1 && diceCount !== 2) {
      return { success: false, message: "Выберите 1 или 2 кубика!" };
    }

    // Бросаем выбранное количество кубиков
    let totalDice = 0;
    let message = `🎲 Бросок ${diceCount} кубик${diceCount === 1 ? '' : 'а'}: `;

    for (let i = 0; i < diceCount; i++) {
      const dice = Math.floor(Math.random() * 6) + 1;
      totalDice += dice;
      message += dice;
      if (i < diceCount - 1) message += ' + ';
    }

    message += ` = ${totalDice}`;

    // Продолжаем как обычный бросок кубика
    this.currentCard = null;
    this.waitingForAction = false;

    const newPosition = (player.position + totalDice) % 24;

    player.position = newPosition;

    // Определяем тип клетки
    const cellType = this.getCellType(player.position);
    let card = null;

    message += `\n📍 Позиция: ${player.position + 1}`;

    // Механика выплаты за пройденный круг удалена

    switch (cellType) {
      case 'small_deal':
        this.currentCard = { type: 'deal_choice', waitingForChoice: true };
        this.waitingForAction = true;
        message += `\n\n💰 Баланс: ₽${player.cash}`;
        message += "\n\n🎯 СДЕЛКА!\n";
        message += "Выберите тип сделки:\n\n";
        message += "🔹 Малая сделка - небольшие инвестиции\n";
        message += "🔺 Большая сделка - крупные инвестиции\n\n";
        message += "Используйте кнопки ниже для выбора.";
        break;
      case 'big_deal':
        card = generateBigDeal();
        this.currentCard = card;
        this.waitingForAction = true;
        message += `\n\n💰 Баланс: ₽${player.cash}`;
        message += "\n\n💼 БОЛЬШАЯ СДЕЛКА:\n" + this.formatCard(card);
        message += "\n\nВыберите действие:\n";
        break;
      case 'market':
        card = generateMarketCard();
        message += "\n\n📈 РЫНОК:\n" + this.formatCard(card);
        const marketResult = this.applyMarketEffect(player, card);
        message += "\n" + marketResult.message;
        this.nextTurn();
        break;
      case 'opportunity':
        // Клетка 12 - Увольнение, клетка 20 - Ребенок
        if (player.position === 11) { // позиция 11 = клетка 12 (индекс 11)
          // Увольнение - автоматическое событие
          const firedResult = player.getFired();
          message += "\n\n💼 УВОЛЬНЕНИЕ:\n" + firedResult.message;
          if (firedResult.bankrupt) {
            // Банкротство - удаляем игрока
            this.loser = player;
            this.players.delete(player.userId);
            if (this.players.size === 1) {
              this.winner = Array.from(this.players.values())[0];
              this.gameFinished = true;
            } else if (this.players.size === 0) {
              this.gameFinished = true;
            }
          } else {
            // Игрок пропускает ходы, переходим к следующему
            this.nextTurn();
          }
        } else if (player.position === 19) { // позиция 19 = клетка 20 (индекс 19)
          // Рождение ребенка - автоматическое событие
          const childResult = player.addChild();
          message += "\n\n👶 РЕБЕНОК:\n" + childResult.message;
          this.nextTurn();
        } else {
          // Для других позиций opportunity - случайная возможность
          card = generateOpportunityCard();
          const oppResult = this.applyOpportunityEffect(player, card);
          if (oppResult.newDeal) {
            message += `\n\n💰 Баланс: ₽${player.cash}`;
          }
          message += "\n\n🎁 ВОЗМОЖНОСТЬ:\n" + this.formatCard(card);
          message += "\n" + oppResult.message;
          if (oppResult.newDeal) {
            this.currentCard = oppResult.newDeal;
            this.waitingForAction = true;
            card = oppResult.newDeal;
          } else if (!oppResult.extraTurn) {
            this.nextTurn();
          }
        }
        break;
      case 'charity':
        // Благотворительность - игрок может отказаться
        card = {
          type: "charity",
          title: "Благотворительность",
          description: "Пожертвуйте 10% дохода за право в следующие 3 хода бросать 1 или 2 кубика",
          effect: "charity",
          skip: false
        };
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n🎗️ БЛАГОТВОРИТЕЛЬНОСТЬ:\n" + this.formatCard(card);
        break;
      case 'doodad':
        card = generateDoodadCard();
        this.currentCard = card;
        this.waitingForAction = true;
        message += "\n\n💸 РАСХОДЫ:\n" + this.formatCard(card);
        break;
      case 'payday':
        // День выплат - зарплата + пассивный доход - расходы (денежный поток)
        const paydayAmount = player.cashFlow;
        if (paydayAmount >= 0) {
          player.receive(paydayAmount);
          message += "\n\n💰 ДЕНЬ ВЫПЛАТ!\n";
          message += `💵 Зарплата: +₽${player.salary}\n`;
          message += `📈 Пассивный доход: +₽${player.passiveIncome}\n`;
          message += `💸 Расходы: -₽${player.totalExpenses}\n`;
          message += `💹 Чистый денежный поток: +₽${paydayAmount}\n`;
          message += `💰 Баланс: ₽${player.cash}`;
        } else {
          // Отрицательный денежный поток - вычитаем из баланса
          const penalty = Math.abs(paydayAmount);
          player.pay(penalty);
          message += "\n\n💸 ДЕНЬ ВЫПЛАТ!\n";
          message += `💵 Зарплата: +₽${player.salary}\n`;
          message += `📈 Пассивный доход: +₽${player.passiveIncome}\n`;
          message += `💸 Расходы: -₽${player.totalExpenses}\n`;
          message += `💹 Чистый денежный поток: -₽${penalty}\n`;
          message += `⚠️ Штраф: -₽${penalty}\n`;
          message += `💰 Баланс: ₽${player.cash}`;
        }
        this.nextTurn();
        break;
      default:
        this.nextTurn();
    }

    return { success: true, message, card, player: player.getStatus() };
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

  // Бросок кубика на Скоростная дорожка
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

    // Получаем ежемесячный доход на Скоростная дорожка
    player.fastTrackCash += player.fastTrackIncome;

    let message = `🎲 Выпало: ${dice}\n`;
    message += `📍 Позиция на Скоростная дорожка: ${player.fastTrackPosition + 1}\n`;
    message += `💰 Получен доход: +₽${player.fastTrackIncome}\n`;
    message += `💵 Баланс: ₽${player.fastTrackCash}\n`;
    message += `🎯 До мечты: ₽${player.dreamCost - player.fastTrackIncome}`;

    // Генерируем событие Скоростная дорожка
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

  // Генерация событий Скоростная дорожка
  generateFastTrackEvent() {
    const events = [
      {
        type: 'business',
        icon: '🏢',
        title: 'Бизнес-возможность',
        description: 'Инвестируйте ₽5,000,000 в новый бизнес. Доход: +₽500,000/мес',
        cost: 5000000,
        income: 500000
      },
      {
        type: 'investment',
        icon: '📈',
        title: 'Инвестиция в акции',
        description: 'Купите акции за ₽3,000,000. Потенциальная прибыль: ₽2,000,000',
        cost: 3000000,
        profit: 2000000
      },
      {
        type: 'charity',
        icon: '🎗️',
        title: 'Благотворительность',
        description: 'Пожертвуйте ₽1,000,000 на благотворительность. Бонус: дополнительный ход',
        cost: 1000000,
        bonus: 'extra_turn'
      },
      {
        type: 'cashflow_day',
        icon: '💰',
        title: 'День денежного потока',
        description: 'Получите дополнительный доход!',
        profit: 1000000
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
        description: 'Заплатите ₽2,500,000 на юридические расходы',
        cost: 2500000
      }
    ];

    return events[Math.floor(Math.random() * events.length)];
  }

  // Обработка события Скоростная дорожка
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
        message = `💔 Потеряно: ₽${loss}`;
      } else if (event.cost) {
        player.fastTrackCash -= event.cost;
        message = `⚖️ Оплачено: ₽${event.cost}`;
      }
    } else if (accept) {
      // Добровольные события
      if (event.cost && player.fastTrackCash < event.cost) {
        return { success: false, message: `Недостаточно средств! Нужно: ₽${event.cost}` };
      }

      if (event.cost) {
        player.fastTrackCash -= event.cost;
      }
      if (event.income) {
        player.fastTrackIncome += event.income;
        message = `✅ Инвестиция совершена! Доход увеличен на ₽${event.income}/мес`;
      } else if (event.profit) {
        player.fastTrackCash += event.profit;
        message = `✅ Получена прибыль: ₽${event.profit}`;
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

    message += `\n💵 Баланс: ₽${player.fastTrackCash}`;
    message += `\n💰 Доход: ₽${player.fastTrackIncome}/мес`;

    // Проверяем победу
    if (player.checkWin()) {
      message += `\n\n🏆 ПОБЕДА! Вы достигли своей мечты и выиграли игру!`;
      this.gameFinished = true;
      this.winner = player;
    }

    // Проверяем банкротство на Скоростная дорожка
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

class Player {
  constructor(userId, username, profession) {
    this.userId = userId;
    this.username = username;
    this.profession = profession;
    this.salary = profession.salary;
    this.expenses = profession.expenses;
    this.cash = profession.savings;
    this.passiveIncome = 0;
    this.totalIncome = this.salary + this.passiveIncome;
    this.totalExpenses = this.expenses;
    this.cashFlow = this.totalIncome - this.totalExpenses;
    this.assets = [];
    this.liabilities = [];
    this.loans = []; // Кредиты игрока
    this.position = 0; // позиция на игровом поле
    this.inFastTrack = false;
  }

  addAsset(asset) {
    this.assets.push(asset);
    this.passiveIncome += asset.passiveIncome || 0;
    this.totalIncome = this.salary + this.passiveIncome;
    this.cashFlow = this.totalIncome - this.totalExpenses;
  }

  addLiability(liability) {
    this.liabilities.push(liability);
    this.totalExpenses += liability.monthlyPayment || 0;
    this.cashFlow = this.totalIncome - this.totalExpenses;
  }

  removeAsset(assetId) {
    const asset = this.assets.find(a => a.id === assetId);
    if (asset) {
      this.passiveIncome -= asset.passiveIncome || 0;
      this.totalIncome = this.salary + this.passiveIncome;
      this.cashFlow = this.totalIncome - this.totalExpenses;
      this.assets = this.assets.filter(a => a.id !== assetId);
      return asset;
    }
    return null;
  }

  removeLiability(liabilityId) {
    const liability = this.liabilities.find(l => l.id === liabilityId);
    if (liability) {
      this.totalExpenses -= liability.monthlyPayment || 0;
      this.cashFlow = this.totalIncome - this.totalExpenses;
      this.liabilities = this.liabilities.filter(l => l.id !== liabilityId);
      return liability;
    }
    return null;
  }

  pay(amount) {
    if (this.cash >= amount) {
      this.cash -= amount;
      return true;
    }
    return false;
  }

  receive(amount) {
    this.cash += amount;
  }

  // Взять кредит для покупки актива
  takeLoan(amount, assetTitle = '') {
    // Процентная ставка: 10% годовых, ежемесячный платеж = 1% от суммы кредита
    const monthlyPayment = Math.ceil(amount * 0.1); // 1% в месяц (примерно 12% годовых)

    const loan = {
      id: Date.now(),
      amount: amount,
      remainingAmount: amount,
      monthlyPayment: monthlyPayment,
      assetTitle: assetTitle,
      createdAt: Date.now()
    };

    this.loans.push(loan);

    // Добавляем ежемесячный платеж к расходам
    this.totalExpenses += monthlyPayment;
    this.cashFlow = this.totalIncome - this.totalExpenses;

    return loan;
  }

  // Погасить кредит (полностью или частично)
  payLoan(loanId, amount = null) {
    const loan = this.loans.find(l => l.id === loanId);
    if (!loan) {
      return { success: false, message: "Кредит не найден!" };
    }

    const paymentAmount = amount || loan.remainingAmount;

    if (paymentAmount > this.cash) {
      return { success: false, message: `Недостаточно денег! Нужно: $${paymentAmount}, у вас: $${this.cash}` };
    }

    if (paymentAmount > loan.remainingAmount) {
      return { success: false, message: `Сумма превышает остаток по кредиту! Остаток: $${loan.remainingAmount}` };
    }

    // Вычитаем деньги
    this.pay(paymentAmount);

    // Уменьшаем остаток по кредиту
    loan.remainingAmount -= paymentAmount;

    const isFullyPaid = loan.remainingAmount <= 0;

    if (isFullyPaid) {
      // Если кредит полностью погашен, убираем ежемесячный платеж из расходов
      this.totalExpenses -= loan.monthlyPayment;
      this.cashFlow = this.totalIncome - this.totalExpenses;
      // Удаляем кредит из списка
      this.loans = this.loans.filter(l => l.id !== loanId);
    }

    return {
      success: true,
      message: isFullyPaid
        ? `✅ Кредит полностью погашен! Потрачено: $${paymentAmount}`
        : `✅ Погашено: $${paymentAmount}. Остаток по кредиту: $${loan.remainingAmount}`,
      loan: isFullyPaid ? null : loan,
      isFullyPaid: isFullyPaid
    };
  }

  // Получить общую сумму кредитов
  getTotalLoans() {
    return this.loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  }

  // Получить общие ежемесячные платежи по кредитам
  getTotalLoanPayments() {
    return this.loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  }

  processMonthEnd() {
    // Расчет месячного баланса:
    // 1. Получаем зарплату
    this.receive(this.salary);

    // 2. Получаем пассивный доход от всех активов
    this.receive(this.passiveIncome);

    // 3. Вычитаем все расходы (базовые расходы + расходы от пассивов)
    // В конце месяца расходы вычитаются всегда, даже если баланс становится отрицательным
    const cashBeforeExpenses = this.cash;
    this.cash = Math.max(0, this.cash - this.totalExpenses);
    const actualExpensesPaid = cashBeforeExpenses - this.cash;

    // Возвращаем детали расчета для отображения
    return {
      salary: this.salary,
      passiveIncome: this.passiveIncome,
      totalExpenses: this.totalExpenses,
      actualExpensesPaid: actualExpensesPaid,
      netCashFlow: this.cashFlow, // это salary + passiveIncome - totalExpenses
      newCash: this.cash,
      isBankrupt: this.cash === 0 && this.totalExpenses > cashBeforeExpenses
    };
  }

  canEscapeRatRace() {
    return this.passiveIncome >= this.totalExpenses;
  }

  // Выход на Fast Track (скоростную дорожку)
  enterFastTrack() {
    if (!this.canEscapeRatRace()) {
      return { success: false, message: "Пассивный доход должен быть >= расходов!" };
    }

    this.inFastTrack = true;
    // На Fast Track начальный капитал = пассивный доход * 100
    this.fastTrackCash = this.passiveIncome * 100;
    // Цель на Fast Track - купить мечту стоимостью пассивный доход * 100 + $50,000
    this.dreamCost = this.passiveIncome * 100 + 50000;
    this.fastTrackPosition = 0;
    this.fastTrackIncome = this.passiveIncome * 100; // Доход на Fast Track

    return {
      success: true,
      message: `🎉 Вы вышли из крысиных бегов!\n\n🚀 FAST TRACK:\n💰 Начальный капитал: $${this.fastTrackCash}\n💵 Ежемесячный доход: $${this.fastTrackIncome}\n🎯 Цель - купить мечту: $${this.dreamCost}`
    };
  }

  // Проверка победы (достижение мечты на Fast Track)
  checkWin() {
    if (!this.inFastTrack) return false;
    return this.fastTrackIncome >= this.dreamCost;
  }

  // Проверка банкротства
  checkBankruptcy() {
    // Банкротство: наличных 0 и денежный поток отрицательный
    if (this.cash <= 0 && this.cashFlow < 0) {
      return true;
    }
    // Банкротство на Fast Track: капитал стал отрицательным
    if (this.inFastTrack && this.fastTrackCash < 0) {
      return true;
    }
    return false;
  }

  // Увеличить доход на Fast Track (при удачных инвестициях)
  addFastTrackIncome(amount) {
    this.fastTrackIncome += amount;
    this.fastTrackCash += amount; // Также добавляем к наличным
  }

  getStatus() {
    const status = {
      username: this.username,
      profession: this.profession.name,
      salary: this.salary,
      expenses: this.expenses,
      cash: this.cash,
      passiveIncome: this.passiveIncome,
      totalIncome: this.totalIncome,
      totalExpenses: this.totalExpenses,
      cashFlow: this.cashFlow,
      assetsCount: this.assets.length,
      liabilitiesCount: this.liabilities.length,
      loansCount: this.loans.length,
      totalLoans: this.getTotalLoans(),
      totalLoanPayments: this.getTotalLoanPayments(),
      position: this.position,
      inFastTrack: this.inFastTrack
    };

    if (this.inFastTrack) {
      status.fastTrackCash = this.fastTrackCash;
      status.fastTrackIncome = this.fastTrackIncome;
      status.fastTrackPosition = this.fastTrackPosition;
      status.dreamCost = this.dreamCost;
    }

    return status;
  }

  // Получить детальную информацию о кредитах
  getLoansInfo() {
    if (this.loans.length === 0) {
      return { loans: [], totalAmount: 0, totalPayments: 0 };
    }

    return {
      loans: this.loans.map(loan => ({
        id: loan.id,
        amount: loan.amount,
        remainingAmount: loan.remainingAmount,
        monthlyPayment: loan.monthlyPayment,
        assetTitle: loan.assetTitle
      })),
      totalAmount: this.getTotalLoans(),
      totalPayments: this.getTotalLoanPayments()
    };
  }
}

module.exports = Player;

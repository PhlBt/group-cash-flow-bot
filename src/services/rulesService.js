const fs = require('fs');
const path = require('path');

/**
 * Сервис для работы с правилами игры
 */
class RulesService {
  /**
   * Экранирует специальные символы для MarkdownV2, удаляя все '#'
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  static escapeMarkdownV2(text) {
    // Сначала удаляем все '#' из текста
    let processedText = text.replace(/#/g, '');

    // Затем экранируем остальные специальные символы
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escaped = processedText;
    for (const char of specialChars) {
      escaped = escaped.replace(new RegExp(`([^\\\\])\\${char}`, 'g'), `$1\\${char}`);
    }
    return escaped;
  }
  constructor() {
    this.rulesPath = path.join(__dirname, '../../docs/RULES.md');
    this.rulesContent = null;
    this.sections = {};
    this.loadRules();
  }

  /**
   * Загружает и парсит правила из файла
   */
  loadRules() {
    try {
      this.rulesContent = fs.readFileSync(this.rulesPath, 'utf8');
      this.parseSections();
    } catch (error) {
      console.error('Error loading rules:', error);
      this.rulesContent = '# Правила игры CashFlow\n\nОшибка загрузки правил.';
    }
  }

  /**
   * Парсит содержимое файла на разделы
   */
  parseSections() {
    const lines = this.rulesContent.split('\n');
    const sections = {};
    let currentSection = '';
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Проверяем, является ли строка заголовком раздела (начинается с ##)
      if (line.startsWith('## ')) {
        // Сохраняем предыдущий раздел
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }

        // Начинаем новый раздел
        currentSection = line.substring(3).trim();
        currentContent = [line]; // Включаем заголовок
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Сохраняем последний раздел
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    this.sections = sections;
  }

  /**
   * Получает заголовок игры
   */
  getTitle() {
    const lines = this.rulesContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return 'Правила игры CashFlow';
  }

  /**
   * Получает главное сообщение с правилами (Введение + Подготовка + Основные правила + Удачи)
   */
  getMainContent() {
    let content = `${this.getTitle()}\n\n`;

    // Добавляем разделы для главного сообщения
    const mainSections = ['📖 Введение', '🎮 Подготовка к игре', '🎯 Основные правила игры', '🎉 Удачи в игре!'];

    for (const sectionName of mainSections) {
      if (this.sections[sectionName]) {
        content += `${this.sections[sectionName]}\n\n`;
      }
    }

    return RulesService.escapeMarkdownV2(content.trim());
  }

  /**
   * Получает содержимое раздела "Типы полей на доске"
   */
  getTypesSection() {
    const content = this.sections['🏁 Типы полей на доске'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Финансовая система"
   */
  getFinanceSection() {
    const content = this.sections['💎 Финансовая система'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Специальные механики"
   */
  getMechanicsSection() {
    const content = this.sections['🚀 Специальные механики'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Победа и поражение"
   */
  getVictorySection() {
    const content = this.sections['🏆 Победа и поражение'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Советы и стратегии"
   */
  getTipsSection() {
    const content = this.sections['💡 Советы и стратегии'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Команды и управление"
   */
  getCommandsSection() {
    const content = this.sections['🎮 Команды и управление'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела "Часто задаваемые вопросы"
   */
  getFAQSection() {
    const content = this.sections['❓ Часто задаваемые вопросы'] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает содержимое раздела по названию
   */
  getSection(sectionName) {
    const content = this.sections[sectionName] || 'Раздел не найден';
    return RulesService.escapeMarkdownV2(content);
  }

  /**
   * Получает список всех доступных разделов
   */
  getAvailableSections() {
    return Object.keys(this.sections);
  }
}

module.exports = RulesService;

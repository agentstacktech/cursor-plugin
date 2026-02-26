# Cursor Plugin AgentStack — Проверка и тестирование

**Версия:** 0.1  
**Дата:** 2026-02-23  
**Цель:** Подготовка к проверке плагина и пошаговое тестирование перед релизом или подачей в Marketplace.

---

## Часть 1. Подготовка (перед тестированием)

### 1.1 Автоматическая валидация структуры

Из корня репозитория плагина выполните:

```bash
node scripts/validate-plugin.mjs
```

Либо запустите все проверки плагина одной командой (структура + MCP):

```powershell
.\scripts\run-all-verification.ps1
# С ключом: .\scripts\run-all-verification.ps1 -ApiKey "your-key"
```

Ожидается: все проверки пройдены, код выхода 0.

- [ ] Скрипт выполнен без ошибок
- [ ] Все обязательные файлы и папки на месте
- [ ] `plugin.json` и `mcp.json` валидны
- [ ] В репозитории нет захардкоженных секретов (только плейсхолдеры)

### 1.2 Ручная проверка контента

- [ ] **plugin.json:** `name` в kebab-case, `version` в формате semver (например 0.4.0)
- [ ] **README.md:** ссылки на MCP_QUICKSTART и TESTING_AND_CAPABILITIES работают
- [ ] **mcp.json:** в заголовках указан плейсхолдер `<YOUR_API_KEY>` или `YOUR_API_KEY_HERE`, не реальный ключ
- [ ] **Skills:** в каждой папке `skills/*/` есть файл `SKILL.md` с frontmatter `name` и `description`
- [ ] **Rules:** в `rules/` есть `.mdc` файлы с `description` и при необходимости `globs`

### 1.3 Документация для ревью (Security / Marketplace)

- [ ] Прочитан [CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md](../../../docs/plugins/CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md) — ответы для ревьюеров готовы
- [ ] CHANGELOG актуален, последняя версия совпадает с `plugin.json`

---

## Часть 2. Тестирование плагина

### 2.1 Установка плагина

**Вариант A — локально (до публикации):**

- [ ] Плагин добавлен из папки / из репозитория согласно [Cursor Docs — Plugins](https://cursor.com/docs/plugins)
- [ ] В Cursor видно название плагина (AgentStack — Full Backend Ecosystem) и версию

**Вариант B — из Marketplace (после публикации):**

- [ ] Cursor → Settings → Plugins → найден "AgentStack" → Install
- [ ] Установка прошла без ошибок

### 2.2 Настройка MCP

- [ ] Получен API key (анонимный проект или из дашборда AgentStack). Шаги: [MCP_QUICKSTART.md](MCP_QUICKSTART.md)
- [ ] В Cursor: Settings → Features → Model Context Protocol (MCP) → Add Server
- [ ] Заполнено: Name `agentstack`, Type `HTTP`, Base URL `https://agentstack.tech/mcp`
- [ ] В Headers добавлен `X-API-Key` с полученным ключом
- [ ] При необходимости Cursor перезапущен

### 2.3 Проверка MCP (доступность endpoint)

Опционально — убедиться, что MCP endpoint отвечает:

```powershell
# PowerShell: проверка доступности (ожидается 401 без ключа или 200 с ключом)
Invoke-WebRequest -Uri "https://agentstack.tech/mcp/tools" -Method GET -Headers @{"X-API-Key"="YOUR_KEY"} -UseBasicParsing | Select-Object StatusCode
```

Или с curl (если установлен):

```bash
curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: YOUR_KEY" https://agentstack.tech/mcp/tools
```

- [ ] Endpoint возвращает 200 (сервис доступен; с ключом — полный доступ, без ключа некоторые сервера отдают 200 для GET /tools или 401)

### 2.4 Сценарии в чате Cursor

Выполнить в чате Cursor и убедиться, что агент вызывает MCP tools и возвращает осмысленный ответ:

| # | Запрос в чате | Ожидаемый tool / результат |
|---|----------------|----------------------------|
| 1 | "Создай проект в AgentStack с названием Test Verification" | `projects.create_project_anonymous` или аналог, в ответе есть project_id или ключ |
| 2 | "Покажи список моих проектов в AgentStack" | `projects.get_projects`, список проектов (или пустой) |
| 3 | "Дай статистику по проекту &lt;project_id&gt;" (подставить ID из п.1) | `projects.get_stats`, данные по проекту |

- [ ] Сценарий 1 выполнен
- [ ] Сценарий 2 выполнен
- [ ] Сценарий 3 выполнен

### 2.5 Skills и Rules (качественная проверка)

- [ ] При запросе про «проекты» или «AgentStack» агент предлагает вызов MCP (projects.*), а не свой HTTP-клиент
- [ ] При работе с кодом (например, с файлами под globs из rules) рекомендации соответствуют DNA-паттернам и использованию `/api/*` (см. [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md))

### 2.6 Типичные проблемы

| Симптом | Действие |
|--------|----------|
| Агент не вызывает MCP | Проверить MCP в Settings (URL, заголовок X-API-Key), перезапустить Cursor |
| 401 / 403 | Проверить валидность API key, лимиты подписки |
| "Tool not found" | Сверить имя tool с документацией; проверить список: `GET https://agentstack.tech/mcp/tools` с X-API-Key |
| Skills не срабатывают | Плагин установлен; в описании skill есть триггерные фразы (проекты, 8DNA, правила) |

---

## Часть 3. После тестирования

- [ ] Все пункты Части 1 и 2 отмечены
- [ ] Зафиксированы версия в `plugin.json` и запись в CHANGELOG
- [ ] При подаче в Marketplace: заполнена форма по [CURSOR_MARKETPLACE_SUBMIT.md](../../../docs/plugins/CURSOR_MARKETPLACE_SUBMIT.md)
- [ ] После публикации: выполнить [CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md](../../../docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md)

---

**Ссылки**

- [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md) — возможности плагина и детали проверки
- [MCP_QUICKSTART.md](MCP_QUICKSTART.md) — API key и настройка MCP в Cursor
- [.cursor-plugin/VALIDATION.md](.cursor-plugin/VALIDATION.md) — соответствие структуры Cursor plugin building docs

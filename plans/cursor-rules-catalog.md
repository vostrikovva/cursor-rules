# Каталог Cursor-правил

План ещё не выполнен. Источник правил — файлы в `rules/`. Наборы — **ссылки**, не копии. Случайные копии скиллов в `.cursor/skills/` и `.agents/skills/` в этот каталог не коммитить.

От `cursor-skills` берём установку через `npx` и идею списка имён, но **не** взаимоисключающие подпространства (`react` XOR `mobile`). Правило живёт в одном `.mdc`; набор — массив id. Одно правило может входить в несколько наборов (общее React — и в web, и в native, когда они появятся).

Лицензия: MIT, `Copyright (c) 2026 Vyacheslav Vostrikov (vostrikovva)` — как в cursor-skills.

## Раскладка

```
rules/
  example.mdc
sets.json
scripts/install.mjs
scripts/check-rules.mjs
package.json
LICENSE
README.md + README.en.md
.gitignore
```

`sets.json` — объект «имя набора → массив id». Сейчас только:

```json
{
  "all": ["example"]
}
```

Пустые фронт-папки и пресеты `react` / `backend-nest` не заводим. Новый набор позже — новый ключ и список существующих id.

**Как добавить правило:**

1. `rules/<id>.mdc` (подпапки можно).
2. Добавить `"<id>"` в те наборы, куда оно входит (как минимум в `all`, если набор `all` остаётся «весь каталог»).
3. `npm run check-rules`.

## Установщик

Порт логики копирования из `cursor-skills` (`scripts/install-subspace.mjs`) → `scripts/install.mjs`:

- Индекс: все `.mdc` под `rules/`, ключ = basename; дубликат id — ошибка.
- Аргументы без флагов — имена наборов из `sets.json`. Несколько наборов в одной команде объединяются (уникальный union id). Нет `extends` — только массивы ссылок; пересечение наборов нормально.
- Без имён наборов: интерактив (TTY) — scope, каталог проекта, затем выбор набора (включая `all`). Не TTY без имён — ставить `all`.
- Нет меню frontend/backend/database.
- Dest: `.cursor/rules/<id>.mdc` или `~/.cursor/rules/<id>.mdc`.
- `--list` — наборы и их id.
- `bin`: `cursor-rules`. Зависимость: `@inquirer/prompts`.

```bash
npx --yes github:vostrikovva/cursor-rules --to .
npx --yes github:vostrikovva/cursor-rules all --to .
npx --yes github:vostrikovva/cursor-rules --list
```

## Проверка

- Frontmatter: `description`, опционально `alwaysApply` (boolean), `globs`.
- Уникальные id файлов.
- Каждый id в любом наборе существует в каталоге.
- Каждый `.mdc` входит хотя бы в один набор (чтобы ссылка не забылась).

## Тестовое правило

`rules/example.mdc`: `alwaysApply: false`, smoke-test формата. Ссылка только в `all`.

## Docs и уборка (при реализации)

README: установка по имени набора, как добавить правило и вписать id в массив, MIT. Пояснить, что наборы — списки ссылок, не стек-пресеты. Удалить `.cursor/skills/` и `.agents/skills/`. GitHub remote — по отдельной просьбе.

## Чеклист реализации

- [ ] package.json, .gitignore, MIT LICENSE, sets.json, README.ru/en
- [ ] Установщик: набор → `.cursor/rules` / `~/.cursor/rules`
- [ ] check-rules.mjs (frontmatter, уникальные id, ссылки в sets.json)
- [ ] rules/example.mdc, набор `all` → `["example"]`
- [ ] Удалить случайные `.cursor/skills` и `.agents/skills`

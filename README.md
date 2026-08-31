# cursor-rules

Каталог Cursor-правил. Набор — список id, не копия файлов и не взаимоисключающий стек-пресет. Одно правило может входить в несколько наборов.

Лицензия: MIT.

## Установка

```bash
npx --yes github:vostrikovva/cursor-rules --to .
npx --yes github:vostrikovva/cursor-rules all --to .
npx --yes github:vostrikovva/cursor-rules --list
npx --yes github:vostrikovva/cursor-rules --global
```

Локально правила копируются в `.cursor/rules/<id>.mdc`, глобально — в `~/.cursor/rules/<id>.mdc`.

Без имён наборов в TTY скрипт спросит scope, каталог проекта и набор. Без TTY ставится `all`.

Пока есть только набор `all`.

## Как добавить правило

1. Файл `rules/<id>.mdc` (подпапки можно; id — basename).
2. Вписать `"<id>"` в нужные массивы в `sets.json` (как минимум в `all`).
3. `npm run check-rules`.

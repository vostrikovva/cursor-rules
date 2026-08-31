# cursor-rules

A catalog of Cursor rules. A set is a list of ids, not a copy of files and not a mutually exclusive stack preset. One rule can belong to several sets.

License: MIT.

## Install

```bash
npx --yes github:vostrikovva/cursor-rules --to .
npx --yes github:vostrikovva/cursor-rules all --to .
npx --yes github:vostrikovva/cursor-rules --list
npx --yes github:vostrikovva/cursor-rules --global
```

Local installs copy into `.cursor/rules/<id>.mdc`; `--global` copies into `~/.cursor/rules/<id>.mdc`.

With no set names on a TTY, the script prompts for scope, project directory, and set. Without a TTY it installs `all`.

The only set right now is `all`.

## Add a rule

1. Add `rules/<id>.mdc` (subfolders are fine; id is the basename).
2. Put `"<id>"` in the relevant arrays in `sets.json` (at least `all`).
3. Run `npm run check-rules`.

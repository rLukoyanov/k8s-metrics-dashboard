# license-generator

Собирает информацию о лицензиях зависимостей из `package.json` (npm) и `go.mod` (Go modules), формирует отчёт `licenses.json` в формате, совместимом с CycloneDX.

## Использование

```bash
# через npm-скрипт из корня проекта
npm run licenses

# напрямую
go run . --path /path/to/project

# с кастомным путём вывода
go run . --path /path/to/project --output report.json

# только npm
go run . --path /path/to/project --go=false

# только Go модули
go run . --path /path/to/project --npm=false
```

## Флаги

| Флаг | Короткий | По умолчанию | Описание |
|------|----------|--------------|----------|
| `--path` | `-p` | `.` | Путь до корня проекта |
| `--output` | `-o` | `<project>/licenses.json` | Путь до файла результата |
| `--npm` | | `true` | Сканировать npm зависимости |
| `--go` | | `true` | Сканировать Go модули |
| `--gopath` | | `$GOPATH` или `~/go` | Путь до кеша Go-модулей |
| `--pretty` | | `true` | Pretty-print JSON |

## Сборка

```bash
make build
```

## Формат выходных данных

Каждая запись:

```json
{
  "type": "library",
  "bom-ref": "pkg:npm/axios@1.13.5",
  "name": "axios",
  "version": "1.13.5",
  "purl": "pkg:npm/axios@1.13.5",
  "licenses": [{ "license": { "name": "MIT" } }],
  "properties": [{ "name": "licenseText", "value": "..." }]
}
```

BINARY=license-generator
PROJECT?=.
OUTPUT?=

build:
	go build -o $(BINARY) .

run:
	go run . --path "$(PROJECT)" $(if $(OUTPUT),--output "$(OUTPUT)",)

install:
	go install .

clean:
	rm -f $(BINARY)

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  build       Собрать бинарник ($(BINARY))"
	@echo "  run         Запустить (PROJECT=path, OUTPUT=path)"
	@echo "  install     Установить в GOPATH/bin"
	@echo "  clean       Удалить бинарник"
	@echo "  help        Показать эту справку"
	@echo ""
	@echo "Пример: make run PROJECT=/path/to/project OUTPUT=report.json"

.PHONY: build run install clean help

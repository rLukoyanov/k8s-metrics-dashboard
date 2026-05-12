BINARY=license-generator
PROJECT?=.
OUTPUT?=

build:
	go build -o $(BINARY) .

run:
	go run . --path "$(PROJECT)" $(if $(OUTPUT),--output "$(OUTPUT)",)

ui:
	go run . ui $(if $(PORT),--port "$(PORT)",)

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
	@echo "  ui          Запустить веб-интерфейс (PORT=8080)"
	@echo "  install     Установить в GOPATH/bin"
	@echo "  clean       Удалить бинарник"
	@echo "  help        Показать эту справку"
	@echo ""
	@echo "Пример: make run PROJECT=/path/to/project OUTPUT=report.json"
	@echo "Пример: make ui PORT=9090"

.PHONY: build run ui install clean help

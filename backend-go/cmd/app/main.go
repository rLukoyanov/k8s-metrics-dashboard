package main

import (
	"log"

	"github.com/example/project/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatalf("app exited: %v", err)
	}
}

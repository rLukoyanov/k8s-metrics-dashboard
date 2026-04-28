package app
package app

import (
	"os"
	"context"
	"github.com/example/project/internal/controller/http"
	"github.com/example/project/internal/external/loadsystem"
	"github.com/example/project/internal/repo"
	"github.com/example/project/internal/usecase"
)

func Run() error {
	// config values (should be loaded from env/config)
	loadSystemURL := os.Getenv("LOAD_SYSTEM_URL")
	if loadSystemURL == "" {
		loadSystemURL = "http://localhost:9000"
	}
	repo := repo.NewTestPlanMemoryRepository()
	client := loadsystem.New(loadSystemURL)
	createUC := usecase.NewCreateTestUseCase(repo, client)
	// TODO: wire up GetTestStatusUseCase, scheduler, etc.
	router := http.NewRouter(createUC)
	return router.Run(":8080")
}

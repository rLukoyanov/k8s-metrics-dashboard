package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/example/project/internal/usecase"
)

type StatusPoller struct {
	repo   usecase.TestPlanRepository
	client usecase.LoadTestClient
}

func (p *StatusPoller) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			slog.Info("polling statuses")
			// TODO: 1. получить активные тесты 2. запросить статусы 3. обновить статусы 4. отправить события
		}
	}
}

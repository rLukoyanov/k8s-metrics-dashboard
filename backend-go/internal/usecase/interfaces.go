package main
package usecase

import (
	"context"

	"github.com/example/project/internal/entity"
)

type TestPlanRepository interface {
	Save(ctx context.Context, plan *entity.TestPlan) error
	GetByID(ctx context.Context, id string) (*entity.TestPlan, error)
	UpdateStatus(ctx context.Context, id string, status entity.TestStatus) error
}

type LoadTestClient interface {
	CreateTest(ctx context.Context, plan *entity.TestPlan) (string, error)
	GetStatus(ctx context.Context, externalID string) (entity.TestStatus, error)
}

package usecase

import (
	"context"

	"github.com/example/project/internal/entity"
)

type GetTestStatusUseCase struct {
	repo   TestPlanRepository
	client LoadTestClient
}

func NewGetTestStatusUseCase(repo TestPlanRepository, client LoadTestClient) *GetTestStatusUseCase {
	return &GetTestStatusUseCase{repo: repo, client: client}
}

func (uc *GetTestStatusUseCase) Execute(ctx context.Context, id string) (*entity.TestPlan, error) {
	plan, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if plan == nil {
		return nil, nil
	}
	status, err := uc.client.GetStatus(ctx, plan.ExternalTestID)
	if err != nil {
		return nil, err
	}
	plan.Status = status
	if err := uc.repo.UpdateStatus(ctx, plan.ID, status); err != nil {
		return nil, err
	}
	return plan, nil
}

package usecase

import (
	"context"

	"github.com/example/project/internal/entity"
	"github.com/google/uuid"
)

type CreateTestUseCase struct {
	repo   TestPlanRepository
	client LoadTestClient
}

func NewCreateTestUseCase(repo TestPlanRepository, client LoadTestClient) *CreateTestUseCase {
	return &CreateTestUseCase{repo: repo, client: client}
}

func (uc *CreateTestUseCase) Execute(ctx context.Context, req entity.TestRequest) (*entity.TestPlan, error) {
	plan := &entity.TestPlan{
		ID:             uuid.NewString(),
		Name:           req.Name,
		Status:         entity.StatusPending,
		DurationMinute: req.DurationMinute,
		InputPayloads:  req.InputPayloads,
		OutputPayloads: req.OutputPayloads,
	}

	externalID, err := uc.client.CreateTest(ctx, plan)
	if err != nil {
		return nil, err
	}

	plan.ExternalTestID = externalID

	if err := uc.repo.Save(ctx, plan); err != nil {
		return nil, err
	}

	return plan, nil
}

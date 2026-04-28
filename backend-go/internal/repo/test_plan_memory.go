package main
package repo

import (
	"context"
	"sync"

	"github.com/example/project/internal/entity"
)

type TestPlanMemoryRepository struct {
	mu    sync.RWMutex
	items map[string]*entity.TestPlan
}

func NewTestPlanMemoryRepository() *TestPlanMemoryRepository {
	return &TestPlanMemoryRepository{
		items: map[string]*entity.TestPlan{},
	}
}

func (r *TestPlanMemoryRepository) Save(_ context.Context, plan *entity.TestPlan) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[plan.ID] = plan
	return nil
}

func (r *TestPlanMemoryRepository) GetByID(_ context.Context, id string) (*entity.TestPlan, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	plan, ok := r.items[id]
	if !ok {
		return nil, nil
	}
	return plan, nil
}

func (r *TestPlanMemoryRepository) UpdateStatus(_ context.Context, id string, status entity.TestStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if plan, ok := r.items[id]; ok {
		plan.Status = status
	}
	return nil
}

package v1

import (
	"net/http"

	"github.com/example/project/internal/entity"
	"github.com/example/project/internal/usecase"
	"github.com/gin-gonic/gin"
)

type testRoutes struct {
	createUC *usecase.CreateTestUseCase
}

func RegisterRoutes(rg *gin.RouterGroup, createUC *usecase.CreateTestUseCase) {
	routes := &testRoutes{createUC: createUC}
	rg.POST("/tests", routes.createTest)
}

func (r *testRoutes) createTest(c *gin.Context) {
	var req entity.TestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plan, err := r.createUC.Execute(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"id": plan.ID, "status": plan.Status})
}

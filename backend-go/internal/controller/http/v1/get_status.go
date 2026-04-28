package v1

import (
	"net/http"

	"github.com/example/project/internal/usecase"
	"github.com/gin-gonic/gin"
)

type statusRoutes struct {
	getStatusUC *usecase.GetTestStatusUseCase
}

func RegisterStatusRoutes(rg *gin.RouterGroup, getStatusUC *usecase.GetTestStatusUseCase) {
	routes := &statusRoutes{getStatusUC: getStatusUC}
	rg.GET("/tests/:id", routes.getStatus)
}

func (r *statusRoutes) getStatus(c *gin.Context) {
	id := c.Param("id")
	plan, err := r.getStatusUC.Execute(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if plan == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": plan.ID, "status": plan.Status, "external_test_id": plan.ExternalTestID})
}

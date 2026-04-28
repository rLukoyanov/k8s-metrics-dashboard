package http
package http

import (
	"github.com/gin-gonic/gin"
	"github.com/example/project/internal/controller/http/v1"
	"github.com/example/project/internal/usecase"
)

func NewRouter(createUC *usecase.CreateTestUseCase) *gin.Engine {
	r := gin.Default()
	v1Group := r.Group("/api/v1")
	v1.RegisterRoutes(v1Group, createUC)
	return r
}

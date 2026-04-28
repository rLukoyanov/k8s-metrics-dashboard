package entity
package entity

type TestPlan struct {
	ID             string
	ExternalTestID string
	Name           string
	Status         TestStatus
	DurationMinute int
	InputPayloads  []Payload
	OutputPayloads []Payload
}

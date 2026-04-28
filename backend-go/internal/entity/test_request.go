package entity
package entity

type TestRequest struct {
	Name           string    `json:"name"`
	DurationMinute int       `json:"duration_minute"`
	InputPayloads  []Payload `json:"input_payloads"`
	OutputPayloads []Payload `json:"output_payloads"`
}

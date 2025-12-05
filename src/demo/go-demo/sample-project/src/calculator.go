package main

// Calculator represents a simple calculator with history
type Calculator struct {
	history []int
}

// NewCalculator creates a new Calculator instance
func NewCalculator() *Calculator {
	return &Calculator{
		history: make([]int, 0),
	}
}

// Calculate performs a calculation and stores result in history
func (c *Calculator) Calculate(a, b int, operation string) int {
	var result int

	switch operation {
	case "add":
		result = Add(a, b)
	case "subtract":
		result = Subtract(a, b)
	case "multiply":
		result = Multiply(a, b)
	case "divide":
		result = Divide(a, b)
	default:
		result = 0
	}

	c.history = append(c.history, result)
	return result
}

// GetHistory returns the calculation history
func (c *Calculator) GetHistory() []int {
	return c.history
}

// ClearHistory clears the calculation history
func (c *Calculator) ClearHistory() {
	c.history = make([]int, 0)
}

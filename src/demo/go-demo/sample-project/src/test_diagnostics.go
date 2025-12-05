package main

// TestDiagnostics demonstrates various errors that should be caught
func TestDiagnostics() {
	// Undefined variable
	x := undefinedVar
	
	// Type mismatch
	var count int
	count = "string"
	
	// Missing return
	func() int {
		// This function should return int but doesn't
	}()
	
	// Unused variable
	y := 42
	
	// Invalid syntax
	if x > 0 {
		fmt.Println("positive")
	// Missing closing brace
}

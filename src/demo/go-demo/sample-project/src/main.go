package main

import (
	"fmt"
)

func main() {
	// Example usage
	fmt.Println("Go LSP Demo")
	
	// Test math functions
	result := Add(5, 3)
	fmt.Printf("Add(5, 3) = %d\n", result)
	
	// Test Person
	person := NewPerson("Alice", 30)
	fmt.Printf("Person: %s\n", person.String())
	
	// Test Calculator
	calc := NewCalculator()
	calc.Calculate(10, 5, "add")
	calc.Calculate(20, 4, "subtract")
	fmt.Printf("Calculator history: %v\n", calc.GetHistory())
	
	// Test UserService
	service := NewUserService()
	service.AddUser(person)
	service.AddUser(NewPerson("Bob", 25))
	service.UpdateUserAge("Alice", 31)
	fmt.Printf("Users: %v\n", service.GetAllUsers())
}

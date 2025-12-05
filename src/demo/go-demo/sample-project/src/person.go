package main

import "fmt"

// Person represents a person with a name and age
type Person struct {
	Name string
	Age  int
}

// NewPerson creates a new Person instance
func NewPerson(name string, age int) *Person {
	return &Person{
		Name: name,
		Age:  age,
	}
}

// GetName returns the person's name
func (p *Person) GetName() string {
	return p.Name
}

// GetAge returns the person's age
func (p *Person) GetAge() int {
	return p.Age
}

// SetAge updates the person's age
func (p *Person) SetAge(age int) {
	p.Age = age
}

// String returns a string representation of the person
func (p *Person) String() string {
	return fmt.Sprintf("Person{Name: %s, Age: %d}", p.Name, p.Age)
}

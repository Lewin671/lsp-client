package main

// UserService manages user-related operations
type UserService struct {
	users map[string]*Person
}

// NewUserService creates a new UserService instance
func NewUserService() *UserService {
	return &UserService{
		users: make(map[string]*Person),
	}
}

// AddUser adds a new user to the service
func (s *UserService) AddUser(person *Person) {
	s.users[person.Name] = person
}

// GetUser retrieves a user by name
func (s *UserService) GetUser(name string) *Person {
	return s.users[name]
}

// RemoveUser removes a user by name
func (s *UserService) RemoveUser(name string) {
	delete(s.users, name)
}

// GetAllUsers returns all users
func (s *UserService) GetAllUsers() map[string]*Person {
	return s.users
}

// UpdateUserAge updates a user's age
func (s *UserService) UpdateUserAge(name string, age int) bool {
	if person, exists := s.users[name]; exists {
		person.SetAge(age)
		return true
	}
	return false
}

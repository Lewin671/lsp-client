/**
 * Main entry point for the sample TypeScript project
 */
import { add, subtract, multiply, divide, average } from './math';
import { Person } from './models/person';
import { Calculator } from './services/calculator';
import { UserService } from './services/user-service';

// Demo: Math functions
console.log('=== Math Functions Demo ===');
console.log(`add(5, 3) = ${add(5, 3)}`);
console.log(`subtract(10, 4) = ${subtract(10, 4)}`);
console.log(`multiply(6, 7) = ${multiply(6, 7)}`);
console.log(`divide(20, 5) = ${divide(20, 5)}`);
console.log(`average([1, 2, 3, 4, 5]) = ${average([1, 2, 3, 4, 5])}`);

// Demo: Person class
console.log('\n=== Person Class Demo ===');
const person = new Person({
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    age: 30
});
console.log(`Full name: ${person.getFullName()}`);
console.log(`Is adult: ${person.isAdult()}`);
console.log(`Greeting: ${person.greet()}`);

// Demo: Calculator service
console.log('\n=== Calculator Service Demo ===');
const calculator = new Calculator();
console.log('Adding 10 + 5:', calculator.calculate('add', 10, 5).result);
console.log('Multiplying 4 * 7:', calculator.calculate('multiply', 4, 7).result);
console.log('History count:', calculator.getHistory().length);
console.log('Average of results:', calculator.getAverageResult());

// Demo: User service
console.log('\n=== User Service Demo ===');
const userService = new UserService();
const user1 = userService.createUser({
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    age: 25
});
const user2 = userService.createUser({
    firstName: 'Bob',
    lastName: 'Johnson',
    age: 17
});

console.log(`Created users: ${userService.getUserCount()}`);
console.log(`Adult users: ${userService.getAdultUsers().length}`);
console.log(`User 1 greeting: ${user1.greet()}`);

// Find users by name
const foundUsers = userService.findUsersByName('alice');
console.log(`Found users with 'alice': ${foundUsers.length}`);

export { add, subtract, multiply, divide, average };
export { Person, Calculator, UserService };

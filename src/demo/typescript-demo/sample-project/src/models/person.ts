/**
 * Represents a person with basic information
 */
export interface IPerson {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    age?: number;
}

/**
 * Person class implementing the IPerson interface
 */
export class Person implements IPerson {
    public id: number;
    public firstName: string;
    public lastName: string;
    public email?: string;
    public age?: number;

    constructor(data: IPerson) {
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.age = data.age;
    }

    /**
     * Get the full name of the person
     */
    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    /**
     * Check if the person is an adult (age >= 18)
     */
    isAdult(): boolean {
        return this.age !== undefined && this.age >= 18;
    }

    /**
     * Create a greeting message
     */
    greet(): string {
        return `Hello, my name is ${this.getFullName()}`;
    }

    /**
     * Convert to JSON-friendly object
     */
    toJSON(): IPerson {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            age: this.age
        };
    }

    /**
     * Create a Person from a JSON object
     */
    static fromJSON(json: IPerson): Person {
        return new Person(json);
    }
}

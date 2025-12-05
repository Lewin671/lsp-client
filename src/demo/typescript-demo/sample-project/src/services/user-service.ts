import { Person, IPerson } from '../models/person';

/**
 * User service for managing person records
 */
export class UserService {
    private users: Map<number, Person> = new Map();
    private nextId: number = 1;

    /**
     * Create a new user
     */
    createUser(data: Omit<IPerson, 'id'>): Person {
        const user = new Person({
            ...data,
            id: this.nextId++
        });
        this.users.set(user.id, user);
        return user;
    }

    /**
     * Get a user by ID
     */
    getUserById(id: number): Person | undefined {
        return this.users.get(id);
    }

    /**
     * Get all users
     */
    getAllUsers(): Person[] {
        return Array.from(this.users.values());
    }

    /**
     * Update a user
     */
    updateUser(id: number, updates: Partial<Omit<IPerson, 'id'>>): Person | undefined {
        const user = this.users.get(id);
        if (!user) {
            return undefined;
        }

        if (updates.firstName !== undefined) {
            user.firstName = updates.firstName;
        }
        if (updates.lastName !== undefined) {
            user.lastName = updates.lastName;
        }
        if (updates.email !== undefined) {
            user.email = updates.email;
        }
        if (updates.age !== undefined) {
            user.age = updates.age;
        }

        return user;
    }

    /**
     * Delete a user
     */
    deleteUser(id: number): boolean {
        return this.users.delete(id);
    }

    /**
     * Find users by name
     */
    findUsersByName(name: string): Person[] {
        const lowerName = name.toLowerCase();
        return this.getAllUsers().filter(user => {
            const fullName = user.getFullName().toLowerCase();
            return fullName.includes(lowerName);
        });
    }

    /**
     * Get adult users only
     */
    getAdultUsers(): Person[] {
        return this.getAllUsers().filter(user => user.isAdult());
    }

    /**
     * Get user count
     */
    getUserCount(): number {
        return this.users.size;
    }
}

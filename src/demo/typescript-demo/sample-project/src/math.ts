/**
 * A simple math utility module
 */

/**
 * Adds two numbers together
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
    return a + b;
}

/**
 * Subtracts b from a
 * @param a First number
 * @param b Second number
 * @returns The difference a - b
 */
export function subtract(a: number, b: number): number {
    return a - b;
}

/**
 * Multiplies two numbers
 * @param a First number
 * @param b Second number
 * @returns The product of a and b
 */
export function multiply(a: number, b: number): number {
    return a * b;
}

/**
 * Divides a by b
 * @param a Dividend
 * @param b Divisor
 * @returns The quotient a / b
 * @throws Error if b is zero
 */
export function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error('Cannot divide by zero');
    }
    return a / b;
}

/**
 * Calculates the average of an array of numbers
 * @param numbers Array of numbers
 * @returns The average value
 */
export function average(numbers: number[]): number {
    if (numbers.length === 0) {
        return 0;
    }
    const sum = numbers.reduce((acc, val) => add(acc, val), 0);
    return divide(sum, numbers.length);
}

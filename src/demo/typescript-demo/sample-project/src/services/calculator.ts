import { add, subtract, multiply, divide, average } from '../math';

/**
 * Calculator operation types
 */
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Result of a calculation
 */
export interface CalculationResult {
    operation: Operation;
    operands: number[];
    result: number;
    timestamp: Date;
}

/**
 * Calculator service with history tracking
 */
export class Calculator {
    private history: CalculationResult[] = [];

    /**
     * Perform a calculation
     */
    calculate(operation: Operation, a: number, b: number): CalculationResult {
        let result: number;
        
        switch (operation) {
            case 'add':
                result = add(a, b);
                break;
            case 'subtract':
                result = subtract(a, b);
                break;
            case 'multiply':
                result = multiply(a, b);
                break;
            case 'divide':
                result = divide(a, b);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        const calculationResult: CalculationResult = {
            operation,
            operands: [a, b],
            result,
            timestamp: new Date()
        };

        this.history.push(calculationResult);
        return calculationResult;
    }

    /**
     * Calculate the average of all results in history
     */
    getAverageResult(): number {
        const results = this.history.map(h => h.result);
        return average(results);
    }

    /**
     * Get calculation history
     */
    getHistory(): CalculationResult[] {
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Get the last calculation result
     */
    getLastResult(): CalculationResult | undefined {
        return this.history[this.history.length - 1];
    }
}

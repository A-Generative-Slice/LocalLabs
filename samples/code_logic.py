def calculate_fibonacci(n):
    """
    Calculates the nth Fibonacci number using dynamic programming.
    """
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    
    fib = [0] * (n + 1)
    fib[1] = 1
    
    for i in range(2, n + 1):
        fib[i] = fib[i-1] + fib[i-2]
        
    return fib[n]

def is_prime(n):
    """
    Checks if a number is prime.
    """
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

# Example usage
if __name__ == "__main__":
    test_n = 10
    print(f"Fibonacci({test_n}) = {calculate_fibonacci(test_n)}")
    print(f"Is {test_n} prime? {is_prime(test_n)}")

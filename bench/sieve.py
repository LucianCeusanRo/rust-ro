# Sieve of Eratosthenes up to N, pure Python (no numpy). Same algorithm as sieve.rs.
import sys

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000_000
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    i = 2
    while i * i <= n:
        if is_prime[i]:
            j = i * i
            while j <= n:
                is_prime[j] = False
                j += i
        i += 1
    count = 0
    total = 0
    for k in range(n + 1):
        if is_prime[k]:
            count += 1
            total += k
    print(count, total)

main()

# Longest Collatz chain for starting values below N (pure CPU, integer loop). Same as collatz.rs.
import sys

def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
    best, best_start = 0, 0
    for start in range(1, n):
        x, steps = start, 0
        while x != 1:
            x = x // 2 if x % 2 == 0 else 3 * x + 1
            steps += 1
        if steps > best:
            best, best_start = steps, start
    print(best_start, best)

main()

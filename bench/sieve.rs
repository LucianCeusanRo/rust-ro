// Sieve of Eratosthenes up to N. Same algorithm as sieve.py.
fn main() {
    let n: usize = std::env::args().nth(1).and_then(|s| s.parse().ok()).unwrap_or(10_000_000);
    let mut is_prime = vec![true; n + 1];
    is_prime[0] = false;
    is_prime[1] = false;
    let mut i = 2;
    while i * i <= n {
        if is_prime[i] {
            let mut j = i * i;
            while j <= n {
                is_prime[j] = false;
                j += i;
            }
        }
        i += 1;
    }
    let mut count = 0u64;
    let mut total = 0u64;
    for (k, &p) in is_prime.iter().enumerate() {
        if p {
            count += 1;
            total += k as u64;
        }
    }
    println!("{count} {total}");
}

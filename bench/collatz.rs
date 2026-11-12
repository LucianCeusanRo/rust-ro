// Longest Collatz chain for starting values below N (pure CPU, integer loop). Same as collatz.py.
fn main() {
    let n: u64 = std::env::args().nth(1).and_then(|s| s.parse().ok()).unwrap_or(1_000_000);
    let (mut best, mut best_start) = (0u32, 0u64);
    for start in 1..n {
        let (mut x, mut steps) = (start, 0u32);
        while x != 1 {
            x = if x % 2 == 0 { x / 2 } else { 3 * x + 1 };
            steps += 1;
        }
        if steps > best {
            best = steps;
            best_start = start;
        }
    }
    println!("{best_start} {best}");
}

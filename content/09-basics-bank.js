/* Extra bank questions for lessons 1–6 (the v1 lessons). The v1 per-lesson quizzes are merged
 * into the bank by 99-bank-merge.js. */
(function () {
  const c = window.RUST_C;
  QB("l1", [
    ["Ce afișează? || What does it print?", ["Salut, Rust!", "Salut, {}!", "\"Salut, Rust!\"", "Salut, !"], "`{}` e înlocuit cu valoarea (formatare `Display`). || `{}` is replaced by the value (`Display` formatting).", { k: "out", c: c`
fn main() {
    let limbaj = "Rust";
    println!("Salut, {}!", limbaj);
}` }],
    ["Ce afișează? || What does it print?", ["\"rust\" rust", "rust rust", "\"rust\" \"rust\"", "rust \"rust\""], "`{:?}` (Debug) pune ghilimele în jurul șirurilor; `{}` nu. || `{:?}` (Debug) puts quotes around strings; `{}` doesn't.", { k: "out", c: c`
fn main() {
    let s = "rust";
    println!("{:?} {}", s, s);
}` }],
    ["Ce afișează? || What does it print?", ["[  42] [42  ] [0042]", "[42] [42] [42]", "[  42] [  42] [0042]", "[42  ] [  42] [4200]"], "`{:>4}` aliniază la dreapta, `{:<4}` la stânga, `{:04}` completează cu zerouri. || `{:>4}` right-aligns, `{:<4}` left-aligns, `{:04}` pads with zeros.", { k: "out", c: c`
fn main() {
    println!("[{:>4}] [{:<4}] [{:04}]", 42, 42, 42);
}` }],
    ["Ce afișează? || What does it print?", ["3.14 ff 0b101", "3.14159 ff 101", "3.14 FF 0b101", "3.1 0xff 5"], "`{:.2}` = 2 zecimale, `{:x}` = hexa minuscul, `{:#b}` = binar cu prefix. || `{:.2}` = 2 decimals, `{:x}` = lower-case hex, `{:#b}` = binary with prefix.", { k: "out", c: c`
fn main() {
    println!("{:.2} {:x} {:#b}", 3.14159, 255, 5);
}` }],
    ["Ce afișează? || What does it print?", ["port=22 port=22", "port={p} port=22", "port=p port=22", "nu compilează || doesn't compile"], "Din Rust 2021 poți scrie variabila direct între acolade: `{p}`. || Since Rust 2021 you can name the variable inside the braces: `{p}`.", { k: "out", c: c`
fn main() {
    let p = 22;
    println!("port={p} port={}", p);
}` }],
    ["Ce afișează? || What does it print?", ["{}", "{{}}", "nu compilează || doesn't compile", "()"], "Acoladele duble sunt „escape” pentru o acoladă literală. || Double braces escape a literal brace.", { k: "out", c: c`
fn main() {
    println!("{{}}");
}` }],
    ["Ce eroare dă `println!` cu mai puține argumente decât `{}`? || What happens when `println!` has fewer arguments than `{}`?", ["Eroare de compilare || A compile error", "Afișează `{}` || It prints `{}`", "Panic la rulare || A runtime panic", "Afișează gol || It prints nothing"], "Macro-ul verifică șirul de format la compilare. || The macro checks the format string at compile time."],
    ["Ce face `cargo check`? || What does `cargo check` do?", ["Verifică dacă proiectul compilează, fără să genereze executabil — mai rapid decât `cargo build` || Checks the project compiles without producing a binary — faster than `cargo build`", "Rulează testele || Runs the tests", "Verifică stilul codului || Checks code style", "Actualizează dependențele || Updates dependencies"], "Util în timp ce scrii cod. || Handy while you write code."],
    ["Ce face `cargo fmt`? || What does `cargo fmt` do?", ["Formatează codul după stilul standard (rustfmt) || Formats the code in the standard style (rustfmt)", "Compilează în release || Builds in release", "Șterge `target/` || Deletes `target/`", "Formatează discul || Formats the disk"], "`cargo clippy` dă în plus sugestii de îmbunătățire (lint-uri). || `cargo clippy` additionally gives improvement suggestions (lints)."],
    ["În ce fișier declari dependențele unui proiect Cargo? || In which file do you declare a Cargo project's dependencies?", ["`Cargo.toml`", "`Cargo.lock`", "`main.rs`", "`deps.txt`"], "`Cargo.lock` e generat și fixează versiunile exacte. || `Cargo.lock` is generated and pins exact versions."],
    ["Unde e pus executabilul după `cargo build`? || Where is the executable placed after `cargo build`?", ["`target/debug/`", "`bin/`", "`src/`", "`build/release/`"], "`cargo build --release` îl pune în `target/release/`. || `cargo build --release` puts it in `target/release/`."],
    ["Ce face `cargo add serde`? || What does `cargo add serde` do?", ["Adaugă ultima versiune compatibilă a crate-ului `serde` în `Cargo.toml` || Adds the latest compatible version of `serde` to `Cargo.toml`", "Instalează un program global || Installs a global program", "Publică crate-ul || Publishes the crate", "Creează un fișier `serde.rs` || Creates a `serde.rs` file"], "Crate-urile vin de pe crates.io. || Crates come from crates.io."],
    ["Ce afișează programul pe stdout? || What does the program print to stdout?", ["stdout", "stderr\nstdout", "stdout\nstderr", "nimic || nothing"], "`eprintln!` scrie pe stderr, care nu e parte din stdout. || `eprintln!` writes to stderr, which isn't part of stdout.", { k: "out", c: c`
fn main() {
    eprintln!("stderr");
    println!("stdout");
}` }],
    ["Ce face `rustup update`? || What does `rustup update` do?", ["Actualizează toolchain-ul Rust instalat (rustc, cargo, std) || Updates the installed Rust toolchain (rustc, cargo, std)", "Actualizează dependențele proiectului || Updates project dependencies", "Actualizează sistemul de operare || Updates the OS", "Șterge Rust || Removes Rust"], "Rust stable are o versiune nouă la fiecare 6 săptămâni. || Stable Rust gets a new release every 6 weeks."]
  ]);
  QB("l2", [
    ["Ce eroare dă atribuirea unei variabile fără `mut`? || Which error does assigning to a variable without `mut` give?", ["E0384", "E0382", "E0308", "E0596"], "E0384: nu poți atribui de două ori unei variabile imutabile. || E0384: cannot assign twice to an immutable variable.", { k: "err", err: "E0384", c: c`
fn main() {
    let x = 5;
    x = 6;
    println!("{x}");
}` }],
    ["Ce afișează? || What does it print?", ["12 text", "6 text", "nu compilează || doesn't compile", "12 12"], "Shadowing: fiecare `let` creează o variabilă nouă, chiar și de alt tip. || Shadowing: each `let` creates a new variable, even of another type.", { k: "out", c: c`
fn main() {
    let x = 6;
    let x = x * 2;
    let y = "text";
    let y = y.len();
    let y = if y == 4 { "text" } else { "?" };
    println!("{x} {y}");
}` }],
    ["Ce afișează? || What does it print?", ["5 10", "10 10", "5 5", "10 5"], "Shadowing-ul din blocul interior dispare la ieșirea din bloc. || The inner block's shadowing ends when the block ends.", { k: "out", c: c`
fn main() {
    let x = 5;
    {
        let x = x * 2;
        let _ = x;
    }
    let y = { let x = x * 2; x };
    println!("{x} {y}");
}` }],
    ["Ce afișează? || What does it print?", ["255 -128 4294967295", "256 -127 4294967296", "255 127 65535", "127 -128 4294967295"], "`u8` are 0..=255, `i8` are -128..=127, `u32` până la 2^32−1. || `u8` is 0..=255, `i8` is -128..=127, `u32` goes up to 2^32−1.", { k: "out", c: c`
fn main() {
    println!("{} {} {}", u8::MAX, i8::MIN, u32::MAX);
}` }],
    ["Ce afișează? || What does it print?", ["44 3 -1", "300 3 -1", "44 3.7 255", "44 4 -1"], "`as` trunchiază: 300 mod 256 = 44; `f64` → `i32` taie zecimalele; 255 ca `i8` = -1. || `as` truncates: 300 mod 256 = 44; `f64` → `i32` drops decimals; 255 as `i8` = -1.", { k: "out", c: c`
fn main() {
    let a = 300i32 as u8;
    let b = 3.7f64 as i32;
    let c = 255u8 as i8;
    println!("{a} {b} {c}");
}` }],
    ["Ce afișează? || What does it print?", ["Err Ok(200)", "Ok(44) Ok(200)", "Err Err", "Ok(300) Ok(200)"], "`u8::try_from` verifică intervalul și întoarce `Err` dacă nu încape. || `u8::try_from` checks the range and returns `Err` if it doesn't fit.", { k: "out", c: c`
fn main() {
    let a = u8::try_from(300i32);
    let b = u8::try_from(200i32);
    println!("{} {:?}", if a.is_err() { "Err" } else { "Ok" }, b);
}` }],
    ["Ce se întâmplă la `let x: u8 = 255; x + 1` în modul debug? || What happens with `let x: u8 = 255; x + 1` in debug mode?", ["Panic: attempt to add with overflow || Panic: attempt to add with overflow", "Rezultatul e 0 || The result is 0", "Rezultatul e 256 || The result is 256", "Eroare de compilare mereu || Always a compile error"], "În release, implicit, valoarea „trece peste” (wrap) la 0. Pentru control explicit: `checked_add`, `wrapping_add`, `saturating_add`. || In release it wraps to 0 by default. For explicit control: `checked_add`, `wrapping_add`, `saturating_add`."],
    ["Ce afișează? || What does it print?", ["2 2.5 1", "2.5 2.5 1", "2 2 1", "3 2.5 1"], "Împărțirea întreagă trunchiază; `%` e restul. || Integer division truncates; `%` is the remainder.", { k: "out", c: c`
fn main() {
    println!("{} {} {}", 5 / 2, 5.0 / 2.0, 5 % 2);
}` }],
    ["Ce eroare dă `let x: i32 = 5; let y: i64 = x;`? || Which error does `let x: i32 = 5; let y: i64 = x;` give?", ["E0308", "E0384", "E0277", "E0369"], "Rust nu face conversii implicite între tipuri numerice; scrii `i64::from(x)` sau `x as i64`. || Rust doesn't convert numeric types implicitly; write `i64::from(x)` or `x as i64`.", { k: "err", err: "E0308", c: c`
fn main() {
    let x: i32 = 5;
    let y: i64 = x;
    println!("{y}");
}` }],
    ["Ce afișează? || What does it print?", ["(\"eth0\", 1500, true) 1500", "eth0 1500 true 1500", "(eth0, 1500, true) 1500", "nu compilează || doesn't compile"], "Tuplurile se accesează cu `.0`, `.1`, ... || Tuples are accessed with `.0`, `.1`, ...", { k: "out", c: c`
fn main() {
    let interfata = ("eth0", 1500, true);
    println!("{:?} {}", interfata, interfata.1);
}` }],
    ["Ce afișează? || What does it print?", ["[0, 0, 0, 0] 4 22", "[0; 4] 4 22", "[0, 0, 0, 0] 3 22", "[] 0 22"], "`[0; 4]` = tablou de 4 zerouri; dimensiunea face parte din tip. || `[0; 4]` = an array of 4 zeros; the size is part of the type.", { k: "out", c: c`
fn main() {
    let z = [0u8; 4];
    let porturi = [22, 80, 443];
    println!("{:?} {} {}", z, z.len(), porturi[0]);
}` }],
    ["Ce se întâmplă la `porturi[10]` pe un tablou de 3 elemente, cu indexul calculat la rulare? || What happens with `porturi[10]` on a 3-element array, with the index computed at runtime?", ["Panic: index out of bounds || Panic: index out of bounds", "Citește memorie aleatoare || Reads random memory", "Întoarce 0 || Returns 0", "Întoarce `None` || Returns `None`"], "Rust verifică limitele. Pentru acces fără panic: `porturi.get(10)` → `None`. || Rust checks bounds. For panic-free access: `porturi.get(10)` → `None`.", { k: "ok", c: c`
fn main() {
    let porturi = [22, 80, 443];
    let i = std::env::args().count() + 9;
    let r = std::panic::catch_unwind(|| porturi[i]);
    assert!(r.is_err());
    assert_eq!(porturi.get(i), None);
}` }],
    ["Ce afișează? || What does it print?", ["4 1 '🦀'", "1 1 '🦀'", "4 4 '🦀'", "2 1 '🦀'"], "Un `char` are 4 octeți (o valoare Unicode); în UTF-8, „🦀” ocupă 4 octeți, „a” unul. || A `char` is 4 bytes (a Unicode scalar); in UTF-8 “🦀” takes 4 bytes, “a” one.", { k: "out", c: c`
fn main() {
    println!("{} {} {:?}", std::mem::size_of::<char>(), "a".len(), '🦀');
}` }],
    ["Ce diferență e între `const` și `let`? || What's the difference between `const` and `let`?", ["`const` cere tipul explicit și o valoare calculabilă la compilare; e valabil oriunde e vizibil || `const` needs an explicit type and a compile-time value; it's usable wherever visible", "Nu e nicio diferență || No difference", "`const` poate fi modificat cu `mut` || `const` can be made `mut`", "`let` e doar pentru numere || `let` is only for numbers"], "Convenția: `const MTU_MAX: u32 = 9000;` (majuscule). || Convention: `const MTU_MAX: u32 = 9000;` (upper case)."],
    ["Ce afișează? || What does it print?", ["true false", "false false", "true true", "false true"], "0.1 + 0.2 nu e exact 0.3 în virgulă mobilă (IEEE 754); compari cu o toleranță. || 0.1 + 0.2 isn't exactly 0.3 in floating point (IEEE 754); compare with a tolerance.", { k: "out", c: c`
fn main() {
    let s = 0.1 + 0.2;
    println!("{} {}", (s - 0.3f64).abs() < 1e-9, s == 0.3);
}` }]
  ]);
  QB("l3", [
    ["Ce afișează? || What does it print?", ["7", "()", "nu compilează || doesn't compile", "34"], "Ultima expresie fără `;` e valoarea întoarsă. || The last expression without `;` is the return value.", { k: "out", c: c`
fn aduna(a: i32, b: i32) -> i32 {
    a + b
}
fn main() {
    println!("{}", aduna(3, 4));
}` }],
    ["Ce eroare dă `fn f() -> i32 { 5; }`? || Which error does `fn f() -> i32 { 5; }` give?", ["E0308", "E0384", "E0425", "E0061"], "Cu `;`, corpul devine o instrucțiune și funcția întoarce `()`, nu `i32`. || With `;` the body becomes a statement and the function returns `()`, not `i32`.", { k: "err", err: "E0308", c: c`
fn f() -> i32 {
    5;
}
fn main() {
    println!("{}", f());
}` }],
    ["Ce eroare dă apelul unei funcții cu prea puține argumente? || Which error does calling a function with too few arguments give?", ["E0061", "E0308", "E0425", "E0599"], "E0061: numărul de argumente nu corespunde. Rust nu are parametri impliciți. || E0061: wrong number of arguments. Rust has no default parameters.", { k: "err", err: "E0061", c: c`
fn aduna(a: i32, b: i32) -> i32 { a + b }
fn main() {
    println!("{}", aduna(1));
}` }],
    ["Ce afișează? || What does it print?", ["mare", "mic", "nu compilează || doesn't compile", "()"], "`if` e o expresie: ambele ramuri au tipul `&str`. || `if` is an expression: both branches have type `&str`.", { k: "out", c: c`
fn main() {
    let mtu = 9000;
    let tip = if mtu > 1500 { "mare" } else { "mic" };
    println!("{tip}");
}` }],
    ["Ce eroare dă `let x = if c { 1 } else { \"doi\" };`? || Which error does `let x = if c { 1 } else { \"doi\" };` give?", ["E0308", "E0277", "E0384", "E0282"], "Ramurile lui `if` trebuie să aibă același tip. || The branches of an `if` must have the same type.", { k: "err", err: "E0308", c: c`
fn main() {
    let c = true;
    let x = if c { 1 } else { "doi" };
}` }],
    ["Ce eroare dă `if x { }` când `x` e `i32`? || Which error does `if x { }` give when `x` is an `i32`?", ["E0308", "E0600", "E0369", "E0277"], "Condiția trebuie să fie `bool`; Rust nu convertește numerele în bool. || The condition must be a `bool`; Rust doesn't convert numbers to bool.", { k: "err", err: "E0308", c: c`
fn main() {
    let x = 1;
    if x {
        println!("da");
    }
}` }],
    ["Ce afișează? || What does it print?", ["8", "4", "16", "nu se termină || never ends"], "`break valoare` întoarce o valoare din `loop`. || `break value` returns a value from a `loop`.", { k: "out", c: c`
fn main() {
    let mut n = 1;
    let r = loop {
        n *= 2;
        if n > 5 { break n; }
    };
    println!("{r}");
}` }],
    ["Ce afișează? || What does it print?", ["1 2 3 4 ", "1 2 3 4 5 ", "0 1 2 3 4 ", "2 3 4 5 "], "`1..5` exclude 5; `1..=5` l-ar include. || `1..5` excludes 5; `1..=5` would include it.", { k: "out", c: c`
fn main() {
    for i in 1..5 {
        print!("{i} ");
    }
    println!();
}` }],
    ["Ce afișează? || What does it print?", ["3 2 1 start!", "1 2 3 start!", "3 2 1 0 start!", "start!"], "`.rev()` parcurge intervalul invers. || `.rev()` walks the range backwards.", { k: "out", c: c`
fn main() {
    for i in (1..=3).rev() {
        print!("{i} ");
    }
    println!("start!");
}` }],
    ["Ce afișează? || What does it print?", ["(1, 1)", "(0, 0)", "(2, 2)", "(1, 2)"], "`continue 'ext` sare la următoarea iterație a buclei exterioare, `break 'ext` o oprește. || `continue 'ext` jumps to the outer loop's next iteration, `break 'ext` stops it.", { k: "out", c: c`
fn main() {
    let mut gasit = (0, 0);
    'ext: for i in 0..3 {
        for j in 0..3 {
            if j > i { continue 'ext; }
            if i * j == 1 { gasit = (i, j); break 'ext; }
        }
    }
    println!("{:?}", gasit);
}` }],
    ["Ce afișează? || What does it print?", ["0: 22\n1: 80", "22: 0\n80: 1", "0\n1", "22\n80"], "`enumerate()` dă perechi (index, element). || `enumerate()` yields (index, item) pairs.", { k: "out", c: c`
fn main() {
    for (i, p) in [22, 80].iter().enumerate() {
        println!("{i}: {p}");
    }
}` }],
    ["Ce afișează? || What does it print?", ["3", "4", "2", "0"], "`while` rulează cât timp condiția e adevărată: 10 → 5 → 2 → 1 (3 pași). || `while` runs while the condition holds: 10 → 5 → 2 → 1 (3 steps).", { k: "out", c: c`
fn main() {
    let mut n = 10;
    let mut pasi = 0;
    while n > 1 {
        n /= 2;
        pasi += 1;
    }
    println!("{pasi}");
}` }],
    ["Ce afișează? || What does it print?", ["120", "24", "720", "1"], "Recursivitate: 5! = 120. || Recursion: 5! = 120.", { k: "out", c: c`
fn fact(n: u64) -> u64 {
    if n <= 1 { 1 } else { n * fact(n - 1) }
}
fn main() {
    println!("{}", fact(5));
}` }],
    ["Ce face `return` la mijlocul unei funcții? || What does `return` do in the middle of a function?", ["Iese imediat din funcție cu valoarea dată || Exits the function immediately with the given value", "Iese din buclă || Exits the loop", "Oprește programul || Stops the program", "Nimic, e doar stil || Nothing, it's just style"], "Pentru ultima valoare, stilul idiomatic e expresia fără `;`. || For the final value, the idiomatic style is the expression without `;`."],
    ["Ce afișează? || What does it print?", ["(3, 1)", "(1, 3)", "3", "(3.0, 1.0)"], "O funcție poate întoarce mai multe valori într-un tuplu. || A function can return several values in a tuple.", { k: "out", c: c`
fn imparte(a: u32, b: u32) -> (u32, u32) {
    (a / b, a % b)
}
fn main() {
    println!("{:?}", imparte(10, 3));
}` }]
  ]);
  QB("l4", [
    ["Ce eroare dă folosirea unui `String` după ce a fost mutat? || Which error does using a `String` after it was moved give?", ["E0382", "E0499", "E0502", "E0505"], "E0382: use of moved value. Dacă ai nevoie de ambele, `.clone()` sau un împrumut `&`. || E0382: use of moved value. If you need both, `.clone()` or borrow with `&`.", { k: "err", err: "E0382", c: c`
fn main() {
    let a = String::from("vlan10");
    let b = a;
    println!("{a} {b}");
}` }],
    ["Ce afișează? || What does it print?", ["5 5", "eroare E0382 || error E0382", "5 0", "0 5"], "`i32` e `Copy`: atribuirea copiază, nu mută. || `i32` is `Copy`: assignment copies instead of moving.", { k: "out", c: c`
fn main() {
    let a = 5;
    let b = a;
    println!("{a} {b}");
}` }],
    ["Ce eroare dă folosirea unui `String` după ce a fost trimis unei funcții prin valoare? || Which error does using a `String` after passing it to a function by value give?", ["E0382", "E0308", "E0599", "E0425"], "Funcția a preluat proprietatea. Trimite `&s` dacă vrei doar să-l citească. || The function took ownership. Pass `&s` if it only needs to read.", { k: "err", err: "E0382", c: c`
fn afiseaza(s: String) { println!("{s}"); }
fn main() {
    let s = String::from("sw1");
    afiseaza(s);
    println!("{}", s.len());
}` }],
    ["Ce afișează? || What does it print?", ["sw1 3", "3 sw1", "nu compilează || doesn't compile", "sw1 0"], "`&s` împrumută, deci `s` rămâne valid după apel. || `&s` borrows, so `s` stays valid after the call.", { k: "out", c: c`
fn lungime(s: &String) -> usize { s.len() }
fn main() {
    let s = String::from("sw1");
    let n = lungime(&s);
    println!("{s} {n}");
}` }],
    ["Ce afișează? || What does it print?", ["router-01", "router", "-01", "nu compilează || doesn't compile"], "`push_str` modifică șirul prin referința `&mut`. || `push_str` modifies the string through the `&mut` reference.", { k: "out", c: c`
fn adauga_sufix(s: &mut String) { s.push_str("-01"); }
fn main() {
    let mut s = String::from("router");
    adauga_sufix(&mut s);
    println!("{s}");
}` }],
    ["Ce eroare dă `let r = &s; s.push('x'); println!(\"{r}\");`? || Which error does `let r = &s; s.push('x'); println!(\"{r}\");` give?", ["E0502", "E0499", "E0382", "E0596"], "E0502: nu poți împrumuta mutabil cât timp există un împrumut imutabil folosit mai târziu. || E0502: can't borrow mutably while an immutable borrow is still used later.", { k: "err", err: "E0502", c: c`
fn main() {
    let mut s = String::from("a");
    let r = &s;
    s.push('x');
    println!("{r}");
}` }],
    ["Ce afișează? || What does it print?", ["ax", "a", "nu compilează || doesn't compile", "x"], "Ultima folosire a lui `r` e înainte de `push`, deci împrumutul s-a terminat (NLL). || `r`'s last use is before `push`, so the borrow has ended (NLL).", { k: "out", c: c`
fn main() {
    let mut s = String::from("a");
    let r = &s;
    let _ = r.len();
    s.push('x');
    println!("{s}");
}` }],
    ["Ce eroare dă împrumutul `&mut` al unei variabile declarate fără `mut`? || Which error does a `&mut` borrow of a non-`mut` variable give?", ["E0596", "E0384", "E0502", "E0499"], "E0596: cannot borrow as mutable. Declară `let mut s`. || E0596: cannot borrow as mutable. Declare `let mut s`.", { k: "err", err: "E0596", c: c`
fn main() {
    let s = String::from("a");
    let r = &mut s;
    r.push('b');
}` }],
    ["Ce eroare dă o funcție care întoarce o referință la o variabilă locală? || Which error does a function returning a reference to a local variable give?", ["E0106", "E0382", "E0499", "E0308"], "E0106: lipsește specificatorul de lifetime — nu există de unde să împrumuți. Întoarce `String` (proprietate). || E0106: missing lifetime specifier — there's nothing to borrow from. Return a `String` (ownership).", { k: "err", err: "E0106", c: c`
fn nume() -> &str {
    let s = String::from("sw1");
    &s
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["\"192\" \"168.1.1\"", "\"192.\" \"168.1.1\"", "\"192\" \"168\"", "\"1\" \"92\""], "Slice-urile `&s[..3]` și `&s[4..]` împrumută părți din șir. || The slices `&s[..3]` and `&s[4..]` borrow parts of the string.", { k: "out", c: c`
fn main() {
    let s = String::from("192.168.1.1");
    println!("{:?} {:?}", &s[..3], &s[4..]);
}` }],
    ["Ce afișează? || What does it print?", ["[80, 443] 2", "[22, 80] 2", "[443] 1", "[22, 80, 443] 3"], "`&v[1..]` = slice de la indexul 1 până la final. || `&v[1..]` = a slice from index 1 to the end.", { k: "out", c: c`
fn main() {
    let v = vec![22, 80, 443];
    let s: &[i32] = &v[1..];
    println!("{:?} {}", s, s.len());
}` }],
    ["Ce afișează? || What does it print?", ["router router", "nu compilează || doesn't compile", "router ", " router"], "`.clone()` copiază datele pe heap; ambele variabile sunt valide. || `.clone()` copies the heap data; both variables stay valid.", { k: "out", c: c`
fn main() {
    let a = String::from("router");
    let b = a.clone();
    println!("{a} {b}");
}` }],
    ["De ce primește o funcție `&str` în loc de `&String`? || Why should a function take `&str` instead of `&String`?", ["Acceptă și `&String` (prin deref) și literale `\"...\"`, deci e mai generală || It accepts both `&String` (via deref) and `\"...\"` literals, so it's more general", "E mai sigur la memorie || It's more memory-safe", "`&String` nu compilează || `&String` doesn't compile", "Nu contează || It doesn't matter"], "Același principiu: `&[T]` în loc de `&Vec<T>`. || Same idea: `&[T]` instead of `&Vec<T>`."],
    ["Când e eliberată memoria unui `String`? || When is a `String`'s memory freed?", ["Când proprietarul iese din scope (se apelează `drop`) || When its owner goes out of scope (`drop` is called)", "Când rulează garbage collector-ul || When the garbage collector runs", "La finalul programului || At the end of the program", "Trebuie apelat `free` manual || You must call `free` manually"], "Nu există GC; eliberarea e determinată la compilare. || There's no GC; freeing is determined at compile time."],
    ["Ce eroare dă mutarea unei valori dintr-un `Vec` prin index (`let s = v[0];` cu `Vec<String>`)? || Which error does moving out of a `Vec` by index (`let s = v[0];` with `Vec<String>`) give?", ["E0507", "E0382", "E0499", "E0308"], "E0507: nu poți muta dintr-un conținut împrumutat. Folosește `&v[0]`, `.clone()` sau `v.remove(0)`. || E0507: cannot move out of borrowed content. Use `&v[0]`, `.clone()` or `v.remove(0)`.", { k: "err", err: "E0507", c: c`
fn main() {
    let v = vec![String::from("a")];
    let s = v[0];
    println!("{s}");
}` }]
  ]);
  QB("l5", [
    ["Ce afișează? || What does it print?", ["Port { nr: 22, deschis: true }", "Port(22, true)", "{ nr: 22, deschis: true }", "nu compilează || doesn't compile"], "`#[derive(Debug)]` generează formatarea `{:?}`. || `#[derive(Debug)]` generates the `{:?}` formatting.", { k: "out", c: c`
#[derive(Debug)]
struct Port { nr: u16, deschis: bool }
fn main() {
    println!("{:?}", Port { nr: 22, deschis: true });
}` }],
    ["Ce eroare dă `println!(\"{:?}\", p)` fără `#[derive(Debug)]`? || Which error does `println!(\"{:?}\", p)` without `#[derive(Debug)]` give?", ["E0277", "E0599", "E0425", "E0369"], "E0277: tipul nu implementează trait-ul `Debug`. || E0277: the type doesn't implement the `Debug` trait.", { k: "err", err: "E0277", c: c`
struct Port { nr: u16 }
fn main() {
    let p = Port { nr: 22 };
    println!("{:?}", p);
}` }],
    ["Ce afișează? || What does it print?", ["10.0.0.1:443 (https)", "10.0.0.1 443 https", "nu compilează || doesn't compile", "Server { ip: \"10.0.0.1\", port: 443 }"], "Metoda primește `&self`, deci doar citește. || The method takes `&self`, so it only reads.", { k: "out", c: c`
struct Server { ip: String, port: u16 }
impl Server {
    fn adresa(&self) -> String {
        let nume = if self.port == 443 { "https" } else { "?" };
        format!("{}:{} ({})", self.ip, self.port, nume)
    }
}
fn main() {
    let s = Server { ip: "10.0.0.1".into(), port: 443 };
    println!("{}", s.adresa());
}` }],
    ["Ce afișează? || What does it print?", ["Interfata { nume: \"eth1\", mtu: 1500, activ: false }", "Interfata { nume: \"eth0\", mtu: 1500, activ: false }", "Interfata { nume: \"eth1\", mtu: 9000, activ: true }", "nu compilează || doesn't compile"], "Sintaxa `..implicit` copiază câmpurile nespecificate. || The `..implicit` syntax fills in the unspecified fields.", { k: "out", c: c`
#[derive(Debug, Clone)]
struct Interfata { nume: String, mtu: u32, activ: bool }
fn main() {
    let implicit = Interfata { nume: "eth0".into(), mtu: 1500, activ: false };
    let a = Interfata { nume: "eth1".into(), ..implicit.clone() };
    println!("{:?}", a);
}` }],
    ["Ce afișează? || What does it print?", ["2", "1", "0", "3"], "Funcția asociată `nou` (fără `self`) e un constructor; `incrementeaza` cere `&mut self`. || The associated function `nou` (no `self`) is a constructor; `incrementeaza` needs `&mut self`.", { k: "out", c: c`
struct Contor { n: u32 }
impl Contor {
    fn nou() -> Self { Contor { n: 0 } }
    fn incrementeaza(&mut self) { self.n += 1; }
}
fn main() {
    let mut c = Contor::nou();
    c.incrementeaza();
    c.incrementeaza();
    println!("{}", c.n);
}` }],
    ["Ce afișează? || What does it print?", ["TCP 443\nUDP 53\nICMP", "TCP\nUDP\nICMP", "443\n53\n0", "nu compilează || doesn't compile"], "Variantele unui enum pot purta date diferite. || Enum variants can carry different data.", { k: "out", c: c`
enum Proto { Tcp(u16), Udp(u16), Icmp }
fn descrie(p: &Proto) -> String {
    match p {
        Proto::Tcp(port) => format!("TCP {port}"),
        Proto::Udp(port) => format!("UDP {port}"),
        Proto::Icmp => "ICMP".to_string(),
    }
}
fn main() {
    for p in [Proto::Tcp(443), Proto::Udp(53), Proto::Icmp] {
        println!("{}", descrie(&p));
    }
}` }],
    ["Ce eroare dă un `match` care nu acoperă toate variantele? || Which error does a `match` that misses variants give?", ["E0004", "E0308", "E0023", "E0599"], "E0004: tipare neacoperite. Adaugă variantele lipsă sau `_ => ...`. || E0004: non-exhaustive patterns. Add the missing variants or `_ => ...`.", { k: "err", err: "E0004", c: c`
enum Proto { Tcp, Udp, Icmp }
fn nr(p: Proto) -> u8 {
    match p {
        Proto::Tcp => 6,
        Proto::Udp => 17,
    }
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["bine cunoscut\nînregistrat\ndinamic", "dinamic\ndinamic\ndinamic", "bine cunoscut\nbine cunoscut\ndinamic", "nu compilează || doesn't compile"], "Intervale în `match`: 0–1023 bine cunoscute, 1024–49151 înregistrate, restul dinamice (IANA). || Ranges in `match`: 0–1023 well-known, 1024–49151 registered, the rest dynamic (IANA).", { k: "out", c: c`
fn categorie(p: u16) -> &'static str {
    match p {
        0..=1023 => "bine cunoscut",
        1024..=49151 => "înregistrat",
        _ => "dinamic",
    }
}
fn main() {
    for p in [22, 8080, 50000] {
        println!("{}", categorie(p));
    }
}` }],
    ["Ce afișează? || What does it print?", ["web", "altceva", "ssh", "nu compilează || doesn't compile"], "`|` combină tipare; gărzile `if` adaugă condiții. || `|` combines patterns; `if` guards add conditions.", { k: "out", c: c`
fn main() {
    let p = 443;
    let r = match p {
        22 => "ssh",
        80 | 443 => "web",
        n if n > 1023 => "înalt",
        _ => "altceva",
    };
    println!("{r}");
}` }],
    ["Ce afișează? || What does it print?", ["mtu 9000", "nimic || nothing", "Some(9000)", "nu compilează || doesn't compile"], "`if let` tratează o singură variantă. || `if let` handles a single variant.", { k: "out", c: c`
fn main() {
    let mtu: Option<u32> = Some(9000);
    if let Some(m) = mtu {
        println!("mtu {m}");
    }
}` }],
    ["Ce afișează? || What does it print?", ["(10, 20) x=10", "(20, 10) x=20", "10 20", "nu compilează || doesn't compile"], "Destructurare într-un `let` cu un struct tuplu. || Destructuring a tuple struct in a `let`.", { k: "out", c: c`
#[derive(Debug)]
struct Punct(i32, i32);
fn main() {
    let p = Punct(10, 20);
    let Punct(x, y) = p;
    println!("({x}, {y}) x={}", x);
}` }],
    ["Ce afișează? || What does it print?", ["true false", "false true", "true true", "nu compilează || doesn't compile"], "`#[derive(PartialEq)]` permite `==` între valori. || `#[derive(PartialEq)]` allows `==` between values.", { k: "out", c: c`
#[derive(PartialEq)]
enum Stare { Up, Down }
fn main() {
    println!("{} {}", Stare::Up == Stare::Up, Stare::Up == Stare::Down);
}` }],
    ["Ce eroare dă `a == b` pe un struct fără `PartialEq`? || Which error does `a == b` on a struct without `PartialEq` give?", ["E0369", "E0277", "E0599", "E0308"], "E0369: operația binară `==` nu poate fi aplicată tipului. || E0369: binary operation `==` cannot be applied to the type.", { k: "err", err: "E0369", c: c`
struct A { x: u8 }
fn main() {
    let a = A { x: 1 };
    let b = A { x: 1 };
    println!("{}", a == b);
}` }],
    ["Ce afișează? || What does it print?", ["matches: true", "matches: false", "nu compilează || doesn't compile", "Some(80)"], "`matches!` întoarce `bool` dacă valoarea se potrivește tiparului. || `matches!` returns a `bool` when the value matches the pattern.", { k: "out", c: c`
fn main() {
    let p = Some(80);
    println!("matches: {}", matches!(p, Some(1..=1023)));
}` }],
    ["Ce afișează? || What does it print?", ["Rosu 0 Verde 2", "Rosu 1 Verde 3", "0 2", "nu compilează || doesn't compile"], "Variantele fără date au discriminanți numerici, implicit 0, 1, 2... || Field-less variants have numeric discriminants, 0, 1, 2... by default.", { k: "out", c: c`
#[derive(Debug, Clone, Copy)]
enum Led { Rosu, Galben, Verde }
fn main() {
    let _ = Led::Galben;
    println!("{:?} {} {:?} {}", Led::Rosu, Led::Rosu as u8, Led::Verde, Led::Verde as u8);
}` }]
  ]);
  QB("l6", [
    ["Ce afișează? || What does it print?", ["Some(2) None", "2 None", "Some(2) Some(-1)", "panic"], "`position` întoarce `Option<usize>`; absența e explicită, nu -1. || `position` returns `Option<usize>`; absence is explicit, not -1.", { k: "out", c: c`
fn main() {
    let v = [22, 80, 443];
    println!("{:?} {:?}", v.iter().position(|&p| p == 443), v.iter().position(|&p| p == 21));
}` }],
    ["Ce afișează? || What does it print?", ["1500 9000", "1500 1500", "0 9000", "panic"], "`unwrap_or` dă o valoare implicită pentru `None`. || `unwrap_or` gives a default for `None`.", { k: "out", c: c`
fn main() {
    let a: Option<u32> = None;
    let b = Some(9000);
    println!("{} {}", a.unwrap_or(1500), b.unwrap_or(1500));
}` }],
    ["Ce afișează? || What does it print?", ["Ok(8080) Err", "Ok(8080) Ok(0)", "8080 Err", "panic"], "`parse` întoarce `Result`; „80a” nu e un număr. || `parse` returns `Result`; “80a” isn't a number.", { k: "out", c: c`
fn main() {
    let a = "8080".parse::<u16>();
    let b = "80a".parse::<u16>();
    println!("{:?} {}", a, if b.is_err() { "Err" } else { "Ok" });
}` }],
    ["Ce afișează? || What does it print?", ["Ok(30)\nErr(\"nu e număr: x\")", "Ok(30)\nErr(ParseIntError)", "30\nx", "panic"], "`?` returnează imediat eroarea, convertită cu `map_err`. || `?` returns the error early, converted with `map_err`.", { k: "out", c: c`
fn suma(a: &str, b: &str) -> Result<i32, String> {
    let x: i32 = a.parse().map_err(|_| format!("nu e număr: {a}"))?;
    let y: i32 = b.parse().map_err(|_| format!("nu e număr: {b}"))?;
    Ok(x + y)
}
fn main() {
    println!("{:?}", suma("10", "20"));
    println!("{:?}", suma("x", "20"));
}` }],
    ["Ce eroare dă folosirea `?` într-un `main` care întoarce `()`? || Which error does using `?` in a `main` returning `()` give?", ["E0277", "E0308", "E0599", "E0425"], "E0277: `?` poate fi folosit doar într-o funcție care întoarce `Result` sau `Option`. || E0277: `?` can only be used in a function returning `Result` or `Option`.", { k: "err", err: "E0277", c: c`
fn main() {
    let n: u16 = "80".parse()?;
    println!("{n}");
}` }],
    ["Ce afișează? || What does it print?", ["Some(\"eth0\")", "None", "Some(\"eth0.10\")", "panic"], "`?` funcționează și pe `Option`: un `None` iese imediat. || `?` also works on `Option`: a `None` exits early.", { k: "out", c: c`
fn interfata_parinte(s: &str) -> Option<&str> {
    let (parinte, vlan) = s.split_once('.')?;
    vlan.parse::<u16>().ok()?;
    Some(parinte)
}
fn main() {
    println!("{:?}", interfata_parinte("eth0.10"));
}` }],
    ["Ce afișează? || What does it print?", ["None None", "Some(\"eth0\") None", "None Some(\"eth0\")", "panic"], "Fără `.`, `split_once` dă `None`; „abc” nu se parsează, deci `ok()?` iese cu `None`. || Without `.` `split_once` gives `None`; “abc” doesn't parse, so `ok()?` exits with `None`.", { k: "out", c: c`
fn interfata_parinte(s: &str) -> Option<&str> {
    let (parinte, vlan) = s.split_once('.')?;
    vlan.parse::<u16>().ok()?;
    Some(parinte)
}
fn main() {
    println!("{:?} {:?}", interfata_parinte("eth0"), interfata_parinte("eth0.abc"));
}` }],
    ["Ce afișează? || What does it print?", ["Some(\"10\")", "Some(10)", "None", "Ok(\"10\")"], "`map` transformă valoarea din `Some` și lasă `None` neschimbat. || `map` transforms the value inside `Some` and leaves `None` unchanged.", { k: "out", c: c`
fn main() {
    let x: Option<u8> = Some(10);
    println!("{:?}", x.map(|n| n.to_string()));
}` }],
    ["Ce afișează? || What does it print?", ["Err(\"lipsește\")", "None", "Ok(0)", "panic"], "`ok_or` transformă `Option` în `Result`. || `ok_or` turns an `Option` into a `Result`.", { k: "out", c: c`
fn main() {
    let x: Option<u8> = None;
    let r: Result<u8, &str> = x.ok_or("lipsește");
    println!("{:?}", r);
}` }],
    ["Ce afișează? || What does it print?", ["Ok([1, 2, 3])\nErr", "Ok([1, 2, 3])\nOk([1, 3])", "[1, 2, 3]\n[1, 3]", "panic"], "`collect` într-un `Result<Vec<_>, _>` se oprește la prima eroare. || `collect` into a `Result<Vec<_>, _>` stops at the first error.", { k: "out", c: c`
fn main() {
    let a: Result<Vec<u8>, _> = "1,2,3".split(',').map(|s| s.parse::<u8>()).collect();
    let b: Result<Vec<u8>, _> = "1,x,3".split(',').map(|s| s.parse::<u8>()).collect();
    println!("{:?}", a);
    println!("{}", if b.is_err() { "Err" } else { "Ok" });
}` }],
    ["Când e potrivit `unwrap()`? || When is `unwrap()` appropriate?", ["În exemple, teste sau când o eroare înseamnă un bug și panicul e acceptabil || In examples, tests, or when an error means a bug and panicking is acceptable", "Mereu, e cel mai rapid || Always, it's the fastest", "Niciodată, nu compilează || Never, it doesn't compile", "Doar în release || Only in release"], "În cod de producție preferă `?`, `match` sau `expect(\"motiv\")`. || In production code prefer `?`, `match` or `expect(\"reason\")`."],
    ["Ce afișează programul pe stdout înainte de panic? || What does the program print to stdout before panicking?", ["start", "start\nconfig lipsă", "nimic || nothing", "config lipsă"], "Mesajul din `expect` merge pe stderr, cu panicul. || The `expect` message goes to stderr, with the panic.", { k: "out", c: c`
fn main() {
    println!("start");
    let r = std::panic::catch_unwind(|| {
        let c: Option<&str> = None;
        c.expect("config lipsă");
    });
    assert!(r.is_err());
}` }],
    ["Ce afișează? || What does it print?", ["port invalid: 70000", "70000", "Ok(70000)", "panic"], "Un enum de erori propriu cu `Display` face mesajele clare. || A custom error enum with `Display` gives clear messages.", { k: "out", c: c`
use std::fmt;
#[derive(Debug)]
enum EroareCfg { PortInvalid(u32), Lipsa(&'static str) }
impl fmt::Display for EroareCfg {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            EroareCfg::PortInvalid(p) => write!(f, "port invalid: {p}"),
            EroareCfg::Lipsa(c) => write!(f, "lipsește: {c}"),
        }
    }
}
fn port(p: u32) -> Result<u16, EroareCfg> {
    u16::try_from(p).map_err(|_| EroareCfg::PortInvalid(p))
}
fn main() {
    let _ = EroareCfg::Lipsa("x");
    if let Err(e) = port(70000) { println!("{e}"); }
}` }],
    ["Ce face `impl From<ParseIntError> for EroareMea`? || What does `impl From<ParseIntError> for EroareMea` do?", ["Permite ca `?` să convertească automat `ParseIntError` în `EroareMea` || Lets `?` automatically convert a `ParseIntError` into `EroareMea`", "Afișează eroarea || Prints the error", "Ignoră eroarea || Ignores the error", "Face eroarea `Copy` || Makes the error `Copy`"], "`?` apelează `From::from` pe eroare înainte să o întoarcă. || `?` calls `From::from` on the error before returning it."],
    ["Ce afișează? || What does it print?", ["Err(Parse(ParseIntError { kind: InvalidDigit }))", "Err(\"x\")", "Ok(0)", "panic"], "`?` a convertit `ParseIntError` prin `From`. || `?` converted the `ParseIntError` through `From`.", { k: "out", c: c`
use std::num::ParseIntError;
#[derive(Debug)]
enum Eroare { Parse(ParseIntError) }
impl From<ParseIntError> for Eroare {
    fn from(e: ParseIntError) -> Self { Eroare::Parse(e) }
}
fn citeste(s: &str) -> Result<u8, Eroare> {
    Ok(s.parse::<u8>()?)
}
fn main() {
    println!("{:?}", citeste("x"));
}` }]
  ]);
})();

(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 3,
    icon: "🔁",
    title: { ro: "Funcții și control flow", en: "Functions & control flow" },
    summary: {
      ro: "Funcții cu tipuri, expresii vs instrucțiuni, <code>if</code> ca expresie și cele trei bucle: <code>loop</code>, <code>while</code>, <code>for</code>.",
      en: "Typed functions, expressions vs statements, <code>if</code> as an expression and the three loops: <code>loop</code>, <code>while</code>, <code>for</code>."
    },
    sections: [
      {
        h: { ro: "Funcții", en: "Functions" },
        p: {
          ro: "Parametrii au tip obligatoriu, iar tipul returnat se scrie după <code>-&gt;</code>. Ultima expresie <b>fără punct și virgulă</b> este valoarea returnată. <code>return</code> există, dar se folosește mai ales pentru ieșiri anticipate.",
          en: "Parameters must have a type and the return type comes after <code>-&gt;</code>. The last expression <b>without a semicolon</b> is the return value. <code>return</code> exists but is mostly used for early exits."
        },
        code: c`
fn latenta_medie(total_ms: u32, pinguri: u32) -> u32 {
    if pinguri == 0 {
        return 0; // ieșire anticipată / early exit
    }
    total_ms / pinguri // fără ; => valoarea returnată
}

fn main() {
    println!("medie = {} ms", latenta_medie(120, 4));
    println!("medie = {} ms", latenta_medie(0, 0));
}`
      },
      {
        h: { ro: "if este o expresie", en: "if is an expression" },
        p: {
          ro: "<code>if</code> întoarce o valoare, deci îl poți pune direct într-un <code>let</code>. Toate ramurile trebuie să aibă același tip. Condiția trebuie să fie <code>bool</code> — Rust nu transformă automat numerele în bool.",
          en: "<code>if</code> returns a value, so you can put it directly in a <code>let</code>. All branches must have the same type. The condition must be a <code>bool</code> — Rust does not turn numbers into bools automatically."
        },
        code: c`
fn main() {
    let pierdere = 3; // procente / percent
    let stare = if pierdere == 0 {
        "OK"
    } else if pierdere < 5 {
        "DEGRADAT"
    } else {
        "CĂZUT"
    };
    println!("link: {stare}");
}`
      },
      {
        h: { ro: "loop, while, for", en: "loop, while, for" },
        p: {
          ro: "<code>loop</code> repetă la infinit până la <code>break</code>, care poate întoarce o valoare. <code>while</code> rulează cât timp condiția e adevărată. <code>for</code> parcurge un interval (<code>1..5</code> exclude 5, <code>1..=5</code> îl include) sau o colecție. Etichetele, ca <code>'exterior</code>, te lasă să ieși din bucle imbricate.",
          en: "<code>loop</code> repeats forever until <code>break</code>, which can return a value. <code>while</code> runs while the condition is true. <code>for</code> walks a range (<code>1..5</code> excludes 5, <code>1..=5</code> includes it) or a collection. Labels such as <code>'outer</code> let you break out of nested loops."
        },
        code: c`
fn main() {
    // loop cu valoare / loop with a value
    let mut incercari = 0;
    let rezultat = loop {
        incercari += 1;
        if incercari == 3 {
            break incercari * 10;
        }
    };
    println!("rezultat = {rezultat}");

    // while
    let mut ttl = 3;
    while ttl > 0 {
        println!("hop, ttl = {ttl}");
        ttl -= 1;
    }

    // for peste o colecție / for over a collection
    let routere = ["R1", "R2", "R3"];
    for (i, r) in routere.iter().enumerate() {
        println!("{i}: {r}");
    }

    // etichete / labels
    'exterior: for x in 1..=3 {
        for y in 1..=3 {
            if x * y == 4 {
                println!("găsit {x}×{y}");
                break 'exterior;
            }
        }
    }
}`
      }
    ],
    exercises: [
      {
        title: { ro: "FizzBuzz", en: "FizzBuzz" },
        task: {
          ro: "Pentru numerele 1..=15 afișează <code>Fizz</code> dacă se divid cu 3, <code>Buzz</code> dacă se divid cu 5, <code>FizzBuzz</code> pentru ambele, altfel numărul.",
          en: "For numbers 1..=15 print <code>Fizz</code> if divisible by 3, <code>Buzz</code> if divisible by 5, <code>FizzBuzz</code> for both, otherwise the number."
        },
        hint: { ro: "Verifică întâi <code>n % 15 == 0</code>.", en: "Check <code>n % 15 == 0</code> first." },
        starter: c`
fn main() {
    for n in 1..=15 {
        // TODO
        println!("{n}");
    }
}`,
        solution: c`
fn main() {
    for n in 1..=15 {
        if n % 15 == 0 {
            println!("FizzBuzz");
        } else if n % 3 == 0 {
            println!("Fizz");
        } else if n % 5 == 0 {
            println!("Buzz");
        } else {
            println!("{n}");
        }
    }
}`
      },
      {
        title: { ro: "Este prim?", en: "Is it prime?" },
        task: {
          ro: "Scrie <code>fn este_prim(n: u32) -&gt; bool</code> și afișează numerele prime până la 30.",
          en: "Write <code>fn este_prim(n: u32) -&gt; bool</code> (is_prime) and print the primes up to 30."
        },
        hint: { ro: "Numerele mai mici de 2 nu sunt prime. Încearcă divizori <code>d</code> cât timp <code>d * d &lt;= n</code>.", en: "Numbers below 2 are not prime. Try divisors <code>d</code> while <code>d * d &lt;= n</code>." },
        starter: c`
fn este_prim(n: u32) -> bool {
    todo!("implementează / implement: {n}")
}

fn main() {
    for n in 1..=30 {
        if este_prim(n) {
            print!("{n} ");
        }
    }
    println!();
}`,
        solution: c`
fn este_prim(n: u32) -> bool {
    if n < 2 {
        return false;
    }
    let mut d = 2;
    while d * d <= n {
        if n % d == 0 {
            return false;
        }
        d += 1;
    }
    true
}

fn main() {
    for n in 1..=30 {
        if este_prim(n) {
            print!("{n} ");
        }
    }
    println!();
}`
      }
    ],
    quiz: [
      { q: { ro: "De ce nu compilează <code>fn f() -&gt; i32 { 5; }</code>?", en: "Why doesn't <code>fn f() -&gt; i32 { 5; }</code> compile?" },
        o: { ro: ["Lipsește return", "Cu <code>;</code>, corpul întoarce <code>()</code>, nu i32", "5 este u8", "Funcțiile nu pot întoarce numere"], en: ["return is missing", "With <code>;</code> the body returns <code>()</code>, not i32", "5 is a u8", "Functions cannot return numbers"] },
        a: 1, e: { ro: "<code>5;</code> devine instrucțiune. Blocul se termină fără expresie, deci are tipul <code>()</code> — eroare „mismatched types”. Scoate <code>;</code>.", en: "<code>5;</code> becomes a statement. The block ends without an expression, so its type is <code>()</code> — a “mismatched types” error. Remove the <code>;</code>." } },
      { q: { ro: "Ce valori parcurge <code>for i in 1..5</code>?", en: "Which values does <code>for i in 1..5</code> visit?" },
        o: { ro: ["1, 2, 3, 4, 5", "1, 2, 3, 4", "0, 1, 2, 3, 4", "2, 3, 4"], en: ["1, 2, 3, 4, 5", "1, 2, 3, 4", "0, 1, 2, 3, 4", "2, 3, 4"] },
        a: 1, e: { ro: "<code>a..b</code> exclude capătul <code>b</code>. Ca să-l incluzi, folosești <code>1..=5</code>.", en: "<code>a..b</code> excludes the end <code>b</code>. To include it use <code>1..=5</code>." } },
      { q: { ro: "Cum întorci o valoare dintr-un <code>loop</code>?", en: "How do you return a value from a <code>loop</code>?" },
        o: { ro: ["break valoare;", "return loop valoare;", "yield valoare;", "Nu se poate"], en: ["break value;", "return loop value;", "yield value;", "You can't"] },
        a: 0, e: { ro: "<code>let r = loop { ... break 42; };</code> — <code>break</code> cu o expresie dă valoarea buclei.", en: "<code>let r = loop { ... break 42; };</code> — <code>break</code> with an expression gives the loop its value." } },
      { q: { ro: "Ce trebuie să respecte un <code>if</code> folosit ca expresie?", en: "What must an <code>if</code> used as an expression respect?" },
        o: { ro: ["Să aibă doar două ramuri", "Toate ramurile să aibă același tip", "Să fie într-o funcție separată", "Condiția să fie un număr"], en: ["Have only two branches", "All branches must have the same type", "Be in a separate function", "The condition must be a number"] },
        a: 1, e: { ro: "Variabila are un singur tip, deci ramurile trebuie să coincidă. Condiția e mereu <code>bool</code>.", en: "The variable has a single type, so the branches must match. The condition is always a <code>bool</code>." } },
      { q: { ro: "Care afirmație despre parametrii funcțiilor e corectă?", en: "Which statement about function parameters is correct?" },
        o: { ro: ["Tipul lor e dedus automat", "Tipul lor trebuie scris explicit", "Sunt mereu mut", "Sunt mereu referințe"], en: ["Their type is inferred", "Their type must be written explicitly", "They are always mut", "They are always references"] },
        a: 1, e: { ro: "În semnătura funcției tipurile sunt obligatorii — asta face erorile ușor de citit.", en: "Types are mandatory in function signatures — this keeps errors easy to read." } },
      { q: { ro: "Cum ieși dintr-o buclă exterioară din interiorul uneia imbricate?", en: "How do you exit an outer loop from inside a nested one?" },
        o: { ro: ["break 2;", "break 'eticheta;", "exit;", "continue outer;"], en: ["break 2;", "break 'label;", "exit;", "continue outer;"] },
        a: 1, e: { ro: "Pui o etichetă pe bucla exterioară (<code>'exterior: for ...</code>) și apoi scrii <code>break 'exterior;</code>.", en: "Put a label on the outer loop (<code>'outer: for ...</code>) and then write <code>break 'outer;</code>." } }
    ]
  });
})();

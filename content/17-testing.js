(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 14, icon: "🧪", level: 2,
    title: { ro: "Testare", en: "Testing" },
    summary: {
      ro: "Testele sunt incluse în limbaj: <code>#[test]</code>, <code>assert!</code>, <code>assert_eq!</code>, <code>#[should_panic]</code>, teste care întorc <code>Result</code>, teste de integrare în <code>tests/</code> și doc-teste în comentarii.",
      en: "Testing is built in: <code>#[test]</code>, <code>assert!</code>, <code>assert_eq!</code>, <code>#[should_panic]</code>, tests returning <code>Result</code>, integration tests in <code>tests/</code> and doc tests in comments."
    },
    sections: [
      { h: { ro: "Teste unitare", en: "Unit tests" },
        p: { ro: "Pui testele lângă cod, într-un <code>mod tests</code> marcat <code>#[cfg(test)]</code>. Le rulezi cu <code>cargo test</code>. <code>use super::*;</code> aduce în scope funcțiile testate, inclusiv cele private. Codul de mai jos e verificat cu <code>rustc --test</code>.",
             en: "Put tests next to the code, in a <code>mod tests</code> marked <code>#[cfg(test)]</code>. Run them with <code>cargo test</code>. <code>use super::*;</code> brings the tested functions into scope, including private ones. The code below is checked with <code>rustc --test</code>." },
        code: c`
fn prefix_din_masca(m: [u8; 4]) -> u32 {
    m.iter().map(|b| b.count_ones()).sum()
}

fn e_port_valid(p: u32) -> bool {
    (1..=65535).contains(&p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masca_24() {
        assert_eq!(prefix_din_masca([255, 255, 255, 0]), 24);
    }

    #[test]
    fn porturi() {
        assert!(e_port_valid(443));
        assert!(!e_port_valid(0), "portul 0 nu e valid");
        assert_ne!(prefix_din_masca([255, 0, 0, 0]), 16);
    }
}

fn main() {}`, test: true },
      { h: { ro: "should_panic și Result în teste", en: "should_panic and Result in tests" },
        p: { ro: "<code>#[should_panic(expected = \"text\")]</code> trece doar dacă funcția dă panic cu un mesaj care conține textul. Un test poate întoarce <code>Result&lt;(), E&gt;</code> ca să folosească <code>?</code>; e picat dacă întoarce <code>Err</code>. <code>#[ignore]</code> sare peste testele lente (le rulezi cu <code>cargo test -- --ignored</code>).",
             en: "<code>#[should_panic(expected = \"text\")]</code> passes only if the function panics with a message containing the text. A test can return <code>Result&lt;(), E&gt;</code> to use <code>?</code>; it fails if it returns <code>Err</code>. <code>#[ignore]</code> skips slow tests (run them with <code>cargo test -- --ignored</code>)." },
        code: c`
fn vlan(id: u16) -> u16 {
    if !(1..=4094).contains(&id) {
        panic!("VLAN invalid: {id}");
    }
    id
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic(expected = "VLAN invalid")]
    fn vlan_prea_mare() {
        vlan(5000);
    }

    #[test]
    fn parsare() -> Result<(), std::num::ParseIntError> {
        let n: u16 = "100".parse()?;
        assert_eq!(vlan(n), 100);
        Ok(())
    }

    #[test]
    #[ignore]
    fn lent() {}
}

fn main() {}`, test: true },
      { h: { ro: "Teste de integrare și doc-teste", en: "Integration tests and doc tests" },
        p: { ro: "Fișierele din <code>tests/</code> sunt crate-uri separate care folosesc doar API-ul public al bibliotecii tale. Exemplele din comentariile <code>///</code> (în blocuri de cod) sunt compilate și rulate de <code>cargo test</code> ca <b>doc-teste</b> — documentația rămâne corectă.",
             en: "Files in <code>tests/</code> are separate crates that use only your library's public API. Examples in <code>///</code> comments (inside code blocks) are compiled and run by <code>cargo test</code> as <b>doc tests</b> — so documentation stays correct." },
        shell: c`
monitor/
├── src/lib.rs
│     /// Întoarce prefixul CIDR al unei măști.
│     ///
│     /// \`\`\`
│     /// assert_eq!(monitor::prefix([255, 255, 255, 0]), 24);
│     /// \`\`\`
│     pub fn prefix(m: [u8; 4]) -> u32 { ... }
└── tests/
      └── api.rs      # use monitor::prefix;  #[test] fn ...

$ cargo test                      # unitare + integrare + doc-teste
$ cargo test masca                # doar testele care conțin "masca"
$ cargo test -- --nocapture       # arată println! din teste
$ cargo test -- --test-threads=1  # rulează pe rând` },
      { h: { ro: "Ce face un test bun", en: "What makes a good test" },
        p: { ro: "Testează un singur comportament, cu un nume clar, cu cazuri limită (0, gol, maxim, input invalid). Separă logica pură (ușor de testat) de I/O (rețea, fișiere). Testele rulează implicit <b>în paralel</b>, pe mai multe fire, deci nu trebuie să depindă unele de altele.",
             en: "Test one behaviour, with a clear name, including edge cases (0, empty, max, invalid input). Separate pure logic (easy to test) from I/O (network, files). Tests run <b>in parallel</b> by default, on several threads, so they must not depend on each other." },
        code: c`
fn parse_port(s: &str) -> Result<u16, String> {
    let n: u32 = s.trim().parse().map_err(|_| format!("nu e număr: {s}"))?;
    if n == 0 || n > 65535 {
        return Err(format!("în afara intervalului: {n}"));
    }
    Ok(n as u16)
}

#[cfg(test)]
mod tests {
    use super::parse_port;

    #[test]
    fn valori_limita() {
        assert_eq!(parse_port("1"), Ok(1));
        assert_eq!(parse_port("65535"), Ok(65535));
        assert!(parse_port("0").is_err());
        assert!(parse_port("65536").is_err());
        assert!(parse_port("abc").is_err());
        assert_eq!(parse_port(" 22 "), Ok(22));
    }
}

fn main() {
    println!("{:?}", parse_port("8080"));
}`, test: true }
    ],
    exercises: [
      { title: { ro: "Scrie funcția ca testele să treacă", en: "Write the function so the tests pass" },
        task: { ro: "Implementează <code>e_privat(ip: [u8; 4]) -&gt; bool</code> pentru rețelele private RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Testele trebuie să treacă (<code>cargo test</code>); rezultatul programului: <code>true false</code>.", en: "Implement <code>e_privat(ip: [u8; 4]) -&gt; bool</code> for the RFC 1918 private networks: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. The tests must pass (<code>cargo test</code>); program output: <code>true false</code>." },
        hint: { ro: "<code>match ip { [10, ..] =&gt; true, [172, b, ..] =&gt; (16..=31).contains(&amp;b), [192, 168, ..] =&gt; true, _ =&gt; false }</code>", en: "<code>match ip { [10, ..] =&gt; true, [172, b, ..] =&gt; (16..=31).contains(&amp;b), [192, 168, ..] =&gt; true, _ =&gt; false }</code>" },
        starter: c`
fn e_privat(ip: [u8; 4]) -> bool {
    let _ = ip;
    false // TODO
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rfc1918() {
        assert!(e_privat([10, 1, 2, 3]));
        assert!(e_privat([172, 16, 0, 1]));
        assert!(e_privat([172, 31, 255, 255]));
        assert!(!e_privat([172, 32, 0, 1]));
        assert!(e_privat([192, 168, 1, 1]));
        assert!(!e_privat([8, 8, 8, 8]));
    }
}

fn main() {
    println!("{} {}", e_privat([192, 168, 0, 10]), e_privat([1, 1, 1, 1]));
}`,
        solution: c`
fn e_privat(ip: [u8; 4]) -> bool {
    match ip {
        [10, ..] => true,
        [172, b, ..] => (16..=31).contains(&b),
        [192, 168, ..] => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rfc1918() {
        assert!(e_privat([10, 1, 2, 3]));
        assert!(e_privat([172, 16, 0, 1]));
        assert!(e_privat([172, 31, 255, 255]));
        assert!(!e_privat([172, 32, 0, 1]));
        assert!(e_privat([192, 168, 1, 1]));
        assert!(!e_privat([8, 8, 8, 8]));
    }
}

fn main() {
    println!("{} {}", e_privat([192, 168, 0, 10]), e_privat([1, 1, 1, 1]));
}`,
        expect: "true false", alsoTest: true }
    ]
  });
  QB("l14", [
    ["Cu ce comandă rulezi testele? || Which command runs the tests?", ["`cargo test`", "`cargo run --test`", "`rustc test`", "`cargo check --tests`"], "`cargo test` compilează în modul test și rulează testele unitare, de integrare și doc-testele. || `cargo test` builds in test mode and runs unit, integration and doc tests."],
    ["Ce atribut marchează o funcție ca test? || Which attribute marks a function as a test?", ["`#[test]`", "`#[cfg(test)]`", "`#[unit]`", "`#[check]`"], "`#[cfg(test)]` compilează condiționat un modul; `#[test]` marchează funcția. || `#[cfg(test)]` conditionally compiles a module; `#[test]` marks the function."],
    ["Ce face `assert_eq!(a, b)` când valorile diferă? || What does `assert_eq!(a, b)` do when the values differ?", ["Dă panic și afișează ambele valori (left/right) || Panics and prints both values (left/right)", "Întoarce `false` || Returns `false`", "Doar afișează un avertisment || Only prints a warning", "Nu compilează || Doesn't compile"], "Ambele valori trebuie să implementeze `PartialEq` și `Debug`. || Both values must implement `PartialEq` and `Debug`."],
    ["Ce trait-uri trebuie să implementeze valorile din `assert_eq!`? || Which traits must the values in `assert_eq!` implement?", ["`PartialEq` și `Debug` || `PartialEq` and `Debug`", "`Clone` și `Copy` || `Clone` and `Copy`", "`Display` || `Display`", "`Eq` și `Hash` || `Eq` and `Hash`"], "`PartialEq` pentru comparație, `Debug` pentru mesajul de eroare. || `PartialEq` for comparison, `Debug` for the failure message."],
    ["Testele unitare pot apela funcții private? || Can unit tests call private functions?", ["Da, modulul `tests` e copil al modulului testat (`use super::*`) || Yes, the `tests` module is a child of the tested module (`use super::*`)", "Nu, niciodată || No, never", "Doar cu `unsafe` || Only with `unsafe`", "Doar în testele de integrare || Only in integration tests"], "Testele de integrare din `tests/` văd doar API-ul public. || Integration tests in `tests/` only see the public API."],
    ["Ce face `#[should_panic(expected = \"VLAN invalid\")]`? || What does `#[should_panic(expected = \"VLAN invalid\")]` do?", ["Testul trece doar dacă apare un panic al cărui mesaj conține textul || The test passes only if a panic occurs whose message contains the text", "Ignoră panicurile || Ignores panics", "Transformă panicul în `Err` || Turns the panic into `Err`", "Oprește toate testele || Stops all tests"], "Fără `expected`, orice panic face testul să treacă. || Without `expected`, any panic makes the test pass."],
    ["Poate un test să întoarcă `Result`? || Can a test return a `Result`?", ["Da, `Result<(), E>`; testul pică dacă întoarce `Err` || Yes, `Result<(), E>`; the test fails if it returns `Err`", "Nu || No", "Doar `Option` || Only `Option`", "Doar în testele de integrare || Only in integration tests"], "Așa poți folosi `?` în teste. `E` trebuie să implementeze `Debug`. || That lets you use `?` in tests. `E` must implement `Debug`."],
    ["Unde stau testele de integrare? || Where do integration tests live?", ["În folderul `tests/` de lângă `src/` || In the `tests/` folder next to `src/`", "În `src/tests.rs` || In `src/tests.rs`", "În `Cargo.toml` || In `Cargo.toml`", "În `target/tests` || In `target/tests`"], "Fiecare fișier din `tests/` e compilat ca un crate separat. || Each file in `tests/` is compiled as a separate crate."],
    ["Ce sunt doc-testele? || What are doc tests?", ["Exemplele de cod din comentariile `///`, compilate și rulate de `cargo test` || Code examples in `///` comments, compiled and run by `cargo test`", "Teste scrise în Markdown separat || Tests in separate Markdown files", "Teste care generează documentație || Tests that generate docs", "Comentarii ignorate || Ignored comments"], "Ele asigură că exemplele din documentație chiar funcționează. || They make sure the documentation examples really work."],
    ["Cum vezi `println!` din teste care trec? || How do you see `println!` output from passing tests?", ["`cargo test -- --nocapture`", "`cargo test --verbose`", "`cargo test --print`", "Nu se poate || It's impossible"], "Implicit, ieșirea testelor care trec e capturată și ascunsă. || By default the output of passing tests is captured and hidden."],
    ["Cum rulezi doar testele care conțin „masca” în nume? || How do you run only tests with “masca” in their name?", ["`cargo test masca`", "`cargo test --only masca`", "`cargo test -- masca*`", "`cargo masca`"], "Argumentul e un filtru după subșir din numele testului. || The argument is a substring filter on the test name."],
    ["Testele rulează implicit... || By default tests run...", ["în paralel, pe mai multe fire || in parallel, on several threads", "strict pe rând || strictly one by one", "pe alt calculator || on another machine", "doar cele marcate `#[parallel]` || only those marked `#[parallel]`"], "Pentru rulare secvențială: `cargo test -- --test-threads=1`. || For sequential runs: `cargo test -- --test-threads=1`."],
    ["Ce face `#[ignore]`? || What does `#[ignore]` do?", ["Sare peste test în mod normal; îl rulezi cu `cargo test -- --ignored` || Skips the test normally; you run it with `cargo test -- --ignored`", "Șterge testul || Deletes the test", "Ignoră erorile testului || Ignores the test's errors", "Ascunde avertismentele || Hides warnings"], "Util pentru teste lente sau care cer rețea. || Handy for slow tests or tests that need the network."],
    ["Ce face `assert!(cond, \"mesaj {x}\")`? || What does `assert!(cond, \"mesaj {x}\")` do?", ["Dă panic cu mesajul formatat dacă `cond` e `false` || Panics with the formatted message if `cond` is `false`", "Afișează mesajul mereu || Always prints the message", "Întoarce `Err(mesaj)` || Returns `Err(message)`", "Nu acceptă mesaje || Doesn't accept messages"], "Mesajul ajută la diagnosticare. || The message helps diagnosis."],
    ["Ce diferență e între `assert!` și `debug_assert!`? || What's the difference between `assert!` and `debug_assert!`?", ["`debug_assert!` e verificat doar în build-urile fără optimizări (debug) || `debug_assert!` is only checked in non-optimized (debug) builds", "Sunt identice || They're identical", "`debug_assert!` afișează doar un mesaj || `debug_assert!` only prints a message", "`assert!` merge doar în teste || `assert!` only works in tests"], "`assert!` rămâne activ și în release. || `assert!` stays active in release too."],
    ["Trec testele? || Do the tests pass?", ["Da || Yes", "Nu || No"], "`prefix_din_masca([255,255,255,0])` = 8+8+8+0 = 24. || `prefix_din_masca([255,255,255,0])` = 8+8+8+0 = 24.", { k: "test", c: c`
fn prefix_din_masca(m: [u8; 4]) -> u32 {
    m.iter().map(|b| b.count_ones()).sum()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn masca_24() { assert_eq!(prefix_din_masca([255, 255, 255, 0]), 24); }
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["24", "4", "32", "3"], "`count_ones` numără biții 1: 255 are 8. || `count_ones` counts the 1 bits: 255 has 8.", { k: "out", c: c`
fn main() {
    let m = [255u8, 255, 255, 0];
    println!("{}", m.iter().map(|b| b.count_ones()).sum::<u32>());
}` }],
    ["Ce afișează? || What does it print?", ["Ok(22)", "Ok(\" 22 \")", "Err(\"nu e număr:  22 \")", "22"], "`trim()` scoate spațiile înainte de `parse`. || `trim()` strips the spaces before `parse`.", { k: "out", c: c`
fn parse_port(s: &str) -> Result<u16, String> {
    let n: u32 = s.trim().parse().map_err(|_| format!("nu e număr: {s}"))?;
    if n == 0 || n > 65535 { return Err(format!("în afara intervalului: {n}")); }
    Ok(n as u16)
}
fn main() {
    println!("{:?}", parse_port(" 22 "));
}` }],
    ["Ce afișează? || What does it print?", ["Err(\"în afara intervalului: 65536\")", "Ok(0)", "Ok(65536)", "Err(\"nu e număr: 65536\")"], "65536 se parsează ca `u32`, dar e peste 65535. || 65536 parses as `u32` but is above 65535.", { k: "out", c: c`
fn parse_port(s: &str) -> Result<u16, String> {
    let n: u32 = s.trim().parse().map_err(|_| format!("nu e număr: {s}"))?;
    if n == 0 || n > 65535 { return Err(format!("în afara intervalului: {n}")); }
    Ok(n as u16)
}
fn main() {
    println!("{:?}", parse_port("65536"));
}` }],
    ["De ce e util să separi logica pură de I/O? || Why is it useful to separate pure logic from I/O?", ["Logica pură se testează rapid și determinist, fără rețea sau fișiere || Pure logic can be tested quickly and deterministically, without network or files", "Pentru că I/O nu se poate testa deloc || Because I/O can't be tested at all", "Ca să compileze mai repede || So it compiles faster", "E cerut de compilator || The compiler requires it"], "De exemplu, parsezi un log dintr-un `&str` în teste, iar citirea fișierului rămâne un strat subțire. || For example, parse a log from a `&str` in tests and keep file reading as a thin layer."],
    ["Trec testele? || Do the tests pass?", ["Da || Yes", "Nu || No"], "`vlan(5000)` dă panic cu „VLAN invalid: 5000”, care conține textul așteptat. || `vlan(5000)` panics with “VLAN invalid: 5000”, which contains the expected text.", { k: "test", c: c`
fn vlan(id: u16) -> u16 {
    if !(1..=4094).contains(&id) { panic!("VLAN invalid: {id}"); }
    id
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[should_panic(expected = "VLAN invalid")]
    fn vlan_prea_mare() { vlan(5000); }
}
fn main() {}` }],
    ["Ce interval de VLAN ID-uri e folosibil în 802.1Q? || Which VLAN ID range is usable in 802.1Q?", ["1–4094", "0–4095", "1–1024", "1–65535"], "ID-ul are 12 biți (0–4095); 0 și 4095 sunt rezervate. || The ID is 12 bits (0–4095); 0 and 4095 are reserved."]
  ]);
})();

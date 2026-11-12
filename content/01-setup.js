(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 1,
    icon: "🦀",
    title: { ro: "Instalare, Hello World și Cargo", en: "Setup, Hello World & Cargo" },
    summary: {
      ro: "Instalezi Rust cu rustup, scrii primul program și înveți comenzile Cargo pe care le vei folosi zilnic.",
      en: "Install Rust with rustup, write your first program and learn the Cargo commands you will use every day."
    },
    sections: [
      {
        h: { ro: "Ce este Rust?", en: "What is Rust?" },
        p: {
          ro: "Rust este un limbaj compilat, rapid ca C/C++, dar compilatorul verifică cine „deține” fiecare bucată de memorie. Nu are garbage collector și totuși previne erori clasice precum use-after-free sau data races. E folosit în browsere, sisteme de operare, unelte CLI, rețelistică și cloud.",
          en: "Rust is a compiled language as fast as C/C++, but the compiler checks who “owns” every piece of memory. It has no garbage collector and still prevents classic bugs such as use-after-free or data races. It is used in browsers, operating systems, CLI tools, networking and cloud."
        }
      },
      {
        h: { ro: "Instalare cu rustup", en: "Installing with rustup" },
        p: {
          ro: "Pe Linux/macOS rulezi comanda de mai jos în terminal. Pe Windows descarci <code>rustup-init.exe</code> de pe rustup.rs. Apoi verifici versiunile. Dacă nu vrei să instalezi nimic acum, fiecare exemplu are butonul <b>Deschide în Rust Playground</b>.",
          en: "On Linux/macOS run the command below in a terminal. On Windows download <code>rustup-init.exe</code> from rustup.rs. Then check the versions. If you don't want to install anything yet, every example has an <b>Open in Rust Playground</b> button."
        },
        shell: c`
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustc --version
cargo --version`
      },
      {
        h: { ro: "Primul program", en: "Your first program" },
        p: {
          ro: "Orice program executabil pornește din funcția <code>main</code>. <code>println!</code> are semnul exclamării pentru că este un <b>macro</b>, nu o funcție obișnuită: verifică la compilare că acoladele <code>{}</code> se potrivesc cu argumentele.",
          en: "Every executable program starts in the <code>main</code> function. <code>println!</code> has an exclamation mark because it is a <b>macro</b>, not a regular function: it checks at compile time that the <code>{}</code> placeholders match the arguments."
        },
        code: c`
fn main() {
    println!("Salut, lume! / Hello, world!");
    let nume = "Luci";
    let zile = 3;
    // {} afișează valoarea, {nume} folosește direct variabila
    println!("{} învață Rust de {} zile", nume, zile);
    println!("{nume} has been learning Rust for {zile} days");
}`
      },
      {
        h: { ro: "Cargo: managerul de proiecte", en: "Cargo: the project manager" },
        p: {
          ro: "<code>cargo new</code> creează un proiect cu <code>Cargo.toml</code> (nume, versiune, dependențe) și <code>src/main.rs</code>. <code>cargo check</code> verifică rapid codul fără să producă binar, <code>cargo run</code> compilează și rulează, iar <code>cargo build --release</code> produce binarul optimizat în <code>target/release/</code>.",
          en: "<code>cargo new</code> creates a project with <code>Cargo.toml</code> (name, version, dependencies) and <code>src/main.rs</code>. <code>cargo check</code> quickly checks the code without producing a binary, <code>cargo run</code> builds and runs it, and <code>cargo build --release</code> produces the optimized binary in <code>target/release/</code>."
        },
        shell: c`
cargo new salut
cd salut
cargo check          # verificare rapidă / fast check
cargo run            # compilează + rulează / build + run
cargo build --release
./target/release/salut`
      },
      {
        h: { ro: "Formatare în println!", en: "Formatting in println!" },
        p: {
          ro: "<code>{:?}</code> afișează forma de debug (utilă pentru liste), <code>{:.2}</code> limitează zecimalele, iar <code>{:>6}</code> aliniază la dreapta pe 6 caractere — util pentru tabele în terminal.",
          en: "<code>{:?}</code> prints the debug form (handy for lists), <code>{:.2}</code> limits decimals and <code>{:>6}</code> right-aligns in 6 characters — handy for terminal tables."
        },
        code: c`
fn main() {
    let porturi = [22, 80, 443];
    let latenta = 12.3456;
    println!("porturi: {:?}", porturi);
    println!("latență: {:.2} ms", latenta);
    println!("[{:>6}] [{:<6}]", "dr", "st");
}`
      }
    ],
    exercises: [
      {
        title: { ro: "Carte de vizită", en: "Business card" },
        task: {
          ro: "Afișează trei rânduri: numele tău, orașul și anul curent, folosind variabile și <code>println!</code> cu <code>{}</code>.",
          en: "Print three lines: your name, your city and the current year, using variables and <code>println!</code> with <code>{}</code>."
        },
        hint: {
          ro: "Declară <code>let oras = \"București\";</code> și apoi <code>println!(\"Oraș: {}\", oras);</code>",
          en: "Declare <code>let city = \"Bucharest\";</code> then <code>println!(\"City: {}\", city);</code>"
        },
        starter: c`
fn main() {
    let nume = "???";
    // TODO: adaugă orașul și anul / add the city and the year
    println!("Nume: {}", nume);
}`,
        solution: c`
fn main() {
    let nume = "Lucian";
    let oras = "București";
    let an = 2026;
    println!("Nume: {}", nume);
    println!("Oraș: {}", oras);
    println!("An:   {}", an);
}`
      },
      {
        title: { ro: "Tabel de porturi", en: "Port table" },
        task: {
          ro: "Afișează un mic tabel cu porturile 22 (ssh), 80 (http) și 443 (https). Numărul portului e aliniat la dreapta pe 5 caractere.",
          en: "Print a small table with ports 22 (ssh), 80 (http) and 443 (https). The port number is right-aligned in 5 characters."
        },
        hint: { ro: "Folosește <code>{:>5}</code> pentru port.", en: "Use <code>{:>5}</code> for the port." },
        starter: c`
fn main() {
    println!(" PORT  SERVICIU");
    // TODO
}`,
        solution: c`
fn main() {
    println!(" PORT  SERVICIU");
    println!("{:>5}  {}", 22, "ssh");
    println!("{:>5}  {}", 80, "http");
    println!("{:>5}  {}", 443, "https");
}`
      }
    ],
    quiz: [
      { q: { ro: "De ce <code>println!</code> are semnul exclamării?", en: "Why does <code>println!</code> have an exclamation mark?" },
        o: { ro: ["Pentru că afișează un mesaj important", "Pentru că este un macro", "Pentru că poate da panic", "Este doar o convenție de stil"],
             en: ["Because it prints an important message", "Because it is a macro", "Because it may panic", "It is just a style convention"] },
        a: 1, e: { ro: "<code>!</code> marchează apelul unui macro. Macro-urile sunt extinse la compilare, de aceea <code>println!</code> poate verifica formatul.", en: "<code>!</code> marks a macro invocation. Macros expand at compile time, which is why <code>println!</code> can check the format string." } },
      { q: { ro: "Ce comandă creează un proiect nou?", en: "Which command creates a new project?" },
        o: { ro: ["rustc new app", "cargo init --bin-only", "cargo new app", "rustup new app"], en: ["rustc new app", "cargo init --bin-only", "cargo new app", "rustup new app"] },
        a: 2, e: { ro: "<code>cargo new app</code> creează folderul <code>app</code> cu <code>Cargo.toml</code> și <code>src/main.rs</code>.", en: "<code>cargo new app</code> creates the <code>app</code> folder with <code>Cargo.toml</code> and <code>src/main.rs</code>." } },
      { q: { ro: "În ce fișier declari dependențele (crates)?", en: "In which file do you declare dependencies (crates)?" },
        o: { ro: ["Cargo.toml", "main.rs", "Cargo.lock", "rust-toolchain"], en: ["Cargo.toml", "main.rs", "Cargo.lock", "rust-toolchain"] },
        a: 0, e: { ro: "Dependențele se scriu în secțiunea <code>[dependencies]</code> din <code>Cargo.toml</code>. <code>Cargo.lock</code> e generat automat și fixează versiunile exacte.", en: "Dependencies go in the <code>[dependencies]</code> section of <code>Cargo.toml</code>. <code>Cargo.lock</code> is generated and pins exact versions." } },
      { q: { ro: "Ce face <code>cargo check</code>?", en: "What does <code>cargo check</code> do?" },
        o: { ro: ["Rulează testele", "Verifică dacă codul compilează, fără să producă executabil", "Actualizează Rust", "Formatează codul"],
             en: ["Runs the tests", "Checks that the code compiles without producing an executable", "Updates Rust", "Formats the code"] },
        a: 1, e: { ro: "E cea mai rapidă buclă de feedback: analiza compilatorului fără generarea binarului. Testele rulează cu <code>cargo test</code>, formatarea cu <code>cargo fmt</code>.", en: "It is the fastest feedback loop: full compiler analysis without generating the binary. Tests run with <code>cargo test</code>, formatting with <code>cargo fmt</code>." } },
      { q: { ro: "Unde ajunge binarul după <code>cargo build --release</code>?", en: "Where does the binary go after <code>cargo build --release</code>?" },
        o: { ro: ["src/bin/", "target/debug/", "target/release/", "~/.cargo/bin/"], en: ["src/bin/", "target/debug/", "target/release/", "~/.cargo/bin/"] },
        a: 2, e: { ro: "Build-ul de release (optimizat) merge în <code>target/release/</code>; cel normal în <code>target/debug/</code>.", en: "The optimized release build goes to <code>target/release/</code>; the normal one to <code>target/debug/</code>." } },
      { q: { ro: "Ce afișează <code>println!(\"{:?}\", [1, 2]);</code>?", en: "What does <code>println!(\"{:?}\", [1, 2]);</code> print?" },
        o: { ro: ["[1, 2]", "1 2", "{:?}", "Eroare de compilare"], en: ["[1, 2]", "1 2", "{:?}", "Compile error"] },
        a: 0, e: { ro: "<code>{:?}</code> folosește formatarea <code>Debug</code>, pe care array-urile o au: <code>[1, 2]</code>.", en: "<code>{:?}</code> uses <code>Debug</code> formatting, which arrays implement: <code>[1, 2]</code>." } }
    ]
  });
})();

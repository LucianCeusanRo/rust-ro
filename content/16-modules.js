(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 13, icon: "🗂️", level: 2,
    title: { ro: "Module, crate-uri și Cargo", en: "Modules, crates & Cargo" },
    summary: {
      ro: "Cum organizezi codul: module (<code>mod</code>), vizibilitate (<code>pub</code>), căi (<code>use</code>, <code>crate::</code>, <code>super::</code>), fișiere, crate-uri binare și de bibliotecă, dependențe în <code>Cargo.toml</code>, features și workspace-uri.",
      en: "How to organise code: modules (<code>mod</code>), visibility (<code>pub</code>), paths (<code>use</code>, <code>crate::</code>, <code>super::</code>), files, binary and library crates, dependencies in <code>Cargo.toml</code>, features and workspaces."
    },
    sections: [
      { h: { ro: "mod și pub", en: "mod and pub" },
        p: { ro: "Totul e <b>privat implicit</b> în afara modulului în care e definit. <code>pub</code> îl face vizibil. La struct-uri, fiecare câmp are propriul <code>pub</code>. Un modul copil vede elementele private ale părinților săi.",
             en: "Everything is <b>private by default</b> outside the module where it's defined. <code>pub</code> makes it visible. For structs, every field has its own <code>pub</code>. A child module can see its ancestors' private items." },
        code: c`
mod retea {
    pub struct Interfata {
        pub nume: String,
        mtu: u16, // privat
    }

    impl Interfata {
        pub fn noua(nume: &str) -> Self {
            Interfata { nume: nume.to_string(), mtu: implicit_mtu() }
        }
        pub fn mtu(&self) -> u16 {
            self.mtu
        }
    }

    fn implicit_mtu() -> u16 {
        1500
    }

    pub mod diag {
        pub fn ping(host: &str) -> String {
            format!("ping {host} (mtu {})", super::implicit_mtu())
        }
    }
}

use retea::{diag, Interfata};

fn main() {
    let i = Interfata::noua("eth0");
    println!("{} {}", i.nume, i.mtu());
    println!("{}", diag::ping("10.0.0.1"));
}` },
      { h: { ro: "Module în fișiere", en: "Modules in files" },
        p: { ro: "<code>mod retea;</code> în <code>src/main.rs</code> sau <code>src/lib.rs</code> încarcă <code>src/retea.rs</code> (sau <code>src/retea/mod.rs</code>). Submodulul <code>retea::diag</code> stă în <code>src/retea/diag.rs</code>. <code>crate::</code> pornește de la rădăcina crate-ului, <code>super::</code> de la părinte, <code>self::</code> de la modulul curent.",
             en: "<code>mod retea;</code> in <code>src/main.rs</code> or <code>src/lib.rs</code> loads <code>src/retea.rs</code> (or <code>src/retea/mod.rs</code>). The submodule <code>retea::diag</code> lives in <code>src/retea/diag.rs</code>. <code>crate::</code> starts at the crate root, <code>super::</code> at the parent, <code>self::</code> at the current module." },
        shell: c`
monitor/
├── Cargo.toml
└── src/
    ├── main.rs        # mod retea;  use monitor::...
    ├── lib.rs         # pub mod retea;  (crate de bibliotecă)
    └── retea/
        ├── mod.rs     # pub mod diag;
        └── diag.rs    # pub fn ping(...)` },
      { h: { ro: "Cargo.toml, dependențe și features", en: "Cargo.toml, dependencies and features" },
        p: { ro: "Dependențele se adaugă cu <code>cargo add serde --features derive</code>, care scrie în <code>[dependencies]</code>. Versiunea <code>\"1.0\"</code> înseamnă compatibil SemVer (<code>&gt;=1.0.0, &lt;2.0.0</code>). <code>Cargo.lock</code> fixează versiunile exacte. <code>[dev-dependencies]</code> sunt doar pentru teste și exemple.",
             en: "Add dependencies with <code>cargo add serde --features derive</code>, which writes to <code>[dependencies]</code>. Version <code>\"1.0\"</code> means SemVer-compatible (<code>&gt;=1.0.0, &lt;2.0.0</code>). <code>Cargo.lock</code> pins exact versions. <code>[dev-dependencies]</code> are only for tests and examples." },
        shell: c`
[package]
name = "monitor"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
pretty_assertions = "1"

[features]
default = []
metrics = []          # cod activat cu: cargo build --features metrics

# comenzi utile / useful commands:
# cargo add serde --features derive
# cargo tree            # arborele de dependențe
# cargo doc --open      # documentația crate-urilor
# cargo clippy          # lint-uri
# cargo fmt             # formatare` },
      { h: { ro: "Atribute cfg și workspace-uri", en: "cfg attributes and workspaces" },
        p: { ro: "<code>#[cfg(feature = \"metrics\")]</code> compilează cod doar când feature-ul e activ; <code>#[cfg(test)]</code> doar la <code>cargo test</code>; <code>cfg!(target_os = \"linux\")</code> e o expresie booleană evaluată la compilare. Un <b>workspace</b> grupează mai multe crate-uri cu un singur <code>Cargo.lock</code> și un singur folder <code>target/</code>.",
             en: "<code>#[cfg(feature = \"metrics\")]</code> compiles code only when the feature is on; <code>#[cfg(test)]</code> only under <code>cargo test</code>; <code>cfg!(target_os = \"linux\")</code> is a boolean expression evaluated at compile time. A <b>workspace</b> groups several crates with a single <code>Cargo.lock</code> and a single <code>target/</code> folder." },
        code: c`
#[cfg(debug_assertions)]
fn mod_build() -> &'static str {
    "debug"
}

#[cfg(not(debug_assertions))]
fn mod_build() -> &'static str {
    "release"
}

fn main() {
    println!("build: {}", mod_build());
    println!("pointer: {} biți", usize::BITS);
    if cfg!(unix) {
        println!("unix");
    }
}` }
    ],
    exercises: [
      { title: { ro: "Fă modulul folosibil", en: "Make the module usable" },
        task: { ro: "Codul nu compilează (E0603: funcția e privată). Adaugă <code>pub</code> unde trebuie, ca <code>main</code> să poată apela <code>util::masca::prefix</code>. Rezultat așteptat: <code>/24</code>.", en: "The code doesn't compile (E0603: the function is private). Add <code>pub</code> where needed so <code>main</code> can call <code>util::masca::prefix</code>. Expected: <code>/24</code>." },
        hint: { ro: "Ai nevoie de <code>pub mod masca</code> și <code>pub fn prefix</code>.", en: "You need <code>pub mod masca</code> and <code>pub fn prefix</code>." },
        starter: c`
mod util {
    pub mod masca {
        fn prefix(m: [u8; 4]) -> String {
            format!("/{}", m.iter().map(|b| b.count_ones()).sum::<u32>())
        }
    }
}

fn main() {
    println!("{}", util::masca::prefix([255, 255, 255, 0]));
}`, starterFails: "E0603",
        solution: c`
mod util {
    pub mod masca {
        pub fn prefix(m: [u8; 4]) -> String {
            format!("/{}", m.iter().map(|b| b.count_ones()).sum::<u32>())
        }
    }
}

fn main() {
    println!("{}", util::masca::prefix([255, 255, 255, 0]));
}`,
        expect: "/24" }
    ]
  });
  QB("l13", [
    ["Care e vizibilitatea implicită a unei funcții într-un modul? || What's the default visibility of a function in a module?", ["Privată (vizibilă doar în modul și în copiii lui) || Private (visible only in the module and its children)", "Publică || Public", "Vizibilă în tot crate-ul || Visible across the whole crate", "Vizibilă doar în teste || Visible only in tests"], "Folosești `pub` pentru a o expune. || Use `pub` to expose it."],
    ["Ce eroare dă? || Which error does it give?", ["E0603", "E0425", "E0433", "E0616"], "E0603: funcția `secret` e privată. || E0603: function `secret` is private.", { k: "err", err: "E0603", c: c`
mod m {
    fn secret() {}
}
fn main() {
    m::secret();
}` }],
    ["Ce eroare dă accesul la un câmp privat? || Which error does accessing a private field give?", ["E0616", "E0603", "E0609", "E0451"], "E0616: câmpul `mtu` e privat. Fiecare câmp are propria vizibilitate. || E0616: field `mtu` is private. Every field has its own visibility.", { k: "err", err: "E0616", c: c`
mod r {
    pub struct I { pub nume: String, mtu: u16 }
    pub fn noua() -> I { I { nume: "eth0".into(), mtu: 1500 } }
}
fn main() {
    let i = r::noua();
    println!("{}", i.mtu);
}` }],
    ["Ce înseamnă `super::` într-o cale? || What does `super::` mean in a path?", ["Modulul părinte || The parent module", "Rădăcina crate-ului || The crate root", "Crate-ul standard || The standard crate", "Tipul părinte într-o ierarhie de clase || The parent type in a class hierarchy"], "`crate::` e rădăcina, `self::` modulul curent. || `crate::` is the root, `self::` the current module."],
    ["Ce afișează? || What does it print?", ["eth0 1500\nping 10.0.0.1 (mtu 1500)", "eth0\nping 10.0.0.1", "nu compilează || doesn't compile", "eth0 0\nping 10.0.0.1 (mtu 0)"], "Modulul copil `diag` poate apela funcția privată din părinte prin `super::`. || The child module `diag` can call the parent's private function via `super::`.", { k: "out", c: c`
mod retea {
    pub struct Interfata { pub nume: String, mtu: u16 }
    impl Interfata {
        pub fn noua(nume: &str) -> Self { Interfata { nume: nume.to_string(), mtu: implicit_mtu() } }
        pub fn mtu(&self) -> u16 { self.mtu }
    }
    fn implicit_mtu() -> u16 { 1500 }
    pub mod diag {
        pub fn ping(host: &str) -> String { format!("ping {host} (mtu {})", super::implicit_mtu()) }
    }
}
use retea::{diag, Interfata};
fn main() {
    let i = Interfata::noua("eth0");
    println!("{} {}", i.nume, i.mtu());
    println!("{}", diag::ping("10.0.0.1"));
}` }],
    ["Unde caută compilatorul codul pentru `mod retea;` declarat în `src/main.rs`? || Where does the compiler look for `mod retea;` declared in `src/main.rs`?", ["`src/retea.rs` sau `src/retea/mod.rs` || `src/retea.rs` or `src/retea/mod.rs`", "`retea/lib.rs`", "`src/mod/retea.rs`", "Pe crates.io || On crates.io"], "rustc rezolvă fișierele modulelor pornind de la rădăcina crate-ului. || rustc resolves module files starting from the crate root."],
    ["Care e diferența între un crate binar și unul de bibliotecă? || What's the difference between a binary and a library crate?", ["Binarul are `fn main` și produce un executabil (`src/main.rs`); biblioteca expune cod pentru alte crate-uri (`src/lib.rs`) || A binary has `fn main` and produces an executable (`src/main.rs`); a library exposes code to other crates (`src/lib.rs`)", "Nu există diferență || There's no difference", "Biblioteca nu poate avea teste || A library can't have tests", "Binarul nu poate avea dependențe || A binary can't have dependencies"], "Un pachet poate conține ambele, plus binare suplimentare în `src/bin/`. || A package can contain both, plus extra binaries in `src/bin/`."],
    ["Ce înseamnă `serde = \"1.0\"` în `Cargo.toml`? || What does `serde = \"1.0\"` mean in `Cargo.toml`?", ["Orice versiune compatibilă SemVer: >=1.0.0 și <2.0.0 || Any SemVer-compatible version: >=1.0.0 and <2.0.0", "Exact 1.0.0 || Exactly 1.0.0", "Ultima versiune existentă, oricare ar fi || The latest version, whatever it is", "Doar 1.0.x || Only 1.0.x"], "Cerința implicită e de tip „caret” (`^1.0`). Pentru exact folosești `=1.0.0`. || The default requirement is a caret requirement (`^1.0`). For exact use `=1.0.0`."],
    ["Ce rol are `Cargo.lock`? || What does `Cargo.lock` do?", ["Fixează versiunile exacte ale tuturor dependențelor, pentru build-uri reproductibile || Pins exact versions of every dependency for reproducible builds", "Blochează fișierele împotriva editării || Locks files against editing", "Conține parole || Contains passwords", "E generat doar la publicare || It's only generated on publish"], "Pentru aplicații îl pui în git; Cargo îl actualizează cu `cargo update`. || For applications you commit it; Cargo updates it with `cargo update`."],
    ["Ce comandă adaugă o dependență în `Cargo.toml`? || Which command adds a dependency to `Cargo.toml`?", ["`cargo add nume`", "`cargo install nume`", "`cargo get nume`", "`cargo new nume`"], "`cargo install` instalează un binar global (de ex. un tool), nu o dependență. || `cargo install` installs a global binary (e.g. a tool), not a dependency."],
    ["La ce folosesc `[dev-dependencies]`? || What are `[dev-dependencies]` for?", ["Dependențe doar pentru teste, exemple și benchmark-uri || Dependencies only for tests, examples and benchmarks", "Dependențe pentru build-ul de producție || Dependencies for the production build", "Unelte globale || Global tools", "Dependențe opționale ale utilizatorilor || Users' optional dependencies"], "Nu sunt incluse când alt crate depinde de al tău. || They aren't included when another crate depends on yours."],
    ["Ce face `#[cfg(test)]`? || What does `#[cfg(test)]` do?", ["Compilează elementul doar când rulezi testele || Compiles the item only when building tests", "Rulează un test || Runs a test", "Marchează o funcție ca test || Marks a function as a test", "Dezactivează avertismentele || Disables warnings"], "De obicei pe `mod tests { ... }`. `#[test]` marchează funcțiile de test. || Usually on `mod tests { ... }`. `#[test]` marks test functions."],
    ["Ce afișează în build-ul debug obișnuit (fără `--release`)? || What does it print in a normal debug build (no `--release`)?", ["debug", "release", "nimic || nothing", "nu compilează || doesn't compile"], "`debug_assertions` e activ implicit în profilul dev. || `debug_assertions` is on by default in the dev profile.", { k: "out", c: c`
#[cfg(debug_assertions)]
fn mod_build() -> &'static str { "debug" }
#[cfg(not(debug_assertions))]
fn mod_build() -> &'static str { "release" }
fn main() {
    println!("{}", mod_build());
}` }],
    ["Ce este un workspace Cargo? || What is a Cargo workspace?", ["Mai multe pachete gestionate împreună, cu un `Cargo.lock` și un `target/` comune || Several packages managed together with a shared `Cargo.lock` and `target/`", "Un IDE || An IDE", "Un registry privat || A private registry", "Un folder temporar || A temporary folder"], "Se definește cu `[workspace] members = [...]` în `Cargo.toml`-ul rădăcină. || Defined with `[workspace] members = [...]` in the root `Cargo.toml`."],
    ["Ce face `pub(crate)`? || What does `pub(crate)` do?", ["Face elementul vizibil în tot crate-ul curent, dar nu în afara lui || Makes the item visible across the current crate but not outside it", "Îl face public pentru toată lumea || Makes it public to everyone", "Îl face privat || Makes it private", "Îl exportă doar în teste || Exports it only in tests"], "Există și `pub(super)` și `pub(in cale)`. || There are also `pub(super)` and `pub(in path)`."],
    ["Ce face `use std::collections::HashMap as Harta;`? || What does `use std::collections::HashMap as Harta;` do?", ["Importă tipul sub numele `Harta` || Imports the type under the name `Harta`", "Creează un tip nou || Creates a new type", "Copiază modulul || Copies the module", "Nu compilează || Doesn't compile"], "`as` redenumește la import, util la conflicte de nume. || `as` renames on import, handy for name clashes."],
    ["Ce face `pub use`? || What does `pub use` do?", ["Re-exportă un element, ca să poată fi importat prin calea modulului curent || Re-exports an item so it can be imported via the current module's path", "Importă doar în teste || Imports only in tests", "Face toate elementele publice || Makes every item public", "Șterge modulul original || Removes the original module"], "Bibliotecile își construiesc așa API-ul public (de ex. un `prelude`). || Libraries build their public API this way (e.g. a `prelude`)."],
    ["Ce eroare dă un modul inexistent în cale? || Which error does a nonexistent module in a path give?", ["E0433", "E0603", "E0425", "E0412"], "E0433: failed to resolve: nu există modulul `inexistent`. || E0433: failed to resolve: there's no module `inexistent`.", { k: "err", err: "E0433", c: c`
fn main() {
    inexistent::f();
}` }],
    ["Ce eroare dă o funcție necunoscută? || Which error does an unknown function give?", ["E0425", "E0433", "E0412", "E0599"], "E0425: cannot find function in this scope. || E0425: cannot find function in this scope.", { k: "err", err: "E0425", c: c`
fn main() {
    nu_exista();
}` }],
    ["Ce face `cargo build --release`? || What does `cargo build --release` do?", ["Compilează cu optimizări (profilul release), în `target/release/` || Builds with optimizations (release profile) into `target/release/`", "Publică pe crates.io || Publishes to crates.io", "Creează un tag git || Creates a git tag", "Șterge build-urile vechi || Deletes old builds"], "Fără `--release` primești build-ul debug în `target/debug/`. || Without `--release` you get the debug build in `target/debug/`."],
    ["Ce face `cargo check`? || What does `cargo check` do?", ["Verifică dacă se compilează, fără să genereze executabilul (mai rapid) || Checks whether it compiles without producing a binary (faster)", "Rulează testele || Runs the tests", "Verifică vulnerabilitățile || Checks for vulnerabilities", "Formatează codul || Formats the code"], "E bucla rapidă „scrie → verifică”. || It's the fast “write → check” loop."],
    ["Ce face `cargo clippy`? || What does `cargo clippy` do?", ["Rulează un linter cu sute de sugestii de cod mai idiomatic sau mai corect || Runs a linter with hundreds of suggestions for more idiomatic or more correct code", "Formatează codul || Formats code", "Optimizează binarul || Optimizes the binary", "Șterge codul mort || Deletes dead code"], "`cargo fmt` formatează; `clippy` analizează. || `cargo fmt` formats; `clippy` analyses."],
    ["Ce afișează pe un sistem de 64 de biți? || What does it print on a 64-bit system?", ["64", "32", "8", "128"], "`usize::BITS` e lățimea pointerului platformei. || `usize::BITS` is the platform pointer width.", { k: "out", c: c`
fn main() {
    println!("{}", usize::BITS);
}` }]
  ]);
})();

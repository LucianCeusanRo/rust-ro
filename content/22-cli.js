(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 19, icon: "⌨️", level: 3,
    title: { ro: "Unelte în linia de comandă (CLI)", en: "Command-line tools (CLI)" },
    summary: {
      ro: "Argumente cu <code>std::env::args</code> și apoi cu <code>clap</code> (derive): opțiuni, valori implicite, subcomenzi, enum-uri de valori. Plus <code>stdin</code>/<code>stdout</code>/<code>stderr</code> și coduri de ieșire — tot ce trebuie pentru o unealtă de administrare.",
      en: "Arguments with <code>std::env::args</code> and then with <code>clap</code> (derive): options, defaults, subcommands, value enums. Plus <code>stdin</code>/<code>stdout</code>/<code>stderr</code> and exit codes — everything an admin tool needs."
    },
    sections: [
      { h: { ro: "std::env::args", en: "std::env::args" },
        p: { ro: "<code>env::args()</code> întoarce un iterator de <code>String</code>; primul element e numele programului. E suficient pentru unelte mici. Erorile merg pe <code>stderr</code> (<code>eprintln!</code>), iar <code>std::process::exit(2)</code> setează codul de ieșire (0 = succes).",
             en: "<code>env::args()</code> returns an iterator of <code>String</code>; the first item is the program name. It's enough for small tools. Errors go to <code>stderr</code> (<code>eprintln!</code>), and <code>std::process::exit(2)</code> sets the exit code (0 = success)." },
        code: c`
use std::env;
use std::process;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    // în Playground nu ai argumente, deci folosim o valoare implicită
    let gazda = args.first().map(String::as_str).unwrap_or("127.0.0.1");
    let port: u16 = match args.get(1).map(|p| p.parse()) {
        None => 22,
        Some(Ok(p)) => p,
        Some(Err(e)) => {
            eprintln!("port invalid: {e}");
            process::exit(2);
        }
    };
    println!("verific {gazda}:{port}");
}` },
      { h: { ro: "clap cu derive", en: "clap with derive" },
        p: { ro: "Cu <code>clap</code> descrii argumentele ca un <code>struct</code>; <code>--help</code>, <code>--version</code>, validarea tipurilor și mesajele de eroare sunt generate. Câmpurile <code>Option</code> sunt opționale, <code>bool</code> sunt flag-uri, <code>Vec</code> acceptă valori multiple. În exemple folosim <code>parse_from</code> cu argumente fixe, ca să ruleze și fără terminal.",
             en: "With <code>clap</code> you describe the arguments as a <code>struct</code>; <code>--help</code>, <code>--version</code>, type validation and error messages are generated. <code>Option</code> fields are optional, <code>bool</code> fields are flags, <code>Vec</code> accepts multiple values. The examples use <code>parse_from</code> with fixed arguments so they run without a terminal." },
        code: c`
use clap::Parser;

/// Verifică porturi TCP pe o gazdă
#[derive(Parser, Debug)]
#[command(version, about)]
struct Cli {
    /// Gazda de verificat
    gazda: String,
    /// Porturile (se poate repeta)
    #[arg(short, long, default_values_t = [22, 443])]
    port: Vec<u16>,
    /// Timeout în milisecunde
    #[arg(short, long, default_value_t = 500)]
    timeout: u64,
    /// Afișează detalii
    #[arg(short, long)]
    verbose: bool,
}

fn main() {
    let cli = Cli::parse_from(["scan", "10.0.0.5", "-p", "80", "-p", "8080", "-v"]);
    println!("{} {:?} {} {}", cli.gazda, cli.port, cli.timeout, cli.verbose);
    let implicit = Cli::parse_from(["scan", "10.0.0.6"]);
    println!("{:?} {}", implicit.port, implicit.verbose);
}`, crate: "clap" },
      { h: { ro: "Subcomenzi și ValueEnum", en: "Subcommands and ValueEnum" },
        p: { ro: "<code>#[derive(Subcommand)]</code> pe un enum dă comenzi ca <code>git commit</code> / <code>git push</code>. <code>#[derive(ValueEnum)]</code> limitează o opțiune la o listă fixă de valori (de exemplu formatul de ieșire). <code>try_parse_from</code> întoarce <code>Result</code> în loc să închidă programul.",
             en: "<code>#[derive(Subcommand)]</code> on an enum gives commands like <code>git commit</code> / <code>git push</code>. <code>#[derive(ValueEnum)]</code> restricts an option to a fixed list of values (e.g. output format). <code>try_parse_from</code> returns a <code>Result</code> instead of exiting." },
        code: c`
use clap::{Parser, Subcommand, ValueEnum};

#[derive(Parser)]
struct Cli {
    #[arg(long, value_enum, default_value_t = Format::Text)]
    format: Format,
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Trimite ping
    Ping { gazda: String, #[arg(short, default_value_t = 4)] n: u32 },
    /// Afișează rutele
    Rute,
}

#[derive(Clone, Copy, ValueEnum)]
enum Format { Text, Json }

fn main() {
    let cli = Cli::parse_from(["net", "--format", "json", "ping", "1.1.1.1", "-n", "2"]);
    match (cli.cmd, cli.format) {
        (Cmd::Ping { gazda, n }, Format::Json) => println!("{{\"gazda\":\"{gazda}\",\"n\":{n}}}"),
        (Cmd::Ping { gazda, n }, Format::Text) => println!("ping {gazda} x{n}"),
        (Cmd::Rute, _) => println!("rute"),
    }
    let gresit = Cli::try_parse_from(["net", "--format", "xml", "rute"]);
    println!("eroare: {}", gresit.is_err());
}`, crate: "clap" },
      { h: { ro: "stdin, pipe-uri și coduri de ieșire", en: "stdin, pipes and exit codes" },
        p: { ro: "O unealtă bună citește din <code>stdin</code> (ca să meargă în pipe: <code>cat log | unealta</code>), scrie rezultate pe <code>stdout</code> și diagnostice pe <code>stderr</code>. <code>main</code> poate întoarce <code>ExitCode</code> sau <code>Result</code>; un <code>Err</code> dă cod 1. Pentru ieșire rapidă folosește <code>stdout().lock()</code> și <code>BufWriter</code>.",
             en: "A good tool reads <code>stdin</code> (so it works in pipes: <code>cat log | tool</code>), writes results to <code>stdout</code> and diagnostics to <code>stderr</code>. <code>main</code> can return <code>ExitCode</code> or <code>Result</code>; an <code>Err</code> gives exit code 1. For fast output use <code>stdout().lock()</code> and <code>BufWriter</code>." },
        code: c`
use std::io::{self, BufRead, BufWriter, Write};
use std::process::ExitCode;

fn numara_erori(intrare: impl BufRead) -> io::Result<usize> {
    let mut n = 0;
    for linie in intrare.lines() {
        if linie?.contains("ERROR") {
            n += 1;
        }
    }
    Ok(n)
}

fn main() -> ExitCode {
    // în loc de io::stdin().lock() folosim un text fix, ca să ruleze oriunde
    let log = "INFO start\nERROR link down\nINFO retry\nERROR timeout\n";
    let n = numara_erori(log.as_bytes()).unwrap();
    let mut out = BufWriter::new(io::stdout().lock());
    writeln!(out, "erori: {n}").unwrap();
    out.flush().unwrap();
    if n > 0 { ExitCode::from(1) } else { ExitCode::SUCCESS }
}`, noRun: true }
    ],
    exercises: [
      { title: { ro: "Filtru de log", en: "Log filter" },
        task: { ro: "Scrie <code>filtreaza(intrare: impl BufRead, nivel: &amp;str) -&gt; Vec&lt;String&gt;</code> care păstrează liniile ce încep cu nivelul dat (de ex. <code>\"WARN\"</code>), fără prefix și fără spațiul de după el. Rezultat: <code>[\"disc 91%\", \"cpu 88%\"]</code>.", en: "Write <code>filtreaza(input: impl BufRead, level: &amp;str) -&gt; Vec&lt;String&gt;</code> keeping lines that start with the given level (e.g. <code>\"WARN\"</code>), without the prefix and the space after it. Output: <code>[\"disc 91%\", \"cpu 88%\"]</code>." },
        hint: { ro: "<code>linie.strip_prefix(nivel)</code> apoi <code>.map(|r| r.trim_start().to_string())</code>.", en: "<code>line.strip_prefix(level)</code> then <code>.map(|r| r.trim_start().to_string())</code>." },
        starter: c`
use std::io::BufRead;

fn filtreaza(intrare: impl BufRead, nivel: &str) -> Vec<String> {
    let _ = (intrare, nivel);
    Vec::new() // TODO
}

fn main() {
    let log = "INFO boot\nWARN disc 91%\nERROR fan\nWARN cpu 88%\n";
    println!("{:?}", filtreaza(log.as_bytes(), "WARN"));
}`,
        solution: c`
use std::io::BufRead;

fn filtreaza(intrare: impl BufRead, nivel: &str) -> Vec<String> {
    intrare
        .lines()
        .map_while(Result::ok)
        .filter_map(|l| l.strip_prefix(nivel).map(|r| r.trim_start().to_string()))
        .collect()
}

fn main() {
    let log = "INFO boot\nWARN disc 91%\nERROR fan\nWARN cpu 88%\n";
    println!("{:?}", filtreaza(log.as_bytes(), "WARN"));
}`,
        expect: "[\"disc 91%\", \"cpu 88%\"]" }
    ]
  });
  QB("l19", [
    ["Care e primul element din `std::env::args()`? || What is the first item of `std::env::args()`?", ["Numele/calea programului || The program name/path", "Primul argument dat de utilizator || The first user argument", "Directorul curent || The current directory", "Numărul de argumente || The argument count"], "De aceea se folosește des `.skip(1)`. || That's why `.skip(1)` is common."],
    ["Ce afișează? || What does it print?", ["verific 127.0.0.1:22", "verific :22", "port invalid", "verific 127.0.0.1:0"], "Fără argumente se folosesc valorile implicite. || With no arguments the defaults are used.", { k: "out", c: c`
use std::env;
fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let gazda = args.first().map(String::as_str).unwrap_or("127.0.0.1");
    let port: u16 = args.get(1).and_then(|p| p.parse().ok()).unwrap_or(22);
    println!("verific {gazda}:{port}");
}` }],
    ["Unde trebuie scrise mesajele de eroare ale unei unelte CLI? || Where should a CLI tool write error messages?", ["Pe stderr (`eprintln!`) || To stderr (`eprintln!`)", "Pe stdout (`println!`) || To stdout (`println!`)", "Într-un fișier || To a file", "Nicăieri || Nowhere"], "Așa nu se amestecă cu datele trimise prin pipe. || That way they don't mix with data sent through a pipe."],
    ["Ce cod de ieșire înseamnă succes, prin convenție? || Which exit code means success, by convention?", ["0", "1", "-1", "255"], "Orice valoare nenulă semnalează o eroare. || Any non-zero value signals an error."],
    ["Ce cod de ieșire are un program al cărui `main` întoarce `Err(...)`? || What exit code does a program get when `main` returns `Err(...)`?", ["1", "0", "2", "101"], "Eroarea e afișată cu `Debug` pe stderr. (101 e codul pentru panic.) || The error is printed with `Debug` to stderr. (101 is the panic code.)"],
    ["Ce cod de ieșire are un program care dă panic? || What exit code does a panicking program get?", ["101", "1", "0", "134"], "Pe Unix, un panic din firul principal termină procesul cu codul 101 (dacă `panic = \"unwind\"`). || On Unix, a panic in the main thread ends the process with code 101 (with `panic = \"unwind\"`)."],
    ["Ce afișează? || What does it print?", ["10.0.0.5 [80, 8080] 500 true\n[22, 443] false", "10.0.0.5 [80] 500 true\n[22, 443] false", "10.0.0.5 [80, 8080] 500 true\n[] false", "eroare || error"], "`-p` repetat adună valori în `Vec`; fără `-p` se folosesc valorile implicite. || Repeated `-p` collects into the `Vec`; without `-p` the defaults are used.", { k: "out", crate: "clap", c: c`
use clap::Parser;
#[derive(Parser, Debug)]
struct Cli {
    gazda: String,
    #[arg(short, long, default_values_t = [22, 443])]
    port: Vec<u16>,
    #[arg(short, long, default_value_t = 500)]
    timeout: u64,
    #[arg(short, long)]
    verbose: bool,
}
fn main() {
    let cli = Cli::parse_from(["scan", "10.0.0.5", "-p", "80", "-p", "8080", "-v"]);
    println!("{} {:?} {} {}", cli.gazda, cli.port, cli.timeout, cli.verbose);
    let implicit = Cli::parse_from(["scan", "10.0.0.6"]);
    println!("{:?} {}", implicit.port, implicit.verbose);
}` }],
    ["Ce afișează? || What does it print?", ["{\"gazda\":\"1.1.1.1\",\"n\":2}\neroare: true", "ping 1.1.1.1 x2\neroare: true", "{\"gazda\":\"1.1.1.1\",\"n\":4}\neroare: false", "rute\neroare: true"], "`--format json` alege ramura JSON; `xml` nu e o valoare permisă de `ValueEnum`. || `--format json` picks the JSON branch; `xml` isn't allowed by the `ValueEnum`.", { k: "out", crate: "clap", c: c`
use clap::{Parser, Subcommand, ValueEnum};
#[derive(Parser)]
struct Cli {
    #[arg(long, value_enum, default_value_t = Format::Text)]
    format: Format,
    #[command(subcommand)]
    cmd: Cmd,
}
#[derive(Subcommand)]
enum Cmd {
    Ping { gazda: String, #[arg(short, default_value_t = 4)] n: u32 },
    Rute,
}
#[derive(Clone, Copy, ValueEnum)]
enum Format { Text, Json }
fn main() {
    let cli = Cli::parse_from(["net", "--format", "json", "ping", "1.1.1.1", "-n", "2"]);
    match (cli.cmd, cli.format) {
        (Cmd::Ping { gazda, n }, Format::Json) => println!("{{\"gazda\":\"{gazda}\",\"n\":{n}}}"),
        (Cmd::Ping { gazda, n }, Format::Text) => println!("ping {gazda} x{n}"),
        (Cmd::Rute, _) => println!("rute"),
    }
    let gresit = Cli::try_parse_from(["net", "--format", "xml", "rute"]);
    println!("eroare: {}", gresit.is_err());
}` }],
    ["Ce afișează? || What does it print?", ["true", "false"], "„abc” nu se poate parsa ca `u16`, deci clap întoarce o eroare de validare. || “abc” can't be parsed as `u16`, so clap returns a validation error.", { k: "out", crate: "clap", c: c`
use clap::Parser;
#[derive(Parser)]
struct Cli {
    #[arg(long)]
    port: u16,
}
fn main() {
    println!("{}", Cli::try_parse_from(["x", "--port", "abc"]).is_err());
}` }],
    ["Ce afișează? || What does it print?", ["None", "Some(\"\")", "eroare || error", "Some(\"eth0\")"], "Un câmp `Option<T>` devine opțiune opțională. || An `Option<T>` field becomes an optional option.", { k: "out", crate: "clap", c: c`
use clap::Parser;
#[derive(Parser)]
struct Cli {
    #[arg(long)]
    interfata: Option<String>,
}
fn main() {
    let c = Cli::parse_from(["x"]);
    println!("{:?}", c.interfata);
}` }],
    ["Ce afișează? || What does it print?", ["true", "false"], "Argumentul poziţional obligatoriu `gazda` lipsește. || The required positional `gazda` is missing.", { k: "out", crate: "clap", c: c`
use clap::Parser;
#[derive(Parser)]
struct Cli {
    gazda: String,
}
fn main() {
    println!("{}", Cli::try_parse_from(["x"]).is_err());
}` }],
    ["Ce face `#[arg(short, long)]` pe câmpul `verbose: bool`? || What does `#[arg(short, long)]` do on a `verbose: bool` field?", ["Creează flag-urile `-v` și `--verbose` || Creates the `-v` and `--verbose` flags", "Cere o valoare `true`/`false` || Requires a `true`/`false` value", "Ascunde opțiunea || Hides the option", "Face câmpul obligatoriu || Makes the field mandatory"], "Literele și numele lungi sunt derivate din numele câmpului. || The short letter and long name are derived from the field name."],
    ["De unde ia clap textul pentru `--help`? || Where does clap get the `--help` text from?", ["Din comentariile `///` de pe struct și câmpuri || From the `///` doc comments on the struct and fields", "Din README || From the README", "Din Cargo.lock || From Cargo.lock", "Trebuie scris manual mereu || It must always be written by hand"], "`#[command(version, about)]` ia versiunea și descrierea din `Cargo.toml`. || `#[command(version, about)]` takes the version and description from `Cargo.toml`."],
    ["Ce diferență e între `parse()` și `try_parse()` în clap? || What's the difference between `parse()` and `try_parse()` in clap?", ["`parse()` afișează eroarea și închide procesul; `try_parse()` întoarce `Result` || `parse()` prints the error and exits; `try_parse()` returns a `Result`", "Sunt identice || They're identical", "`try_parse()` e async", "`parse()` nu validează tipurile || `parse()` doesn't validate types"], "`try_parse_from` e util în teste. || `try_parse_from` is handy in tests."],
    ["Ce afișează? || What does it print?", ["erori: 2", "erori: 4", "erori: 0", "erori: 1"], "Două linii conțin „ERROR”. Codul de ieșire ar fi 1. || Two lines contain “ERROR”. The exit code would be 1.", { k: "out", c: c`
use std::io::{self, BufRead};
fn numara_erori(intrare: impl BufRead) -> io::Result<usize> {
    let mut n = 0;
    for linie in intrare.lines() {
        if linie?.contains("ERROR") { n += 1; }
    }
    Ok(n)
}
fn main() {
    let log = "INFO start\nERROR link down\nINFO retry\nERROR timeout\n";
    println!("erori: {}", numara_erori(log.as_bytes()).unwrap());
}` }],
    ["De ce primește funcția `impl BufRead` și nu direct `Stdin`? || Why does the function take `impl BufRead` instead of `Stdin` directly?", ["Ca s-o poți testa cu un `&[u8]` și s-o folosești cu fișiere sau stdin || So you can test it with a `&[u8]` and use it with files or stdin", "Pentru că `Stdin` nu se poate citi || Because `Stdin` can't be read", "E mai rapid la compilare || It compiles faster", "Clap o cere || clap requires it"], "`&[u8]`, `BufReader<File>` și `StdinLock` implementează toate `BufRead`. || `&[u8]`, `BufReader<File>` and `StdinLock` all implement `BufRead`."],
    ["De ce `BufWriter` când scrii multe linii? || Why `BufWriter` when writing many lines?", ["Grupează scrierile mici în mai puține apeluri de sistem || It batches small writes into fewer system calls", "Colorează textul || Colours the text", "Comprimă datele || Compresses the data", "E obligatoriu pentru stdout || It's required for stdout"], "Nu uita `flush()` sau lasă `BufWriter` să facă flush la drop. || Don't forget `flush()`, or let `BufWriter` flush on drop."],
    ["Ce afișează? || What does it print?", ["[\"a\", \"b c\"]", "[\"a\", \"b\", \"c\"]", "[\"a b c\"]", "[\"a\"]"], "`split_once` taie doar la primul separator. || `split_once` splits only at the first separator.", { k: "out", c: c`
fn main() {
    let (a, b) = "a b c".split_once(' ').unwrap();
    println!("{:?}", [a, b]);
}` }],
    ["Ce afișează? || What does it print?", ["Some(\"8080\")", "Some(\"--port=8080\")", "None", "Some(\"=8080\")"], "`strip_prefix` întoarce restul dacă șirul începe cu prefixul. || `strip_prefix` returns the rest if the string starts with the prefix.", { k: "out", c: c`
fn main() {
    println!("{:?}", "--port=8080".strip_prefix("--port="));
}` }],
    ["Cum instalezi local o unealtă CLI scrisă în Rust, din folderul proiectului? || How do you install a Rust CLI tool locally from the project folder?", ["`cargo install --path .`", "`cargo build --install`", "`rustc --install`", "`cargo add .`"], "Binarul ajunge în `~/.cargo/bin`. || The binary lands in `~/.cargo/bin`."],
    ["Ce face `cargo build --release` pentru o unealtă CLI? || What does `cargo build --release` do for a CLI tool?", ["Compilează cu optimizări; binarul e în `target/release/` || Builds with optimizations; the binary is in `target/release/`", "Publică pe crates.io || Publishes to crates.io", "Rulează testele || Runs the tests", "Creează un installer || Creates an installer"], "Rezultatul e un singur executabil, fără runtime separat. || The result is a single executable with no separate runtime."],
    ["Ce eroare dă folosirea `Cli::parse_from` fără `use clap::Parser`? || Which error does using `Cli::parse_from` without `use clap::Parser` give?", ["E0599", "E0433", "E0425", "E0412"], "Metoda vine din trait-ul `Parser`, care trebuie adus în scope. || The method comes from the `Parser` trait, which must be in scope.", { k: "err", err: "E0599", crate: "clap", c: c`
#[derive(clap::Parser)]
struct Cli { n: u32 }
fn main() {
    let c = Cli::parse_from(["x", "1"]);
    println!("{}", c.n);
}` }]
  ]);
})();

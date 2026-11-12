(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 23, icon: "🧩", level: 4,
    title: { ro: "WebAssembly (WASM)", en: "WebAssembly (WASM)" },
    summary: {
      ro: "Compilezi Rust în WebAssembly ca să rulezi în browser sau pe servere WASI. <code>wasm-bindgen</code> leagă Rust de JavaScript, <code>wasm-pack</code> împachetează rezultatul. Ideea cheie: ții logica pură (testabilă nativ) separată de stratul subțire de legătură cu JS. Playground-ul nu are <code>wasm-bindgen</code>; codul cu el e verificat local cu <code>cargo build</code>.",
      en: "Compile Rust to WebAssembly to run in the browser or on WASI servers. <code>wasm-bindgen</code> bridges Rust and JavaScript, <code>wasm-pack</code> packages the result. Key idea: keep pure logic (natively testable) separate from a thin JS binding layer. The Playground doesn't have <code>wasm-bindgen</code>; code using it is checked locally with <code>cargo build</code>."
    },
    sections: [
      { h: { ro: "Ce e WASM și ținte", en: "What WASM is and targets" },
        p: { ro: "WebAssembly e un format binar portabil, rulat într-un sandbox de browser sau de un runtime (Wasmtime, Wasmer). Ținte Rust uzuale: <code>wasm32-unknown-unknown</code> (browser, fără sistem de operare) și <code>wasm32-wasip1</code> / <code>wasm32-wasip2</code> (WASI: fișiere, ceas, socket-uri prin interfețe standard). În browser nu ai acces direct la fișiere sau socket-uri — totul trece prin JS.",
             en: "WebAssembly is a portable binary format run in a sandbox by the browser or a runtime (Wasmtime, Wasmer). Common Rust targets: <code>wasm32-unknown-unknown</code> (browser, no OS) and <code>wasm32-wasip1</code> / <code>wasm32-wasip2</code> (WASI: files, clocks, sockets through standard interfaces). In the browser you have no direct file or socket access — everything goes through JS." },
        shell: c`
$ rustup target add wasm32-unknown-unknown
$ cargo install wasm-pack
$ cargo new --lib subnet-wasm && cd subnet-wasm
$ cargo add wasm-bindgen

# Cargo.toml
[lib]
crate-type = ["cdylib", "rlib"]   # cdylib pentru .wasm, rlib pentru teste native

[profile.release]
opt-level = "z"     # optimizează pentru dimensiune
lto = true

$ wasm-pack build --target web     # → pkg/subnet_wasm.js + subnet_wasm_bg.wasm` },
      { h: { ro: "Export cu wasm-bindgen", en: "Exporting with wasm-bindgen" },
        p: { ro: "<code>#[wasm_bindgen]</code> pe o funcție publică generează codul de legătură JS. Tipurile simple (numere, <code>bool</code>, <code>String</code>, <code>&amp;str</code>, <code>Vec&lt;u8&gt;</code>) trec automat; o eroare <code>Result&lt;T, JsError&gt;</code> devine excepție în JS. Logica e în funcții Rust normale, testate cu <code>cargo test</code> pe calculatorul tău.",
             en: "<code>#[wasm_bindgen]</code> on a public function generates the JS glue. Simple types (numbers, <code>bool</code>, <code>String</code>, <code>&amp;str</code>, <code>Vec&lt;u8&gt;</code>) cross automatically; a <code>Result&lt;T, JsError&gt;</code> error becomes a JS exception. The logic lives in normal Rust functions, tested with <code>cargo test</code> on your machine." },
        code: c`
use std::net::Ipv4Addr;
use wasm_bindgen::prelude::*;

// logică pură: rulează și se testează nativ
pub fn hosturi(prefix: u8) -> Option<u32> {
    match prefix {
        0..=30 => Some(((1u64 << (32 - prefix as u32)) - 2) as u32),
        31 => Some(2),
        32 => Some(1),
        _ => None,
    }
}

// strat subțire pentru JS
#[wasm_bindgen]
pub fn calculeaza(cidr: &str) -> Result<String, JsError> {
    let (ip, p) = cidr.split_once('/').ok_or_else(|| JsError::new("lipsește /prefix"))?;
    let ip: Ipv4Addr = ip.parse().map_err(|_| JsError::new("IP invalid"))?;
    let p: u8 = p.parse().map_err(|_| JsError::new("prefix invalid"))?;
    let n = hosturi(p).ok_or_else(|| JsError::new("prefix > 32"))?;
    Ok(format!("{ip}/{p}: {n} gazde"))
}

fn main() {
    println!("{:?} {:?} {:?}", hosturi(24), hosturi(31), hosturi(33));
}`, crate: "wasm-bindgen" },
      { h: { ro: "Folosirea din JavaScript", en: "Using it from JavaScript" },
        p: { ro: "Cu <code>--target web</code>, <code>wasm-pack</code> generează un modul ES. Inițializezi modulul o dată (<code>await init()</code>), apoi apelezi funcțiile exportate ca pe funcții JS obișnuite. Fișierul <code>.wasm</code> trebuie servit prin HTTP cu tipul <code>application/wasm</code> (nu merge din <code>file://</code>).",
             en: "With <code>--target web</code>, <code>wasm-pack</code> generates an ES module. You initialise it once (<code>await init()</code>), then call the exported functions like ordinary JS functions. The <code>.wasm</code> file must be served over HTTP with type <code>application/wasm</code> (it won't work from <code>file://</code>)." },
        shell: c`
<!-- index.html -->
<input id="cidr" value="10.0.0.0/22">
<output id="rez"></output>
<script type="module">
  import init, { calculeaza } from "./pkg/subnet_wasm.js";
  await init();
  const intrare = document.getElementById("cidr");
  intrare.oninput = () => {
    try { rez.textContent = calculeaza(intrare.value); }
    catch (e) { rez.textContent = "eroare: " + e.message; }
  };
</script>

$ python3 -m http.server 8000   # apoi deschide http://localhost:8000` },
      { h: { ro: "Când merită WASM", en: "When WASM pays off" },
        p: { ro: "WASM ajută la calcul intens (parsare, compresie, criptografie, procesare de imagini) și când vrei aceeași logică Rust pe server și în browser. Pentru manipulări mici de DOM, JavaScript simplu e de obicei mai simplu. Trecerea datelor între JS și WASM are un cost (copiere, conversie de șiruri), deci trimite loturi mari, nu mii de apeluri mici.",
             en: "WASM helps with heavy computation (parsing, compression, cryptography, image processing) and when you want the same Rust logic on the server and in the browser. For small DOM tweaks, plain JavaScript is usually simpler. Moving data between JS and WASM has a cost (copying, string conversion), so send large batches, not thousands of tiny calls." },
        code: c`
// Varianta „lot”: un singur apel pentru multe linii, în loc de un apel per linie
pub fn numara_erori(log: &str) -> usize {
    log.lines().filter(|l| l.contains("ERROR")).count()
}

fn main() {
    let log = "INFO a\nERROR b\nERROR c\nINFO d";
    println!("{}", numara_erori(log));
}` }
    ],
    exercises: [
      { title: { ro: "Logica pentru un validator MAC", en: "Logic for a MAC validator" },
        task: { ro: "Scrie funcția pură <code>normalizeaza_mac(s: &amp;str) -&gt; Option&lt;String&gt;</code> (pe care ai expune-o apoi cu <code>#[wasm_bindgen]</code>): acceptă separatori <code>:</code>, <code>-</code> sau <code>.</code>, cere exact 12 cifre hexa și întoarce formatul <code>aa:bb:cc:dd:ee:ff</code>. Rezultat: <code>Some(\"00:1a:2b:3c:4d:5e\") Some(\"00:1a:2b:3c:4d:5e\") None</code>.", en: "Write the pure function <code>normalizeaza_mac(s: &amp;str) -&gt; Option&lt;String&gt;</code> (which you'd then expose with <code>#[wasm_bindgen]</code>): accept separators <code>:</code>, <code>-</code> or <code>.</code>, require exactly 12 hex digits and return the <code>aa:bb:cc:dd:ee:ff</code> format. Output: <code>Some(\"00:1a:2b:3c:4d:5e\") Some(\"00:1a:2b:3c:4d:5e\") None</code>." },
        hint: { ro: "Filtrează separatorii, verifică <code>is_ascii_hexdigit</code> și lungimea 12, apoi grupează câte 2 cu <code>chunks(2)</code>.", en: "Filter out separators, check <code>is_ascii_hexdigit</code> and length 12, then group by 2 with <code>chunks(2)</code>." },
        starter: c`
fn normalizeaza_mac(s: &str) -> Option<String> {
    let _ = s;
    None // TODO
}

fn main() {
    println!(
        "{:?} {:?} {:?}",
        normalizeaza_mac("00-1A-2B-3C-4D-5E"),
        normalizeaza_mac("001a.2b3c.4d5e"),
        normalizeaza_mac("00:1a:2b:3c:4d")
    );
}`,
        solution: c`
fn normalizeaza_mac(s: &str) -> Option<String> {
    let hex: Vec<char> = s
        .chars()
        .filter(|c| !matches!(c, ':' | '-' | '.'))
        .map(|c| c.to_ascii_lowercase())
        .collect();
    if hex.len() != 12 || !hex.iter().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let grupuri: Vec<String> = hex.chunks(2).map(|p| p.iter().collect()).collect();
    Some(grupuri.join(":"))
}

fn main() {
    println!(
        "{:?} {:?} {:?}",
        normalizeaza_mac("00-1A-2B-3C-4D-5E"),
        normalizeaza_mac("001a.2b3c.4d5e"),
        normalizeaza_mac("00:1a:2b:3c:4d")
    );
}`,
        expect: "Some(\"00:1a:2b:3c:4d:5e\") Some(\"00:1a:2b:3c:4d:5e\") None" }
    ]
  });
  QB("l23", [
    ["Ce țintă Rust folosești pentru WASM în browser? || Which Rust target do you use for WASM in the browser?", ["`wasm32-unknown-unknown`", "`x86_64-unknown-linux-gnu`", "`wasm64-browser`", "`thumbv7em-none-eabihf`"], "Pentru WASI există `wasm32-wasip1` și `wasm32-wasip2`. || For WASI there are `wasm32-wasip1` and `wasm32-wasip2`."],
    ["Ce face `wasm-bindgen`? || What does `wasm-bindgen` do?", ["Generează codul de legătură între Rust/WASM și JavaScript || Generates the glue between Rust/WASM and JavaScript", "Compilează JavaScript în Rust || Compiles JavaScript to Rust", "E un browser || It's a browser", "Minifică CSS || Minifies CSS"], "Convertește șiruri, numere, obiecte și erori între cele două lumi. || It converts strings, numbers, objects and errors between the two worlds."],
    ["Ce face `wasm-pack build --target web`? || What does `wasm-pack build --target web` do?", ["Compilează în WASM, rulează wasm-bindgen și scrie un pachet ES module în `pkg/` || Builds to WASM, runs wasm-bindgen and writes an ES module package in `pkg/`", "Pornește un server web || Starts a web server", "Publică pe npm automat || Publishes to npm automatically", "Rulează testele în browser || Runs tests in the browser"], "Alte ținte: `bundler`, `nodejs`, `no-modules`. || Other targets: `bundler`, `nodejs`, `no-modules`."],
    ["Ce `crate-type` e necesar pentru a obține un fișier `.wasm` din bibliotecă? || Which `crate-type` is needed to get a `.wasm` file from a library?", ["`cdylib`", "`rlib`", "`proc-macro`", "`bin`"], "Se adaugă des și `rlib` ca să poți folosi crate-ul în teste native. || `rlib` is often added too so you can use the crate in native tests."],
    ["Ce afișează? || What does it print?", ["Some(254) Some(2) None", "Some(256) Some(2) None", "Some(254) Some(0) None", "Some(254) Some(2) Some(0)"], "/24 are 256 adrese minus rețeaua și broadcast-ul; /31 (RFC 3021) are 2 adrese utilizabile pe legături punct-la-punct. || /24 has 256 addresses minus network and broadcast; /31 (RFC 3021) has 2 usable addresses on point-to-point links.", { k: "out", c: c`
fn hosturi(prefix: u8) -> Option<u32> {
    match prefix {
        0..=30 => Some(((1u64 << (32 - prefix as u32)) - 2) as u32),
        31 => Some(2),
        32 => Some(1),
        _ => None,
    }
}
fn main() {
    println!("{:?} {:?} {:?}", hosturi(24), hosturi(31), hosturi(33));
}` }],
    ["Ce afișează? || What does it print?", ["Some(4294967294)", "None", "Some(4294967296)", "panic"], "/0 = 2^32 adrese − 2. Scăderea se face în `u64` înainte de conversie: `(1u64 << 32) as u32` ar fi 0, iar `0 - 2` ar da panic de overflow în debug. || /0 = 2^32 addresses − 2. The subtraction happens in `u64` before the cast: `(1u64 << 32) as u32` would be 0 and `0 - 2` would panic on overflow in debug.", { k: "out", c: c`
fn hosturi(prefix: u8) -> Option<u32> {
    match prefix {
        0..=30 => Some(((1u64 << (32 - prefix as u32)) - 2) as u32),
        31 => Some(2),
        32 => Some(1),
        _ => None,
    }
}
fn main() {
    println!("{:?}", hosturi(0));
}` }],
    ["Ce devine în JavaScript un `Err(JsError::new(\"IP invalid\"))` întors de o funcție `#[wasm_bindgen]`? || What does an `Err(JsError::new(\"IP invalid\"))` from a `#[wasm_bindgen]` function become in JavaScript?", ["O excepție `Error` cu mesajul „IP invalid” || An `Error` exception with message “IP invalid”", "`null`", "`undefined`", "Un obiect `{ ok: false }` || An `{ ok: false }` object"], "O prinzi cu `try { ... } catch (e) { e.message }`. || Catch it with `try { ... } catch (e) { e.message }`."],
    ["Poate codul WASM din browser să deschidă direct un socket TCP? || Can browser WASM open a TCP socket directly?", ["Nu; are acces doar la ce îi oferă JS (fetch, WebSocket) || No; it only gets what JS provides (fetch, WebSocket)", "Da, cu `std::net` || Yes, with `std::net`", "Doar în Chrome || Only in Chrome", "Doar în modul release || Only in release mode"], "Sandbox-ul browserului se aplică și WASM-ului. || The browser sandbox applies to WASM too."],
    ["De ce ții logica pură separată de funcțiile `#[wasm_bindgen]`? || Why keep pure logic separate from the `#[wasm_bindgen]` functions?", ["O poți testa nativ cu `cargo test` și refolosi pe server || You can test it natively with `cargo test` and reuse it on the server", "Pentru că `#[wasm_bindgen]` nu acceptă `if` || Because `#[wasm_bindgen]` doesn't allow `if`", "E mai mic fișierul .wasm || The .wasm file is smaller", "E obligatoriu || It's required"], "Stratul de legătură rămâne subțire și ușor de verificat. || The binding layer stays thin and easy to review."],
    ["De ce nu merge un `.wasm` încărcat din `file://`? || Why doesn't a `.wasm` file load from `file://`?", ["Browserele cer ca modulele să fie servite prin HTTP(S), cu tipul MIME `application/wasm` pentru streaming || Browsers require modules served over HTTP(S), with MIME type `application/wasm` for streaming", "WASM nu poate fi salvat pe disc || WASM can't be saved to disk", "Doar Firefox îl blochează || Only Firefox blocks it", "Merge || It works"], "Un server local simplu rezolvă problema. || A simple local server fixes it."],
    ["Ce face `opt-level = \"z\"` în profilul release? || What does `opt-level = \"z\"` do in the release profile?", ["Optimizează pentru dimensiune minimă a binarului || Optimizes for minimal binary size", "Dezactivează optimizările || Disables optimizations", "Optimizează doar viteza || Optimizes only for speed", "Activează debug || Enables debug info"], "Pentru WASM, fișierul mai mic se descarcă mai repede. `wasm-opt` poate micșora și mai mult. || For WASM, a smaller file downloads faster. `wasm-opt` can shrink it further."],
    ["Ce afișează? || What does it print?", ["2", "4", "1", "0"], "Două linii conțin „ERROR”. || Two lines contain “ERROR”.", { k: "out", c: c`
pub fn numara_erori(log: &str) -> usize {
    log.lines().filter(|l| l.contains("ERROR")).count()
}
fn main() {
    println!("{}", numara_erori("INFO a\nERROR b\nERROR c\nINFO d"));
}` }],
    ["De ce e mai bine un apel WASM pentru tot log-ul decât câte unul pe linie? || Why is one WASM call for the whole log better than one per line?", ["Fiecare trecere JS↔WASM are un cost (copiere, conversie de șiruri) || Each JS↔WASM crossing has a cost (copying, string conversion)", "WASM nu suportă bucle || WASM doesn't support loops", "JS nu poate trimite șiruri scurte || JS can't send short strings", "Nu contează || It doesn't matter"], "Trimite loturi, nu mii de apeluri mici. || Send batches, not thousands of tiny calls."],
    ["Pentru ce e potrivit WASM în browser? || What is WASM in the browser well suited for?", ["Calcul intens: parsare, compresie, criptografie, imagini || Heavy computation: parsing, compression, crypto, images", "Schimbarea culorii unui buton || Changing a button's colour", "Înlocuirea completă a HTML || Fully replacing HTML", "Stocarea parolelor || Storing passwords"], "Pentru DOM simplu, JavaScript e de obicei mai simplu. || For simple DOM work, JavaScript is usually simpler."],
    ["Ce este WASI? || What is WASI?", ["O interfață standard de sistem pentru WASM în afara browserului (fișiere, ceas, rețea) || A standard system interface for WASM outside the browser (files, clocks, network)", "Un framework web || A web framework", "Un browser || A browser", "Un compilator C || A C compiler"], "Runtime-uri ca Wasmtime rulează module WASI. || Runtimes like Wasmtime run WASI modules."],
    ["Ce afișează? || What does it print?", ["Some(\"00:1a:2b:3c:4d:5e\")", "Some(\"00-1A-2B-3C-4D-5E\")", "None", "Some(\"001a2b3c4d5e\")"], "Separatorii sunt eliminați, literele trec în minuscule, apoi se grupează câte 2. || Separators are removed, letters lower-cased, then grouped by 2.", { k: "out", c: c`
fn normalizeaza_mac(s: &str) -> Option<String> {
    let hex: Vec<char> = s.chars().filter(|c| !matches!(c, ':' | '-' | '.')).map(|c| c.to_ascii_lowercase()).collect();
    if hex.len() != 12 || !hex.iter().all(|c| c.is_ascii_hexdigit()) { return None; }
    let g: Vec<String> = hex.chunks(2).map(|p| p.iter().collect()).collect();
    Some(g.join(":"))
}
fn main() {
    println!("{:?}", normalizeaza_mac("00-1A-2B-3C-4D-5E"));
}` }],
    ["Ce afișează? || What does it print?", ["None", "Some(\"zz:1a:2b:3c:4d:5e\")", "Some(\"00:1a:2b:3c:4d:5e\")", "panic"], "„z” nu e cifră hexa. || “z” isn't a hex digit.", { k: "out", c: c`
fn normalizeaza_mac(s: &str) -> Option<String> {
    let hex: Vec<char> = s.chars().filter(|c| !matches!(c, ':' | '-' | '.')).map(|c| c.to_ascii_lowercase()).collect();
    if hex.len() != 12 || !hex.iter().all(|c| c.is_ascii_hexdigit()) { return None; }
    let g: Vec<String> = hex.chunks(2).map(|p| p.iter().collect()).collect();
    Some(g.join(":"))
}
fn main() {
    println!("{:?}", normalizeaza_mac("zz:1a:2b:3c:4d:5e"));
}` }],
    ["Ce afișează? || What does it print?", ["[[1, 2], [3, 4], [5]]", "[[1, 2], [3, 4]]", "[[1], [2], [3], [4], [5]]", "[1, 2, 3, 4, 5]"], "`chunks(2)` lasă ultimul grup mai scurt dacă lungimea e impară. || `chunks(2)` leaves the last group shorter if the length is odd.", { k: "out", c: c`
fn main() {
    let v = [1, 2, 3, 4, 5];
    println!("{:?}", v.chunks(2).collect::<Vec<_>>());
}` }],
    ["Ce crate oferă acces la API-urile browserului (DOM, `fetch`, `console`) din Rust? || Which crate gives access to browser APIs (DOM, `fetch`, `console`) from Rust?", ["`web-sys` (cu `js-sys` pentru tipurile JS de bază) || `web-sys` (with `js-sys` for core JS types)", "`tokio`", "`std::web`", "`serde`"], "Fiecare API web se activează ca feature în `web-sys`. || Each web API is enabled as a feature in `web-sys`."],
    ["Compilează codul de mai jos pe o țintă nativă (nu WASM)? || Does the code below compile on a native (non-WASM) target?", ["Da || Yes", "Nu || No"], "Macro-ul `#[wasm_bindgen]` compilează și nativ; doar apelurile către funcții JS importate nu ar funcționa. || The `#[wasm_bindgen]` macro also compiles natively; only calls to imported JS functions wouldn't work.", { k: "ok", crate: "wasm-bindgen", c: c`
use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn aduna(a: u32, b: u32) -> u32 { a + b }
fn main() {
    println!("{}", aduna(2, 3));
}` }]
  ]);
})();

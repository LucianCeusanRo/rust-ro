(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 24, icon: "🔌", level: 4,
    title: { ro: "Introducere în embedded", en: "Embedded intro" },
    summary: {
      ro: "Rust pe microcontrolere: <code>#![no_std]</code>, <code>core</code> vs <code>std</code>, regiștri și operații pe biți, buffere cu dimensiune fixă, mașini de stări și stratificarea PAC → HAL → <code>embedded-hal</code>. Exemplele rulează pe PC (simulăm regiștrii), dar folosesc doar ce există și în <code>core</code>.",
      en: "Rust on microcontrollers: <code>#![no_std]</code>, <code>core</code> vs <code>std</code>, registers and bit operations, fixed-size buffers, state machines and the PAC → HAL → <code>embedded-hal</code> layering. The examples run on a PC (registers are simulated) but only use what also exists in <code>core</code>."
    },
    sections: [
      { h: { ro: "no_std și core", en: "no_std and core" },
        p: { ro: "Pe un microcontroler nu există sistem de operare, deci nici fișiere, fire sau heap implicit. <code>#![no_std]</code> renunță la <code>std</code> și păstrează <code>core</code> (tipuri, <code>Option</code>, <code>Result</code>, iteratori, slice-uri, formatare). <code>alloc</code> (<code>Vec</code>, <code>String</code>, <code>Box</code>) e disponibil doar dacă adaugi un alocator. Un program <code>no_std</code> trebuie să definească și ce se întâmplă la panic (de ex. crate-ul <code>panic-halt</code>).",
             en: "A microcontroller has no operating system, so no files, threads or default heap. <code>#![no_std]</code> drops <code>std</code> and keeps <code>core</code> (types, <code>Option</code>, <code>Result</code>, iterators, slices, formatting). <code>alloc</code> (<code>Vec</code>, <code>String</code>, <code>Box</code>) is only available if you add an allocator. A <code>no_std</code> program must also define what happens on panic (e.g. the <code>panic-halt</code> crate)." },
        shell: c`
// src/main.rs pe un Cortex-M (schelet tipic cu cortex-m-rt)
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;   // la panic: buclă infinită

#[entry]
fn main() -> ! {
    // inițializează ceasul, pinii...
    loop {
        // citește senzori, aprinde LED-uri
    }
}

$ rustup target add thumbv7em-none-eabihf   # Cortex-M4F / M7F
$ cargo build --release --target thumbv7em-none-eabihf
$ probe-rs run --chip <CIP> target/thumbv7em-none-eabihf/release/app` },
      { h: { ro: "Regiștri și operații pe biți", en: "Registers and bit operations" },
        p: { ro: "Perifericele se controlează scriind biți în regiștri la adrese fixe. Accesul se face cu <code>read_volatile</code>/<code>write_volatile</code>, ca optimizatorul să nu elimine scrierile. Aici simulăm un registru GPIO cu o variabilă; pe hardware ar fi o adresă din fișa tehnică, iar crate-urile PAC generează un API sigur pentru ea.",
             en: "Peripherals are controlled by writing bits to registers at fixed addresses. Access uses <code>read_volatile</code>/<code>write_volatile</code> so the optimizer can't drop the writes. Here we simulate a GPIO register with a variable; on hardware it would be an address from the datasheet, and PAC crates generate a safe API for it." },
        code: c`
use core::ptr;

struct Gpio { odr: *mut u32 } // registrul „output data”

impl Gpio {
    fn seteaza(&self, pin: u32) {
        unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) | (1 << pin)) }
    }
    fn sterge(&self, pin: u32) {
        unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) & !(1 << pin)) }
    }
    fn comuta(&self, pin: u32) {
        unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) ^ (1 << pin)) }
    }
}

fn main() {
    let mut registru: u32 = 0; // pe hardware: o adresă fixă, de ex. din fișa tehnică
    let led = Gpio { odr: &mut registru };
    led.seteaza(5);
    led.seteaza(0);
    led.comuta(0);
    led.sterge(3);
    println!("{:#010b}", unsafe { ptr::read_volatile(led.odr) });
}` },
      { h: { ro: "Memorie fixă și fără alocări", en: "Fixed memory, no allocations" },
        p: { ro: "Fără heap, folosești tablouri de dimensiune fixă cunoscută la compilare, cu generice <code>const N: usize</code>. Crate-ul <code>heapless</code> oferă <code>Vec</code>, <code>String</code> și cozi cu capacitate fixă. Mai jos, un buffer circular pentru ultimele N citiri ale unui senzor — fără nicio alocare.",
             en: "Without a heap you use fixed-size arrays known at compile time, with <code>const N: usize</code> generics. The <code>heapless</code> crate provides fixed-capacity <code>Vec</code>, <code>String</code> and queues. Below, a ring buffer of the last N sensor readings — with no allocation at all." },
        code: c`
struct Inel<const N: usize> {
    date: [u16; N],
    poz: usize,
    plin: bool,
}

impl<const N: usize> Inel<N> {
    const fn nou() -> Self {
        Self { date: [0; N], poz: 0, plin: false }
    }
    fn adauga(&mut self, v: u16) {
        self.date[self.poz] = v;
        self.poz = (self.poz + 1) % N;
        if self.poz == 0 {
            self.plin = true;
        }
    }
    fn medie(&self) -> Option<u16> {
        let n = if self.plin { N } else { self.poz };
        if n == 0 {
            return None;
        }
        let suma: u32 = self.date[..n].iter().map(|&x| x as u32).sum();
        Some((suma / n as u32) as u16)
    }
}

fn main() {
    let mut temp: Inel<4> = Inel::nou();
    println!("{:?}", temp.medie());
    for v in [210, 215, 220, 230, 250] {
        temp.adauga(v);
    }
    println!("{:?} {}", temp.medie(), core::mem::size_of::<Inel<4>>());
}` },
      { h: { ro: "Mașini de stări, HAL și embedded-hal", en: "State machines, HAL and embedded-hal" },
        p: { ro: "Firmware-ul e de obicei o buclă care reacționează la evenimente; un <code>enum</code> pentru stări face tranzițiile explicite și verificate. Straturi: <b>PAC</b> (regiștri generați din fișa SVD) → <b>HAL</b> (API sigur pentru un cip) → trait-urile <code>embedded-hal</code> 1.0 (<code>OutputPin</code>, <code>I2c</code>, <code>SpiBus</code>, <code>DelayNs</code>), pe care un driver de senzor le folosește ca să meargă pe orice cip. Pentru concurență: întreruperi, RTIC sau <code>embassy</code> (async).",
             en: "Firmware is usually a loop reacting to events; an <code>enum</code> for states makes transitions explicit and checked. Layers: <b>PAC</b> (registers generated from the SVD file) → <b>HAL</b> (safe API for one chip) → the <code>embedded-hal</code> 1.0 traits (<code>OutputPin</code>, <code>I2c</code>, <code>SpiBus</code>, <code>DelayNs</code>), which a sensor driver uses to work on any chip. For concurrency: interrupts, RTIC or <code>embassy</code> (async)." },
        code: c`
#[derive(Debug, Clone, Copy, PartialEq)]
enum Stare { Oprit, Pornire { ms: u32 }, Activ, Eroare(u8) }

#[derive(Clone, Copy)]
enum Ev { Buton, Tick(u32), Defect(u8) }

fn pas(s: Stare, e: Ev) -> Stare {
    match (s, e) {
        (Stare::Oprit, Ev::Buton) => Stare::Pornire { ms: 0 },
        (Stare::Pornire { ms }, Ev::Tick(dt)) if ms + dt >= 100 => Stare::Activ,
        (Stare::Pornire { ms }, Ev::Tick(dt)) => Stare::Pornire { ms: ms + dt },
        (Stare::Activ, Ev::Buton) => Stare::Oprit,
        (_, Ev::Defect(cod)) => Stare::Eroare(cod),
        (s, _) => s,
    }
}

fn main() {
    let mut s = Stare::Oprit;
    for e in [Ev::Tick(10), Ev::Buton, Ev::Tick(60), Ev::Tick(60), Ev::Buton] {
        s = pas(s, e);
        println!("{s:?}");
    }
}` }
    ],
    exercises: [
      { title: { ro: "Debounce pentru buton", en: "Button debounce" },
        task: { ro: "Un buton mecanic „sare” câteva milisecunde. Implementează <code>Debounce::actualizeaza(&amp;mut self, brut: bool) -&gt; Option&lt;bool&gt;</code>, apelat la fiecare 1 ms: întoarce <code>Some(nou)</code> doar când valoarea brută a rămas aceeași <b>3 citiri la rând</b> și diferă de starea stabilă. Rezultat: <code>[(5, true), (12, false)]</code>.", en: "A mechanical button “bounces” for a few milliseconds. Implement <code>Debounce::actualizeaza(&amp;mut self, raw: bool) -&gt; Option&lt;bool&gt;</code>, called every 1 ms: return <code>Some(new)</code> only when the raw value stayed the same for <b>3 reads in a row</b> and differs from the stable state. Output: <code>[(5, true), (12, false)]</code>." },
        hint: { ro: "Ține <code>stabil</code>, <code>ultim</code> și un contor. Dacă <code>brut == ultim</code> crește contorul, altfel îl resetezi la 1. La contor == 3 și <code>brut != stabil</code> schimbi starea.", en: "Keep <code>stabil</code>, <code>ultim</code> and a counter. If <code>raw == ultim</code> increment the counter, else reset it to 1. When counter == 3 and <code>raw != stabil</code>, change state." },
        starter: c`
struct Debounce { stabil: bool, ultim: bool, n: u8 }

impl Debounce {
    const fn nou() -> Self { Self { stabil: false, ultim: false, n: 0 } }
    fn actualizeaza(&mut self, brut: bool) -> Option<bool> {
        let _ = brut;
        None // TODO
    }
}

fn main() {
    let semnal = [0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    let mut d = Debounce::nou();
    let mut schimbari = Vec::new();
    for (t, &b) in semnal.iter().enumerate() {
        if let Some(v) = d.actualizeaza(b == 1) {
            schimbari.push((t, v));
        }
    }
    println!("{:?}", schimbari);
}`,
        solution: c`
struct Debounce { stabil: bool, ultim: bool, n: u8 }

impl Debounce {
    const fn nou() -> Self { Self { stabil: false, ultim: false, n: 0 } }
    fn actualizeaza(&mut self, brut: bool) -> Option<bool> {
        if brut == self.ultim {
            self.n = self.n.saturating_add(1);
        } else {
            self.ultim = brut;
            self.n = 1;
        }
        if self.n >= 3 && brut != self.stabil {
            self.stabil = brut;
            return Some(brut);
        }
        None
    }
}

fn main() {
    let semnal = [0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    let mut d = Debounce::nou();
    let mut schimbari = Vec::new();
    for (t, &b) in semnal.iter().enumerate() {
        if let Some(v) = d.actualizeaza(b == 1) {
            schimbari.push((t, v));
        }
    }
    println!("{:?}", schimbari);
}`,
        expect: "[(5, true), (12, false)]" }
    ]
  });
  QB("l24", [
    ["Ce face `#![no_std]`? || What does `#![no_std]` do?", ["Renunță la biblioteca `std` și folosește doar `core` (și opțional `alloc`) || Drops the `std` library and uses only `core` (and optionally `alloc`)", "Dezactivează compilatorul || Disables the compiler", "Interzice `unsafe` || Forbids `unsafe`", "Face programul mai lent || Makes the program slower"], "Necesar pe sisteme fără sistem de operare. || Needed on systems without an operating system."],
    ["Care dintre acestea NU e disponibil în `core`? || Which of these is NOT available in `core`?", ["`Vec` și `String` (sunt în `alloc`) || `Vec` and `String` (they're in `alloc`)", "`Option`", "Iteratorii || Iterators", "Slice-urile || Slices"], "`alloc` cere un alocator global, pe care îl alegi tu. || `alloc` needs a global allocator, which you choose."],
    ["Ce trebuie să definească orice program `no_std` executabil? || What must every executable `no_std` program define?", ["Un handler de panic (`#[panic_handler]`), de ex. prin crate-ul `panic-halt` || A panic handler (`#[panic_handler]`), e.g. via the `panic-halt` crate", "O funcție `main` care întoarce `i32` || A `main` returning `i32`", "Un fișier de log || A log file", "Un fir de execuție || A thread"], "Fără sistem de operare, nimeni altcineva nu decide ce se întâmplă la panic. || With no OS, nobody else decides what happens on panic."],
    ["Ce înseamnă tipul de return `-> !` la `fn main() -> !`? || What does the `-> !` return type of `fn main() -> !` mean?", ["Funcția nu se întoarce niciodată (buclă infinită) || The function never returns (infinite loop)", "Întoarce o eroare || Returns an error", "Întoarce `bool` || Returns `bool`", "E o greșeală de sintaxă || It's a syntax error"], "Pe un microcontroler, firmware-ul nu are unde să „iasă”. || On a microcontroller the firmware has nowhere to “exit” to."],
    ["Ce țintă folosești pentru un Cortex-M4F? || Which target do you use for a Cortex-M4F?", ["`thumbv7em-none-eabihf`", "`x86_64-unknown-linux-gnu`", "`wasm32-unknown-unknown`", "`aarch64-apple-darwin`"], "„none” = fără sistem de operare; „hf” = unitate hardware de virgulă mobilă. || “none” = no OS; “hf” = hardware floating point."],
    ["De ce se folosește `write_volatile` pentru regiștrii perifericelor? || Why use `write_volatile` for peripheral registers?", ["Ca optimizatorul să nu elimine sau să reordoneze scrierile, care au efecte în hardware || So the optimizer doesn't drop or reorder writes that have hardware effects", "E mai rapid || It's faster", "Pentru criptare || For encryption", "E cerut de `std` || `std` requires it"], "O scriere normală „inutilă” poate fi eliminată de compilator. || A plain “useless” write may be removed by the compiler."],
    ["Ce afișează? || What does it print?", ["0b00100000", "0b00100001", "0b00101000", "0b00000001"], "Se setează pinii 5 și 0, pinul 0 e comutat înapoi la 0, iar pinul 3 era deja 0. || Pins 5 and 0 are set, pin 0 is toggled back to 0, and pin 3 was already 0.", { k: "out", c: c`
use core::ptr;
struct Gpio { odr: *mut u32 }
impl Gpio {
    fn seteaza(&self, pin: u32) { unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) | (1 << pin)) } }
    fn sterge(&self, pin: u32) { unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) & !(1 << pin)) } }
    fn comuta(&self, pin: u32) { unsafe { ptr::write_volatile(self.odr, ptr::read_volatile(self.odr) ^ (1 << pin)) } }
}
fn main() {
    let mut registru: u32 = 0;
    let led = Gpio { odr: &mut registru };
    led.seteaza(5);
    led.seteaza(0);
    led.comuta(0);
    led.sterge(3);
    println!("{:#010b}", unsafe { ptr::read_volatile(led.odr) });
}` }],
    ["Ce afișează? || What does it print?", ["0b1010 true false", "0b1011 true true", "0b0010 false false", "0b1000 true false"], "`|` setează bitul 3, `& !` șterge bitul 0, iar `&` testează biți. || `|` sets bit 3, `& !` clears bit 0, and `&` tests bits.", { k: "out", c: c`
fn main() {
    let mut r: u8 = 0b0011;
    r |= 1 << 3;
    r &= !(1 << 0);
    println!("{:#b} {} {}", r, r & (1 << 1) != 0, r & (1 << 0) != 0);
}` }],
    ["Ce afișează? || What does it print?", ["5", "2", "0b101", "0x5"], "`(r >> 4) & 0b111` extrage biții 4–6 (un câmp de 3 biți). || `(r >> 4) & 0b111` extracts bits 4–6 (a 3-bit field).", { k: "out", c: c`
fn main() {
    let r: u32 = 0b0101_0000;
    println!("{}", (r >> 4) & 0b111);
}` }],
    ["Ce afișează? || What does it print?", ["None\nSome(228) 24", "None\nSome(225) 24", "Some(0)\nSome(228) 24", "None\nSome(228) 16"], "După 5 valori, inelul de 4 păstrează 250, 215, 220, 230 → medie 228 (împărțire întreagă). Dimensiunea: 4×2 + 8 + 1, rotunjit la aliniere 8 = 24 pe 64 de biți. || After 5 values the 4-slot ring holds 250, 215, 220, 230 → mean 228 (integer division). Size: 4×2 + 8 + 1, rounded to 8-byte alignment = 24 on 64-bit.", { k: "out", c: c`
struct Inel<const N: usize> { date: [u16; N], poz: usize, plin: bool }
impl<const N: usize> Inel<N> {
    const fn nou() -> Self { Self { date: [0; N], poz: 0, plin: false } }
    fn adauga(&mut self, v: u16) {
        self.date[self.poz] = v;
        self.poz = (self.poz + 1) % N;
        if self.poz == 0 { self.plin = true; }
    }
    fn medie(&self) -> Option<u16> {
        let n = if self.plin { N } else { self.poz };
        if n == 0 { return None; }
        let suma: u32 = self.date[..n].iter().map(|&x| x as u32).sum();
        Some((suma / n as u32) as u16)
    }
}
fn main() {
    let mut temp: Inel<4> = Inel::nou();
    println!("{:?}", temp.medie());
    for v in [210, 215, 220, 230, 250] { temp.adauga(v); }
    println!("{:?} {}", temp.medie(), core::mem::size_of::<Inel<4>>());
}` }],
    ["Ce sunt genericele `const N: usize`? || What are `const N: usize` generics?", ["Parametri generici care sunt valori constante (de ex. dimensiunea unui tablou), cunoscute la compilare || Generic parameters that are constant values (e.g. an array size), known at compile time", "Variabile globale || Global variables", "Constante citite din fișier || Constants read from a file", "Un tip de pointer || A pointer type"], "Permit structuri cu dimensiune fixă fără heap. || They allow fixed-size structures without a heap."],
    ["Ce oferă crate-ul `heapless`? || What does the `heapless` crate provide?", ["Colecții cu capacitate fixă (`Vec`, `String`, cozi) fără alocator || Fixed-capacity collections (`Vec`, `String`, queues) without an allocator", "Un sistem de operare || An operating system", "Un debugger || A debugger", "Drivere de senzori || Sensor drivers"], "Capacitatea e un parametru `const`; depășirea întoarce eroare, nu realocă. || Capacity is a `const` parameter; overflowing returns an error rather than reallocating."],
    ["Ce afișează? || What does it print?", ["Oprit\nPornire { ms: 0 }\nPornire { ms: 60 }\nActiv\nOprit", "Oprit\nPornire { ms: 0 }\nActiv\nActiv\nOprit", "Pornire { ms: 0 }\nPornire { ms: 60 }\nActiv\nOprit\nOprit", "Oprit\nPornire { ms: 10 }\nPornire { ms: 70 }\nActiv\nOprit"], "Tick-ul din starea `Oprit` e ignorat; 60 + 60 ≥ 100 trece în `Activ`. || The tick in `Oprit` is ignored; 60 + 60 ≥ 100 moves to `Activ`.", { k: "out", c: c`
#[derive(Debug, Clone, Copy, PartialEq)]
enum Stare { Oprit, Pornire { ms: u32 }, Activ, Eroare(u8) }
#[derive(Clone, Copy)]
enum Ev { Buton, Tick(u32), Defect(u8) }
fn pas(s: Stare, e: Ev) -> Stare {
    match (s, e) {
        (Stare::Oprit, Ev::Buton) => Stare::Pornire { ms: 0 },
        (Stare::Pornire { ms }, Ev::Tick(dt)) if ms + dt >= 100 => Stare::Activ,
        (Stare::Pornire { ms }, Ev::Tick(dt)) => Stare::Pornire { ms: ms + dt },
        (Stare::Activ, Ev::Buton) => Stare::Oprit,
        (_, Ev::Defect(cod)) => Stare::Eroare(cod),
        (s, _) => s,
    }
}
fn main() {
    let mut s = Stare::Oprit;
    for e in [Ev::Tick(10), Ev::Buton, Ev::Tick(60), Ev::Tick(60), Ev::Buton] {
        s = pas(s, e);
        println!("{s:?}");
    }
}` }],
    ["Ce afișează? || What does it print?", ["Eroare(7)", "Activ", "Oprit", "Pornire { ms: 0 }"], "Ramura `(_, Ev::Defect(cod))` prinde defectul din orice stare. || The `(_, Ev::Defect(cod))` arm catches a fault from any state.", { k: "out", c: c`
#[derive(Debug, Clone, Copy)]
enum Stare { Oprit, Activ, Eroare(u8) }
#[derive(Clone, Copy)]
enum Ev { Buton, Defect(u8) }
fn pas(s: Stare, e: Ev) -> Stare {
    match (s, e) {
        (Stare::Oprit, Ev::Buton) => Stare::Activ,
        (Stare::Activ, Ev::Buton) => Stare::Oprit,
        (_, Ev::Defect(cod)) => Stare::Eroare(cod),
        (s, _) => s,
    }
}
fn main() {
    println!("{:?}", pas(pas(Stare::Oprit, Ev::Buton), Ev::Defect(7)));
}` }],
    ["Ce eroare dă un `match` pe o stare care uită o variantă? || Which error does a `match` on a state that misses a variant give?", ["E0004", "E0023", "E0026", "E0005"], "E0004: tipare neacoperite. Compilatorul te obligă să tratezi fiecare stare. || E0004: non-exhaustive patterns. The compiler forces you to handle every state.", { k: "err", err: "E0004", c: c`
enum Stare { Oprit, Activ, Eroare }
fn led(s: Stare) -> bool {
    match s {
        Stare::Oprit => false,
        Stare::Activ => true,
    }
}
fn main() {}` }],
    ["Ce este un PAC? || What is a PAC?", ["Peripheral Access Crate: API generat automat din fișierul SVD al cipului, pentru regiștri || Peripheral Access Crate: an API generated from the chip's SVD file, for registers", "Un manager de pachete || A package manager", "Un tip de memorie || A memory type", "Un protocol de rețea || A network protocol"], "Peste PAC stă HAL-ul, cu un API mai comod și mai sigur. || The HAL sits on top of the PAC with a friendlier, safer API."],
    ["La ce servesc trait-urile `embedded-hal`? || What are the `embedded-hal` traits for?", ["Un driver (de ex. pentru un senzor I2C) scris pe trait-uri merge pe orice cip al cărui HAL le implementează || A driver (e.g. for an I2C sensor) written against the traits works on any chip whose HAL implements them", "Pornesc cipul || They boot the chip", "Înlocuiesc `core` || They replace `core`", "Doar pentru Arduino || Only for Arduino"], "`embedded-hal` 1.0 a fost lansat în ianuarie 2024. || `embedded-hal` 1.0 was released in January 2024."],
    ["Ce este `embassy`? || What is `embassy`?", ["Un framework async pentru embedded: task-uri `async` fără sistem de operare || An async embedded framework: `async` tasks without an OS", "Un simulator de cipuri || A chip simulator", "Un IDE || An IDE", "Un compilator C || A C compiler"], "Alternative: RTIC (concurență bazată pe întreruperi) sau o buclă simplă. || Alternatives: RTIC (interrupt-driven concurrency) or a plain loop."],
    ["Cu ce unealtă încarci și rulezi firmware-ul pe placă prin debugger (SWD/JTAG)? || Which tool flashes and runs firmware on a board via a debug probe (SWD/JTAG)?", ["`probe-rs`", "`cargo publish`", "`rustup`", "`wasm-pack`"], "`probe-rs run` scrie firmware-ul și afișează log-urile (de ex. prin `defmt`). || `probe-rs run` flashes the firmware and shows logs (e.g. via `defmt`)."],
    ["Ce afișează? || What does it print?", ["Some(250) None", "Some(250) Some(0)", "Some(250) Some(244)", "panic"], "`checked_add` întoarce `None` la overflow, în loc de panic (debug) sau wrap (release). || `checked_add` returns `None` on overflow instead of panicking (debug) or wrapping (release).", { k: "out", c: c`
fn main() {
    let x: u8 = 200;
    println!("{:?} {:?}", x.checked_add(50), x.checked_add(100));
}` }],
    ["Ce afișează? || What does it print?", ["255 44", "44 255", "255 255", "300 300"], "`saturating_add` se oprește la maxim; `wrapping_add` trece peste: 300 − 256 = 44. || `saturating_add` stops at the max; `wrapping_add` wraps around: 300 − 256 = 44.", { k: "out", c: c`
fn main() {
    let x: u8 = 200;
    println!("{} {}", x.saturating_add(100), x.wrapping_add(100));
}` }],
    ["Ce afișează? || What does it print?", ["[(5, true), (12, false)]", "[(1, true), (8, false)]", "[(3, true), (10, false)]", "[]"], "Valoarea 1 devine stabilă după 3 citiri consecutive (indicii 3, 4, 5), iar 0 după indicii 10, 11, 12. || 1 becomes stable after 3 consecutive reads (indices 3, 4, 5), and 0 after indices 10, 11, 12.", { k: "out", c: c`
struct Debounce { stabil: bool, ultim: bool, n: u8 }
impl Debounce {
    fn actualizeaza(&mut self, brut: bool) -> Option<bool> {
        if brut == self.ultim { self.n = self.n.saturating_add(1); } else { self.ultim = brut; self.n = 1; }
        if self.n >= 3 && brut != self.stabil { self.stabil = brut; return Some(brut); }
        None
    }
}
fn main() {
    let semnal = [0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    let mut d = Debounce { stabil: false, ultim: false, n: 0 };
    let mut s = Vec::new();
    for (t, &b) in semnal.iter().enumerate() {
        if let Some(v) = d.actualizeaza(b == 1) { s.push((t, v)); }
    }
    println!("{:?}", s);
}` }]
  ]);
})();

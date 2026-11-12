(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 21, icon: "⚠️", level: 4,
    title: { ro: "Unsafe Rust: bazele", en: "Unsafe Rust: the basics" },
    summary: {
      ro: "Ce permite <code>unsafe</code> (și ce nu): pointeri bruti, funcții <code>unsafe</code>, <code>static mut</code>, trait-uri <code>unsafe</code>. Cum construiești o abstracție sigură peste cod nesigur și cum o verifici cu Miri.",
      en: "What <code>unsafe</code> allows (and what it doesn't): raw pointers, <code>unsafe</code> functions, <code>static mut</code>, <code>unsafe</code> traits. How to build a safe abstraction over unsafe code and check it with Miri."
    },
    sections: [
      { h: { ro: "Ce deblochează unsafe", en: "What unsafe unlocks" },
        p: { ro: "Un bloc <code>unsafe</code> nu dezactivează borrow checker-ul și nici verificările de tip. Permite doar câteva operații în plus: dereferențierea pointerilor bruti, apelul funcțiilor <code>unsafe</code> (inclusiv FFI), accesul la <code>static mut</code>, implementarea trait-urilor <code>unsafe</code> și accesul la câmpurile unui <code>union</code>. Tu garantezi corectitudinea acolo.",
             en: "An <code>unsafe</code> block doesn't turn off the borrow checker or type checks. It only allows a few extra operations: dereferencing raw pointers, calling <code>unsafe</code> functions (including FFI), accessing <code>static mut</code>, implementing <code>unsafe</code> traits and reading <code>union</code> fields. There, you guarantee correctness." },
        code: c`
fn main() {
    let mut x = 10;
    let q = &mut x as *mut i32;   // crearea unui pointer brut e sigură
    let p = q as *const i32;      // derivat din q, ca să nu încalce regulile de aliasing
    unsafe {
        *q += 5;                  // dereferențierea cere unsafe
        println!("{}", *p);
    }
    let adresa = 0x1234usize as *const i32; // valid să-l creezi, NU să-l citești
    println!("{}", adresa.is_null());
}` },
      { h: { ro: "Funcții unsafe și contracte", en: "Unsafe functions and contracts" },
        p: { ro: "O funcție <code>unsafe fn</code> are precondiții pe care compilatorul nu le poate verifica; le documentezi într-o secțiune <code># Safety</code>. Cine o apelează scrie un comentariu <code>// SAFETY:</code> care explică de ce precondițiile sunt îndeplinite. Exemplu din std: <code>get_unchecked</code> sare peste verificarea de index.",
             en: "An <code>unsafe fn</code> has preconditions the compiler can't check; you document them in a <code># Safety</code> section. The caller writes a <code>// SAFETY:</code> comment explaining why they hold. Example from std: <code>get_unchecked</code> skips the bounds check." },
        code: c`
/// Întoarce primul octet.
///
/// # Safety
/// \`buf\` nu trebuie să fie gol.
unsafe fn primul(buf: &[u8]) -> u8 {
    unsafe { *buf.get_unchecked(0) }
}

fn primul_sigur(buf: &[u8]) -> Option<u8> {
    if buf.is_empty() {
        None
    } else {
        // SAFETY: tocmai am verificat că buf nu e gol
        Some(unsafe { primul(buf) })
    }
}

fn main() {
    println!("{:?} {:?}", primul_sigur(&[0x45, 0x00]), primul_sigur(&[]));
}` },
      { h: { ro: "Abstracție sigură: split_at_mut", en: "Safe abstraction: split_at_mut" },
        p: { ro: "Borrow checker-ul nu știe că două jumătăți ale aceluiași slice nu se suprapun, deci două <code>&amp;mut</code> la același vector sunt refuzate (E0499). Biblioteca standard rezolvă asta cu <code>unsafe</code> intern și o interfață sigură. Așa scrii și tu: codul <code>unsafe</code> e mic, verificat, ascuns în spatele unui API sigur.",
             en: "The borrow checker doesn't know two halves of the same slice don't overlap, so two <code>&amp;mut</code> to one vector are rejected (E0499). The standard library solves this with internal <code>unsafe</code> and a safe interface. That's how you should write it too: small, checked <code>unsafe</code>, hidden behind a safe API." },
        code: c`
use std::slice;

fn imparte(v: &mut [u32], mijloc: usize) -> (&mut [u32], &mut [u32]) {
    let len = v.len();
    assert!(mijloc <= len);
    let p = v.as_mut_ptr();
    // SAFETY: [0, mijloc) și [mijloc, len) nu se suprapun și sunt în interiorul lui v
    unsafe {
        (slice::from_raw_parts_mut(p, mijloc), slice::from_raw_parts_mut(p.add(mijloc), len - mijloc))
    }
}

fn main() {
    let mut porturi = [22, 80, 443, 8080];
    let (a, b) = imparte(&mut porturi, 2);
    a[0] = 2222;
    b[1] = 8443;
    println!("{:?}", porturi);
}` },
      { h: { ro: "static mut, Send/Sync și Miri", en: "static mut, Send/Sync and Miri" },
        p: { ro: "Orice acces la <code>static mut</code> cere <code>unsafe</code> pentru că poate produce curse de date; de obicei folosești în schimb atomice sau <code>Mutex</code>. <code>unsafe impl Send</code> promite că tipul poate fi mutat între fire. Comportamentul nedefinit (UB) poate „merge” la teste — rulează <code>cargo +nightly miri test</code> ca să-l detectezi.",
             en: "Any access to a <code>static mut</code> needs <code>unsafe</code> because it can cause data races; usually you use atomics or a <code>Mutex</code> instead. <code>unsafe impl Send</code> promises the type may move between threads. Undefined behaviour (UB) can “work” in tests — run <code>cargo +nightly miri test</code> to catch it." },
        code: c`
use std::sync::atomic::{AtomicU64, Ordering};

static PACHETE: AtomicU64 = AtomicU64::new(0); // fără unsafe

fn primit() {
    PACHETE.fetch_add(1, Ordering::Relaxed);
}

fn main() {
    let fire: Vec<_> = (0..4)
        .map(|_| std::thread::spawn(|| for _ in 0..1000 { primit() }))
        .collect();
    for f in fire {
        f.join().unwrap();
    }
    println!("{}", PACHETE.load(Ordering::Relaxed));
}` }
    ],
    exercises: [
      { title: { ro: "Citire big-endian", en: "Big-endian read" },
        task: { ro: "Implementează sigur <code>citeste_u16(buf: &amp;[u8], poz: usize) -&gt; Option&lt;u16&gt;</code> (big-endian, ca în antetele de rețea). Versiunea ta poate folosi <code>unsafe</code> cu <code>get_unchecked</code> doar după verificarea limitelor — sau deloc. Rezultat: <code>Some(443) None</code>.", en: "Safely implement <code>citeste_u16(buf: &amp;[u8], pos: usize) -&gt; Option&lt;u16&gt;</code> (big-endian, like network headers). You may use <code>unsafe</code> with <code>get_unchecked</code> only after the bounds check — or not at all. Output: <code>Some(443) None</code>." },
        hint: { ro: "Verifică <code>poz + 2 &lt;= buf.len()</code> (atenție la overflow: <code>poz.checked_add(2)</code>), apoi <code>u16::from_be_bytes([a, b])</code>.", en: "Check <code>pos + 2 &lt;= buf.len()</code> (beware overflow: <code>pos.checked_add(2)</code>), then <code>u16::from_be_bytes([a, b])</code>." },
        starter: c`
fn citeste_u16(buf: &[u8], poz: usize) -> Option<u16> {
    let _ = (buf, poz);
    None // TODO
}

fn main() {
    let antet = [0x00, 0x16, 0x01, 0xBB];
    println!("{:?} {:?}", citeste_u16(&antet, 2), citeste_u16(&antet, 3));
}`,
        solution: c`
fn citeste_u16(buf: &[u8], poz: usize) -> Option<u16> {
    let sfarsit = poz.checked_add(2)?;
    if sfarsit > buf.len() {
        return None;
    }
    // SAFETY: am verificat că poz și poz + 1 sunt < buf.len()
    let (a, b) = unsafe { (*buf.get_unchecked(poz), *buf.get_unchecked(poz + 1)) };
    Some(u16::from_be_bytes([a, b]))
}

fn main() {
    let antet = [0x00, 0x16, 0x01, 0xBB];
    println!("{:?} {:?}", citeste_u16(&antet, 2), citeste_u16(&antet, 3));
}`,
        expect: "Some(443) None" }
    ]
  });
  QB("l21", [
    ["Dezactivează `unsafe` borrow checker-ul? || Does `unsafe` turn off the borrow checker?", ["Nu; permite doar câteva operații în plus || No; it only allows a few extra operations", "Da, complet || Yes, completely", "Doar pentru referințe `&mut` || Only for `&mut` references", "Da, dar doar în modul release || Yes, but only in release mode"], "Referințele obișnuite sunt verificate și în blocurile `unsafe`. || Ordinary references are still checked inside `unsafe` blocks."],
    ["Ce eroare dă dereferențierea unui pointer brut în afara `unsafe`? || Which error does dereferencing a raw pointer outside `unsafe` give?", ["E0133", "E0499", "E0502", "E0384"], "E0133: operația cere o funcție sau un bloc `unsafe`. || E0133: the operation requires an unsafe function or block.", { k: "err", err: "E0133", c: c`
fn main() {
    let x = 5;
    let p = &x as *const i32;
    println!("{}", *p);
}` }],
    ["Este sigur să creezi un pointer brut dintr-o adresă arbitrară? || Is creating a raw pointer from an arbitrary address safe?", ["Da; doar dereferențierea cere `unsafe` || Yes; only dereferencing needs `unsafe`", "Nu, cere `unsafe` || No, it needs `unsafe`", "Nu compilează deloc || It never compiles", "Doar pe 32 de biți || Only on 32-bit"], "Un pointer brut e doar o adresă; pericolul apare la citire/scriere. || A raw pointer is just an address; the danger is in reading/writing."],
    ["Ce afișează? || What does it print?", ["15\nfalse", "10\nfalse", "15\ntrue", "10\ntrue"], "`*q += 5` modifică `x` prin pointerul mutabil; adresa 0x1234 nu e nulă. || `*q += 5` changes `x` through the mutable pointer; address 0x1234 isn't null.", { k: "out", c: c`
fn main() {
    let mut x = 10;
    let q = &mut x as *mut i32;
    let p = q as *const i32;
    unsafe {
        *q += 5;
        println!("{}", *p);
    }
    let adresa = 0x1234usize as *const i32;
    println!("{}", adresa.is_null());
}` }],
    ["Ce eroare dă apelul unei `unsafe fn` din cod sigur? || Which error does calling an `unsafe fn` from safe code give?", ["E0133", "E0425", "E0599", "E0618"], "Apelul trebuie pus într-un bloc `unsafe { ... }`. || The call must be inside an `unsafe { ... }` block.", { k: "err", err: "E0133", c: c`
unsafe fn periculos() -> u8 { 1 }
fn main() {
    let x = periculos();
    println!("{x}");
}` }],
    ["Ce conține, prin convenție, secțiunea `# Safety` din documentația unei `unsafe fn`? || What does a `# Safety` doc section of an `unsafe fn` contain by convention?", ["Precondițiile pe care apelantul trebuie să le garanteze || The preconditions the caller must guarantee", "Licența || The licence", "Exemple de teste || Test examples", "Autorul || The author"], "Apelantul justifică apoi apelul cu un comentariu `// SAFETY:`. || The caller then justifies the call with a `// SAFETY:` comment."],
    ["Ce afișează? || What does it print?", ["Some(69) None", "Some(0) None", "Some(69) Some(0)", "panic"], "0x45 = 69; slice-ul gol întoarce `None` înainte de apelul `unsafe`. || 0x45 = 69; the empty slice returns `None` before the `unsafe` call.", { k: "out", c: c`
unsafe fn primul(buf: &[u8]) -> u8 {
    unsafe { *buf.get_unchecked(0) }
}
fn primul_sigur(buf: &[u8]) -> Option<u8> {
    if buf.is_empty() { None } else { Some(unsafe { primul(buf) }) }
}
fn main() {
    println!("{:?} {:?}", primul_sigur(&[0x45, 0x00]), primul_sigur(&[]));
}` }],
    ["Ce se întâmplă dacă apelezi `get_unchecked(10)` pe un slice de 2 elemente? || What happens if you call `get_unchecked(10)` on a 2-element slice?", ["Comportament nedefinit (UB) — orice se poate întâmpla || Undefined behaviour (UB) — anything can happen", "Panic garantat || A guaranteed panic", "Întoarce `None` || Returns `None`", "Eroare de compilare || A compile error"], "De aceea funcția e `unsafe`: nu verifică indexul. || That's why the function is `unsafe`: it doesn't check the index."],
    ["Ce afișează? || What does it print?", ["[2222, 80, 443, 8443]", "[22, 80, 443, 8080]", "[2222, 80, 8443, 8080]", "nu compilează || doesn't compile"], "`b` începe la indexul 2, deci `b[1]` e elementul 3. || `b` starts at index 2, so `b[1]` is element 3.", { k: "out", c: c`
use std::slice;
fn imparte(v: &mut [u32], mijloc: usize) -> (&mut [u32], &mut [u32]) {
    let len = v.len();
    assert!(mijloc <= len);
    let p = v.as_mut_ptr();
    unsafe { (slice::from_raw_parts_mut(p, mijloc), slice::from_raw_parts_mut(p.add(mijloc), len - mijloc)) }
}
fn main() {
    let mut porturi = [22, 80, 443, 8080];
    let (a, b) = imparte(&mut porturi, 2);
    a[0] = 2222;
    b[1] = 8443;
    println!("{:?}", porturi);
}` }],
    ["Ce eroare dă împărțirea unui slice în două `&mut` fără `split_at_mut`? || Which error does splitting a slice into two `&mut` without `split_at_mut` give?", ["E0499", "E0502", "E0133", "E0506"], "E0499: nu poți împrumuta mutabil de două ori aceeași valoare. || E0499: can't borrow the same value mutably twice.", { k: "err", err: "E0499", c: c`
fn main() {
    let mut v = [1, 2, 3, 4];
    let a = &mut v[..2];
    let b = &mut v[2..];
    a[0] = b[0];
}` }],
    ["Ce afișează? || What does it print?", ["[9, 2] [3, 4]", "[1, 2] [3, 4]", "[9, 2, 3, 4]", "nu compilează || doesn't compile"], "`split_at_mut` din std face exact asta, cu `unsafe` intern. || std's `split_at_mut` does exactly this, with internal `unsafe`.", { k: "out", c: c`
fn main() {
    let mut v = [1, 2, 3, 4];
    let (a, b) = v.split_at_mut(2);
    a[0] = 9;
    println!("{:?} {:?}", a, b);
}` }],
    ["Ce eroare dă citirea unui `static mut` fără `unsafe`? || Which error does reading a `static mut` without `unsafe` give?", ["E0133", "E0015", "E0384", "E0594"], "Orice acces la `static mut` poate produce o cursă de date, deci cere `unsafe`. || Any access to a `static mut` may race, so it needs `unsafe`.", { k: "err", err: "E0133", c: c`
static mut CONTOR: u32 = 0;
fn main() {
    let x = CONTOR;
    println!("{x}");
}` }],
    ["Ce afișează? || What does it print?", ["4000", "1000", "0", "un număr aleator mai mic de 4000 || a random number below 4000"], "`fetch_add` e atomic, deci nu se pierde nicio incrementare. || `fetch_add` is atomic, so no increment is lost.", { k: "out", c: c`
use std::sync::atomic::{AtomicU64, Ordering};
static PACHETE: AtomicU64 = AtomicU64::new(0);
fn main() {
    let fire: Vec<_> = (0..4)
        .map(|_| std::thread::spawn(|| for _ in 0..1000 { PACHETE.fetch_add(1, Ordering::Relaxed); }))
        .collect();
    for f in fire { f.join().unwrap(); }
    println!("{}", PACHETE.load(Ordering::Relaxed));
}` }],
    ["Ce promiți cu `unsafe impl Send for T {}`? || What do you promise with `unsafe impl Send for T {}`?", ["Că e sigur să muți un `T` pe alt fir || That it's safe to move a `T` to another thread", "Că `T` e `Copy` || That `T` is `Copy`", "Că `T` nu are pointeri || That `T` has no pointers", "Nimic, e doar un comentariu || Nothing, it's just a comment"], "Compilatorul nu poate verifica promisiunea; o greșeală duce la curse de date. || The compiler can't verify it; a mistake leads to data races."],
    ["Ce este Miri? || What is Miri?", ["Un interpretor care rulează testele și detectează multe tipuri de comportament nedefinit || An interpreter that runs tests and detects many kinds of undefined behaviour", "Un linter de stil || A style linter", "Un debugger grafic || A graphical debugger", "Un crate pentru rețea || A networking crate"], "Se rulează cu `cargo +nightly miri test`. || Run it with `cargo +nightly miri test`."],
    ["Ce afișează? || What does it print?", ["Some(443) None", "Some(47873) None", "Some(443) Some(0)", "None None"], "0x01BB = 443 în big-endian; la poziția 3 lipsește al doilea octet. || 0x01BB = 443 big-endian; at position 3 the second byte is missing.", { k: "out", c: c`
fn citeste_u16(buf: &[u8], poz: usize) -> Option<u16> {
    let b = buf.get(poz..poz.checked_add(2)?)?;
    Some(u16::from_be_bytes([b[0], b[1]]))
}
fn main() {
    let antet = [0x00, 0x16, 0x01, 0xBB];
    println!("{:?} {:?}", citeste_u16(&antet, 2), citeste_u16(&antet, 3));
}` }],
    ["Ce afișează? || What does it print?", ["[1, 187] [187, 1]", "[187, 1] [1, 187]", "[1, 187] [1, 187]", "[0, 443] [443, 0]"], "Big-endian pune octetul cel mai semnificativ primul (ordinea de rețea). || Big-endian puts the most significant byte first (network order).", { k: "out", c: c`
fn main() {
    let p: u16 = 443;
    println!("{:?} {:?}", p.to_be_bytes(), p.to_le_bytes());
}` }],
    ["Ce afișează? || What does it print?", ["1078530011", "3", "3.1415927", "nu compilează || doesn't compile"], "`to_bits` dă reprezentarea IEEE 754 a lui `f32`, fără `unsafe` (alternativa sigură la `transmute`). || `to_bits` gives the IEEE 754 bits of an `f32`, without `unsafe` (the safe alternative to `transmute`).", { k: "out", c: c`
fn main() {
    println!("{}", std::f32::consts::PI.to_bits());
}` }],
    ["De ce e preferabil `f.to_bits()` în loc de `std::mem::transmute::<f32, u32>(f)`? || Why prefer `f.to_bits()` over `std::mem::transmute::<f32, u32>(f)`?", ["Face același lucru fără `unsafe` || It does the same without `unsafe`", "E mai rapid de 10 ori || It's 10× faster", "`transmute` nu există || `transmute` doesn't exist", "Pentru că `transmute` e doar în nightly || Because `transmute` is nightly-only"], "Regula: folosește `unsafe` doar când nu există o alternativă sigură. || Rule: use `unsafe` only when no safe alternative exists."],
    ["Câmpurile cărui tip pot fi citite doar în `unsafe`? || Reading the fields of which type requires `unsafe`?", ["`union`", "`enum`", "`struct`", "`tuple`"], "Compilatorul nu știe ce câmp a fost scris ultimul. || The compiler doesn't know which field was written last.", { k: "err", err: "E0133", c: c`
union Valoare { i: u32, f: f32 }
fn main() {
    let v = Valoare { i: 1 };
    println!("{}", v.f);
}` }],
    ["Unde e indicat să cauți întâi o eroare de memorie într-un program Rust? || Where should you look first for a memory bug in a Rust program?", ["În blocurile `unsafe` (și în codul care le stabilește invarianții) || In the `unsafe` blocks (and the code that sets up their invariants)", "În toate funcțiile la fel || Equally in every function", "În `Cargo.toml` || In `Cargo.toml`", "În teste || In the tests"], "Codul sigur nu poate produce UB singur; `unsafe` restrânge zona de căutare. || Safe code can't cause UB by itself; `unsafe` narrows the search area."],
    ["Ce face lint-ul `#![forbid(unsafe_code)]`? || What does the `#![forbid(unsafe_code)]` lint do?", ["Interzice orice `unsafe` în crate-ul respectiv || Forbids any `unsafe` in that crate", "Face tot codul `unsafe` sigur || Makes all unsafe code safe", "Interzice dependențele cu `unsafe` || Forbids dependencies with `unsafe`", "Nimic || Nothing"], "Se aplică doar crate-ului tău, nu și dependențelor. || It applies only to your crate, not to dependencies."]
  ]);
})();

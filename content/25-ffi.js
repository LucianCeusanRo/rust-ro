(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 22, icon: "🔗", level: 4,
    title: { ro: "FFI: Rust și C", en: "FFI: Rust and C" },
    summary: {
      ro: "Apelezi funcții C din Rust (<code>extern \"C\"</code>), convertești șiruri cu <code>CString</code>/<code>CStr</code>, folosești <code>#[repr(C)]</code> pentru structuri compatibile și exporți funcții Rust pentru C cu <code>#[no_mangle]</code>. Exemplele folosesc funcții din biblioteca C standard (libc), disponibile pe Linux și în Playground.",
      en: "Call C functions from Rust (<code>extern \"C\"</code>), convert strings with <code>CString</code>/<code>CStr</code>, use <code>#[repr(C)]</code> for compatible structs and export Rust functions to C with <code>#[no_mangle]</code>. The examples use functions from the C standard library (libc), available on Linux and in the Playground."
    },
    sections: [
      { h: { ro: "Apelul unei funcții C", en: "Calling a C function" },
        p: { ro: "Declari semnătura într-un bloc <code>extern \"C\"</code>; linker-ul găsește simbolul în libc. Apelul e <code>unsafe</code>: compilatorul nu poate verifica dacă declarația ta corespunde funcției reale. Folosește tipurile din <code>std::ffi</code> (<code>c_int</code>, <code>c_char</code>, ...), nu presupune dimensiuni. În ediția 2024 blocul se scrie <code>unsafe extern \"C\"</code>.",
             en: "You declare the signature in an <code>extern \"C\"</code> block; the linker finds the symbol in libc. The call is <code>unsafe</code>: the compiler can't check that your declaration matches the real function. Use the types from <code>std::ffi</code> (<code>c_int</code>, <code>c_char</code>, ...), don't assume sizes. In the 2024 edition the block is written <code>unsafe extern \"C\"</code>." },
        code: c`
use std::ffi::c_int;

extern "C" {
    fn abs(x: c_int) -> c_int;
    fn atoi(s: *const std::ffi::c_char) -> c_int;
}

fn main() {
    let a = unsafe { abs(-42) };
    let n = unsafe { atoi(c"8080".as_ptr()) };
    println!("{a} {n}");
}` },
      { h: { ro: "Șiruri: CString și CStr", en: "Strings: CString and CStr" },
        p: { ro: "Șirurile C se termină cu octetul 0 și nu au lungime; <code>String</code> din Rust are lungime și poate conține 0. <code>CString::new</code> adaugă terminatorul și refuză un 0 în interior. <code>CStr::from_ptr</code> citește un șir primit de la C (unsafe). Literalul <code>c\"text\"</code> (Rust 1.77+) creează direct un <code>&amp;CStr</code>.",
             en: "C strings are 0-terminated with no length; a Rust <code>String</code> has a length and may contain 0. <code>CString::new</code> adds the terminator and rejects an interior 0. <code>CStr::from_ptr</code> reads a string coming from C (unsafe). The <code>c\"text\"</code> literal (Rust 1.77+) creates a <code>&amp;CStr</code> directly." },
        code: c`
use std::ffi::{c_char, CStr, CString};

extern "C" {
    fn strlen(s: *const c_char) -> usize;
}

fn main() {
    let gazda = CString::new("router-01").unwrap();
    let n = unsafe { strlen(gazda.as_ptr()) };
    println!("lungime C: {n}");
    println!("cu 0 în interior: {}", CString::new("a\0b").is_err());

    let inapoi: &CStr = unsafe { CStr::from_ptr(gazda.as_ptr()) };
    println!("{:?} {}", inapoi, inapoi.to_str().unwrap());
}` },
      { h: { ro: "#[repr(C)] și callback-uri", en: "#[repr(C)] and callbacks" },
        p: { ro: "Fără <code>#[repr(C)]</code>, Rust poate reordona câmpurile unei structuri; cu el, așezarea în memorie e cea din C. O funcție Rust <code>extern \"C\" fn</code> poate fi dată ca pointer unei funcții C — aici <code>qsort</code> din libc sortează cu comparatorul nostru. Un panic nu are voie să traverseze granița spre C.",
             en: "Without <code>#[repr(C)]</code> Rust may reorder a struct's fields; with it, the memory layout matches C. A Rust <code>extern \"C\" fn</code> can be passed as a pointer to a C function — here libc's <code>qsort</code> sorts with our comparator. A panic must not unwind across the boundary into C." },
        code: c`
use std::ffi::{c_int, c_void};

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct Ruta {
    prefix: u8,
    metric: u32,
}

extern "C" {
    fn qsort(base: *mut c_void, n: usize, size: usize, cmp: extern "C" fn(*const c_void, *const c_void) -> c_int);
}

extern "C" fn dupa_metric(a: *const c_void, b: *const c_void) -> c_int {
    let (a, b) = unsafe { (&*(a as *const Ruta), &*(b as *const Ruta)) };
    a.metric.cmp(&b.metric) as c_int
}

fn main() {
    let mut rute = [Ruta { prefix: 24, metric: 20 }, Ruta { prefix: 16, metric: 5 }, Ruta { prefix: 8, metric: 10 }];
    unsafe {
        qsort(rute.as_mut_ptr() as *mut c_void, rute.len(), std::mem::size_of::<Ruta>(), dupa_metric);
    }
    println!("{:?}", rute.iter().map(|r| r.metric).collect::<Vec<_>>());
    println!("dimensiune: {}", std::mem::size_of::<Ruta>());
}` },
      { h: { ro: "Rust apelat din C", en: "Rust called from C" },
        p: { ro: "<code>#[no_mangle] pub extern \"C\" fn</code> exportă o funcție cu nume C stabil. Cu <code>crate-type = [\"cdylib\"]</code> (sau <code>staticlib</code>) în <code>Cargo.toml</code> obții o bibliotecă <code>.so</code>/<code>.a</code> pe care o leagă un program C. Unelte: <code>bindgen</code> generează declarații Rust din antete C; <code>cbindgen</code> generează antete C din Rust.",
             en: "<code>#[no_mangle] pub extern \"C\" fn</code> exports a function with a stable C name. With <code>crate-type = [\"cdylib\"]</code> (or <code>staticlib</code>) in <code>Cargo.toml</code> you get a <code>.so</code>/<code>.a</code> library a C program can link. Tools: <code>bindgen</code> generates Rust declarations from C headers; <code>cbindgen</code> generates C headers from Rust." },
        code: c`
use std::ffi::{c_char, CStr};

/// Întoarce 1 dacă șirul e o adresă IPv4 validă, 0 altfel, -1 pentru pointer nul.
#[no_mangle]
pub extern "C" fn ip_valid(s: *const c_char) -> i32 {
    if s.is_null() {
        return -1;
    }
    let s = unsafe { CStr::from_ptr(s) };
    match s.to_str().map(|t| t.parse::<std::net::Ipv4Addr>()) {
        Ok(Ok(_)) => 1,
        _ => 0,
    }
}

fn main() {
    // în C: int ip_valid(const char *s);
    println!("{} {} {}", ip_valid(c"10.0.0.1".as_ptr()), ip_valid(c"10.0.0.256".as_ptr()), ip_valid(std::ptr::null()));
}` }
    ],
    exercises: [
      { title: { ro: "Wrapper sigur peste strlen", en: "Safe wrapper over strlen" },
        task: { ro: "Scrie <code>lungime_c(s: &amp;str) -&gt; Option&lt;usize&gt;</code> care convertește în <code>CString</code> (întoarce <code>None</code> dacă există un 0 în interior) și apelează <code>strlen</code> din libc. Rezultat: <code>Some(5) None</code>.", en: "Write <code>lungime_c(s: &amp;str) -&gt; Option&lt;usize&gt;</code> that converts to a <code>CString</code> (returning <code>None</code> on an interior 0) and calls libc's <code>strlen</code>. Output: <code>Some(5) None</code>." },
        hint: { ro: "<code>let cs = CString::new(s).ok()?;</code> apoi <code>unsafe { strlen(cs.as_ptr()) }</code>.", en: "<code>let cs = CString::new(s).ok()?;</code> then <code>unsafe { strlen(cs.as_ptr()) }</code>." },
        starter: c`
use std::ffi::{c_char, CString};

extern "C" {
    fn strlen(s: *const c_char) -> usize;
}

fn lungime_c(s: &str) -> Option<usize> {
    let _ = s;
    None // TODO
}

fn main() {
    println!("{:?} {:?}", lungime_c("vlan1"), lungime_c("a\0b"));
}`,
        solution: c`
use std::ffi::{c_char, CString};

extern "C" {
    fn strlen(s: *const c_char) -> usize;
}

fn lungime_c(s: &str) -> Option<usize> {
    let cs = CString::new(s).ok()?;
    // SAFETY: cs e un șir C valid, terminat cu 0, care trăiește pe durata apelului
    Some(unsafe { strlen(cs.as_ptr()) })
}

fn main() {
    println!("{:?} {:?}", lungime_c("vlan1"), lungime_c("a\0b"));
}`,
        expect: "Some(5) None" }
    ]
  });
  QB("l22", [
    ["Ce afișează? || What does it print?", ["42 8080", "-42 8080", "42 0", "nu compilează || doesn't compile"], "`abs` și `atoi` vin din libc. || `abs` and `atoi` come from libc.", { k: "out", c: c`
use std::ffi::c_int;
extern "C" {
    fn abs(x: c_int) -> c_int;
    fn atoi(s: *const std::ffi::c_char) -> c_int;
}
fn main() {
    let a = unsafe { abs(-42) };
    let n = unsafe { atoi(c"8080".as_ptr()) };
    println!("{a} {n}");
}` }],
    ["De ce apelul unei funcții `extern \"C\"` e `unsafe`? || Why is calling an `extern \"C\"` function `unsafe`?", ["Compilatorul nu poate verifica dacă declarația corespunde funcției reale și ce face aceasta cu memoria || The compiler can't check the declaration matches the real function or what it does with memory", "Pentru că C e lent || Because C is slow", "Doar pe Windows || Only on Windows", "Nu e || It isn't"], "Wrapper-ul sigur din jurul apelului documentează invarianții. || A safe wrapper around the call documents the invariants."],
    ["Ce eroare dă apelul unei funcții `extern \"C\"` fără `unsafe`? || Which error does calling an `extern \"C\"` function without `unsafe` give?", ["E0133", "E0425", "E0603", "E0061"], "Funcțiile din blocuri `extern` sunt considerate `unsafe`. || Functions from `extern` blocks are considered `unsafe`.", { k: "err", err: "E0133", c: c`
extern "C" {
    fn abs(x: i32) -> i32;
}
fn main() {
    println!("{}", abs(-1));
}` }],
    ["Cum se termină un șir C? || How does a C string end?", ["Cu octetul 0 (NUL) || With a 0 (NUL) byte", "Cu lungimea la început || With its length at the start", "Cu `\\n`", "Nu are terminator || It has no terminator"], "De aceea un `String` Rust care conține 0 nu poate deveni direct șir C. || That's why a Rust `String` containing 0 can't directly become a C string."],
    ["Ce afișează? || What does it print?", ["lungime C: 9\ncu 0 în interior: true\n\"router-01\" router-01", "lungime C: 10\ncu 0 în interior: true\n\"router-01\" router-01", "lungime C: 9\ncu 0 în interior: false\n\"router-01\" router-01", "lungime C: 9\ncu 0 în interior: true\nrouter-01 router-01"], "`strlen` nu numără terminatorul; `CStr` se afișează cu ghilimele la `{:?}`. || `strlen` doesn't count the terminator; `CStr` prints quoted with `{:?}`.", { k: "out", c: c`
use std::ffi::{c_char, CStr, CString};
extern "C" {
    fn strlen(s: *const c_char) -> usize;
}
fn main() {
    let gazda = CString::new("router-01").unwrap();
    let n = unsafe { strlen(gazda.as_ptr()) };
    println!("lungime C: {n}");
    println!("cu 0 în interior: {}", CString::new("a\0b").is_err());
    let inapoi: &CStr = unsafe { CStr::from_ptr(gazda.as_ptr()) };
    println!("{:?} {}", inapoi, inapoi.to_str().unwrap());
}` }],
    ["Ce afișează? || What does it print?", ["[115, 119, 0]", "[115, 119]", "[0, 115, 119]", "\"sw\""], "`to_bytes_with_nul` include terminatorul. || `to_bytes_with_nul` includes the terminator.", { k: "out", c: c`
fn main() {
    println!("{:?}", c"sw".to_bytes_with_nul());
}` }],
    ["Care e problema cu `CString::new(\"x\").unwrap().as_ptr()` dat direct unei funcții C și păstrat pentru mai târziu? || What's wrong with keeping `CString::new(\"x\").unwrap().as_ptr()` for later use?", ["`CString`-ul temporar e eliberat imediat, iar pointerul rămâne dangling || The temporary `CString` is dropped immediately, leaving a dangling pointer", "Nimic || Nothing", "Nu compilează || It doesn't compile", "Șirul e copiat de două ori || The string is copied twice"], "Păstrează `CString`-ul într-o variabilă cât timp C folosește pointerul. || Keep the `CString` in a variable while C uses the pointer."],
    ["Ce face `#[repr(C)]` pe o structură? || What does `#[repr(C)]` do on a struct?", ["Folosește ordinea câmpurilor și alinierea din C, ca structura să fie compatibilă cu C || Uses C field order and alignment, so the struct is C-compatible", "Face structura `Copy` || Makes the struct `Copy`", "Elimină padding-ul || Removes padding", "Exportă structura ca simbol || Exports the struct as a symbol"], "Fără el, compilatorul are voie să reordoneze câmpurile. || Without it the compiler may reorder fields."],
    ["Ce afișează? || What does it print?", ["[5, 10, 20]\ndimensiune: 8", "[20, 5, 10]\ndimensiune: 8", "[5, 10, 20]\ndimensiune: 5", "[20, 10, 5]\ndimensiune: 8"], "`qsort` sortează crescător după comparator. Cu `repr(C)`: `u8` (1) + 3 octeți padding + `u32` (4) = 8. || `qsort` sorts ascending by the comparator. With `repr(C)`: `u8` (1) + 3 bytes padding + `u32` (4) = 8.", { k: "out", c: c`
use std::ffi::{c_int, c_void};
#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct Ruta { prefix: u8, metric: u32 }
extern "C" {
    fn qsort(base: *mut c_void, n: usize, size: usize, cmp: extern "C" fn(*const c_void, *const c_void) -> c_int);
}
extern "C" fn dupa_metric(a: *const c_void, b: *const c_void) -> c_int {
    let (a, b) = unsafe { (&*(a as *const Ruta), &*(b as *const Ruta)) };
    a.metric.cmp(&b.metric) as c_int
}
fn main() {
    let mut rute = [Ruta { prefix: 24, metric: 20 }, Ruta { prefix: 16, metric: 5 }, Ruta { prefix: 8, metric: 10 }];
    unsafe { qsort(rute.as_mut_ptr() as *mut c_void, rute.len(), std::mem::size_of::<Ruta>(), dupa_metric); }
    println!("{:?}", rute.iter().map(|r| r.metric).collect::<Vec<_>>());
    println!("dimensiune: {}", std::mem::size_of::<Ruta>());
}` }],
    ["Ce afișează? || What does it print?", ["12", "6", "8", "16"], "Cu `repr(C)`: `u8` (1) + 3 padding + `u32` (4) + `u8` (1) + 3 padding = 12. (Fără `repr(C)`, Rust ar putea reordona câmpurile la 8.) || With `repr(C)`: `u8` (1) + 3 padding + `u32` (4) + `u8` (1) + 3 padding = 12. (Without `repr(C)`, Rust could reorder to 8.)", { k: "out", c: c`
#[repr(C)]
struct A { a: u8, b: u32, c: u8 }
fn main() {
    println!("{}", std::mem::size_of::<A>());
}` }],
    ["Ce afișează? || What does it print?", ["Ordering::Less as c_int = -1", "Ordering::Less as c_int = 0", "Ordering::Less as c_int = 1", "nu compilează || doesn't compile"], "`Ordering` are discriminanții -1, 0, 1 — exact convenția comparatorilor C. || `Ordering` has discriminants -1, 0, 1 — exactly the C comparator convention.", { k: "out", c: c`
use std::cmp::Ordering;
fn main() {
    println!("Ordering::Less as c_int = {}", Ordering::Less as std::ffi::c_int);
}` }],
    ["Ce face `#[no_mangle]`? || What does `#[no_mangle]` do?", ["Păstrează numele simbolului exact cum e scris, ca să-l găsească C || Keeps the symbol name exactly as written so C can find it", "Dezactivează optimizările || Disables optimizations", "Face funcția privată || Makes the function private", "Interzice panicul || Forbids panics"], "Rust, implicit, „decorează” numele simbolurilor. În ediția 2024 se scrie `#[unsafe(no_mangle)]`. || Rust normally mangles symbol names. In the 2024 edition it's written `#[unsafe(no_mangle)]`."],
    ["Ce afișează? || What does it print?", ["1 0 -1", "1 1 -1", "0 0 0", "1 0 0"], "10.0.0.256 nu e valid (256 > 255); pointerul nul e tratat separat. || 10.0.0.256 isn't valid (256 > 255); the null pointer is handled separately.", { k: "out", c: c`
use std::ffi::{c_char, CStr};
#[no_mangle]
pub extern "C" fn ip_valid(s: *const c_char) -> i32 {
    if s.is_null() { return -1; }
    let s = unsafe { CStr::from_ptr(s) };
    match s.to_str().map(|t| t.parse::<std::net::Ipv4Addr>()) {
        Ok(Ok(_)) => 1,
        _ => 0,
    }
}
fn main() {
    println!("{} {} {}", ip_valid(c"10.0.0.1".as_ptr()), ip_valid(c"10.0.0.256".as_ptr()), ip_valid(std::ptr::null()));
}` }],
    ["Ce `crate-type` folosești pentru o bibliotecă dinamică pe care o încarcă un program C? || Which `crate-type` do you use for a dynamic library loaded by a C program?", ["`cdylib`", "`rlib`", "`bin`", "`proc-macro`"], "`staticlib` dă o bibliotecă statică (`.a`/`.lib`). || `staticlib` gives a static library (`.a`/`.lib`)."],
    ["Ce face `bindgen`? || What does `bindgen` do?", ["Generează declarații Rust din antete C (`.h`) || Generates Rust declarations from C headers (`.h`)", "Generează antete C din Rust || Generates C headers from Rust", "Compilează cod C || Compiles C code", "Rulează teste FFI || Runs FFI tests"], "Invers, `cbindgen` scrie antete C pentru o bibliotecă Rust. || Conversely, `cbindgen` writes C headers for a Rust library."],
    ["Ce tip Rust corespunde lui `int` din C pe platforma ta? || Which Rust type matches C's `int` on your platform?", ["`std::ffi::c_int`", "Mereu `i64` || Always `i64`", "`isize`", "`i16`"], "`c_int` e un alias pentru tipul corect pe platformă (de obicei `i32`). || `c_int` aliases the right type for the platform (usually `i32`)."],
    ["Ce se întâmplă dacă un panic ajunge la granița unei funcții `extern \"C\"`? || What happens if a panic reaches an `extern \"C\"` function boundary?", ["Procesul e oprit (abort) — panicul nu are voie să traverseze în C || The process aborts — a panic must not unwind into C", "C primește excepția || C receives the exception", "Funcția întoarce 0 || The function returns 0", "E ignorat || It's ignored"], "Comportament garantat începând cu Rust 1.81. Prinde panicurile cu `std::panic::catch_unwind` dacă vrei să întorci un cod de eroare. || Guaranteed since Rust 1.81. Catch panics with `std::panic::catch_unwind` if you want to return an error code."],
    ["Ce afișează? || What does it print?", ["Err(Utf8Error { valid_up_to: 0, error_len: Some(1) })", "Ok(\"\\u{ff}\")", "Ok(\"ÿ\")", "panic"], "Un `CStr` poate conține octeți care nu sunt UTF-8; `to_str` verifică. || A `CStr` may contain non-UTF-8 bytes; `to_str` checks.", { k: "out", c: c`
use std::ffi::CStr;
fn main() {
    let c = CStr::from_bytes_with_nul(&[0xFF, 0]).unwrap();
    println!("{:?}", c.to_str());
}` }],
    ["Ce afișează? || What does it print?", ["\"\\xff\" → �", "\"ÿ\" → ÿ", "Err", "panic"], "`to_string_lossy` înlocuiește octeții invalizi cu caracterul U+FFFD. || `to_string_lossy` replaces invalid bytes with U+FFFD.", { k: "out", c: c`
use std::ffi::CStr;
fn main() {
    let c = CStr::from_bytes_with_nul(&[0xFF, 0]).unwrap();
    println!("{:?} → {}", c, c.to_string_lossy());
}` }],
    ["Cine trebuie să elibereze memoria alocată de Rust și dată lui C (de ex. `CString::into_raw`)? || Who must free memory allocated by Rust and handed to C (e.g. `CString::into_raw`)?", ["Rust, prin `CString::from_raw` într-o funcție exportată de eliberare || Rust, via `CString::from_raw` in an exported free function", "C, cu `free()` || C, with `free()`", "Nimeni || Nobody", "Sistemul de operare imediat || The OS immediately"], "Alocatoarele pot diferi; fiecare parte eliberează ce a alocat. || The allocators may differ; each side frees what it allocated."],
    ["Ce afișează? || What does it print?", ["Some(7)", "Some(\"7\")", "None", "7"], "`strtol` (libc) parsează un `long`; aici e verificat și pointerul de final. || `strtol` (libc) parses a `long`; here the end pointer is checked too.", { k: "out", c: c`
use std::ffi::{c_char, c_int, c_long};
extern "C" {
    fn strtol(s: *const c_char, end: *mut *mut c_char, base: c_int) -> c_long;
}
fn parseaza(s: &std::ffi::CStr) -> Option<c_long> {
    let mut end = std::ptr::null_mut();
    let v = unsafe { strtol(s.as_ptr(), &mut end, 10) };
    if end as *const c_char == s.as_ptr() { None } else { Some(v) }
}
fn main() {
    println!("{:?}", parseaza(c"7"));
}` }],
    ["Ce afișează? || What does it print?", ["None", "Some(0)", "Some(-1)", "panic"], "Niciun caracter nu a fost consumat, deci pointerul de final e egal cu începutul. || No character was consumed, so the end pointer equals the start.", { k: "out", c: c`
use std::ffi::{c_char, c_int, c_long};
extern "C" {
    fn strtol(s: *const c_char, end: *mut *mut c_char, base: c_int) -> c_long;
}
fn parseaza(s: &std::ffi::CStr) -> Option<c_long> {
    let mut end = std::ptr::null_mut();
    let v = unsafe { strtol(s.as_ptr(), &mut end, 10) };
    if end as *const c_char == s.as_ptr() { None } else { Some(v) }
}
fn main() {
    println!("{:?}", parseaza(c"abc"));
}` }]
  ]);
})();

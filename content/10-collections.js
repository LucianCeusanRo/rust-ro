(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 7, icon: "📦", level: 1,
    title: { ro: "Colecții: Vec, String, HashMap", en: "Collections: Vec, String, HashMap" },
    summary: {
      ro: "Colecțiile din biblioteca standard țin date pe heap și pot crește: <code>Vec&lt;T&gt;</code>, <code>String</code>, <code>HashMap&lt;K, V&gt;</code>, <code>HashSet</code>, <code>BTreeMap</code>, <code>VecDeque</code>.",
      en: "Standard library collections keep data on the heap and can grow: <code>Vec&lt;T&gt;</code>, <code>String</code>, <code>HashMap&lt;K, V&gt;</code>, <code>HashSet</code>, <code>BTreeMap</code>, <code>VecDeque</code>."
    },
    sections: [
      { h: { ro: "Vec<T>: lista care crește", en: "Vec<T>: the growable list" },
        p: { ro: "<code>vec![...]</code> creează un vector. <code>push</code> adaugă la final, <code>pop</code> scoate ultimul element și întoarce <code>Option&lt;T&gt;</code>. Indexarea <code>v[i]</code> dă <i>panic</i> dacă indexul e în afara limitelor, pe când <code>v.get(i)</code> întoarce <code>Option&lt;&amp;T&gt;</code>.",
             en: "<code>vec![...]</code> creates a vector. <code>push</code> appends, <code>pop</code> removes the last element and returns <code>Option&lt;T&gt;</code>. Indexing <code>v[i]</code> <i>panics</i> when the index is out of bounds, while <code>v.get(i)</code> returns <code>Option&lt;&amp;T&gt;</code>." },
        code: c`
fn main() {
    let mut porturi = vec![22, 80];
    porturi.push(443);
    println!("{:?} len={}", porturi, porturi.len());
    println!("{:?}", porturi.get(10)); // None, fără panic
    let ultimul = porturi.pop();
    println!("{:?} {:?}", ultimul, porturi);
    for p in &porturi {
        println!("port {p}");
    }
}` },
      { h: { ro: "String și &str", en: "String and &str" },
        p: { ro: "<code>String</code> deține text UTF-8 pe heap; <code>&amp;str</code> este o privire împrumutată asupra unui text. <code>len()</code> numără <b>octeți</b>, nu caractere: „ș” are 2 octeți în UTF-8. Pentru caractere folosește <code>.chars()</code>. Nu poți indexa un <code>String</code> cu <code>s[0]</code>.",
             en: "<code>String</code> owns UTF-8 text on the heap; <code>&amp;str</code> is a borrowed view of text. <code>len()</code> counts <b>bytes</b>, not characters: “ș” is 2 bytes in UTF-8. For characters use <code>.chars()</code>. You cannot index a <code>String</code> with <code>s[0]</code>." },
        code: c`
fn main() {
    let mut s = String::from("Iași");
    s.push_str(" -> ");
    s.push('B');
    println!("{s}");
    println!("octeți={} caractere={}", "Iași".len(), "Iași".chars().count());
    let sus = s.to_uppercase();
    println!("{sus}");
    let parti: Vec<&str> = "a,b,,c".split(',').collect();
    println!("{:?}", parti);
}` },
      { h: { ro: "HashMap și entry", en: "HashMap and entry" },
        p: { ro: "<code>HashMap&lt;K, V&gt;</code> asociază chei cu valori. Ordinea de iterare <b>nu</b> este garantată. API-ul <code>entry</code> e idiomatic pentru numărare: <code>*m.entry(k).or_insert(0) += 1</code>. Dacă vrei chei sortate, folosește <code>BTreeMap</code>.",
             en: "<code>HashMap&lt;K, V&gt;</code> maps keys to values. Iteration order is <b>not</b> guaranteed. The <code>entry</code> API is the idiomatic way to count: <code>*m.entry(k).or_insert(0) += 1</code>. If you want sorted keys, use <code>BTreeMap</code>." },
        code: c`
use std::collections::{BTreeMap, HashMap};

fn main() {
    let text = "ok fail ok ok timeout fail";
    let mut h: HashMap<&str, u32> = HashMap::new();
    for w in text.split_whitespace() {
        *h.entry(w).or_insert(0) += 1;
    }
    println!("ok={}", h["ok"]);
    println!("{:?}", h.get("lipsa"));

    let sortat: BTreeMap<_, _> = h.into_iter().collect();
    println!("{:?}", sortat); // chei în ordine alfabetică
}` },
      { h: { ro: "HashSet, VecDeque și când alegi ce", en: "HashSet, VecDeque and when to use which" },
        p: { ro: "<code>HashSet</code> ține valori unice (test rapid de apartenență). <code>VecDeque</code> e o coadă cu inserare/scoatere eficientă la ambele capete. Regulă practică: începe cu <code>Vec</code>; treci la <code>HashMap</code>/<code>HashSet</code> pentru căutări după cheie, la <code>BTreeMap</code> pentru ordine, la <code>VecDeque</code> pentru cozi FIFO.",
             en: "<code>HashSet</code> holds unique values (fast membership test). <code>VecDeque</code> is a queue with efficient push/pop at both ends. Rule of thumb: start with <code>Vec</code>; switch to <code>HashMap</code>/<code>HashSet</code> for lookups by key, <code>BTreeMap</code> for order, <code>VecDeque</code> for FIFO queues." },
        code: c`
use std::collections::{HashSet, VecDeque};

fn main() {
    let ip: HashSet<&str> = ["10.0.0.1", "10.0.0.2", "10.0.0.1"].into_iter().collect();
    println!("unice: {}", ip.len());
    println!("{}", ip.contains("10.0.0.2"));

    let mut coada = VecDeque::new();
    coada.push_back("job1");
    coada.push_back("job2");
    coada.push_front("urgent");
    while let Some(j) = coada.pop_front() {
        println!("{j}");
    }
}` }
    ],
    exercises: [
      { title: { ro: "Numără nivelurile din log", en: "Count log levels" },
        task: { ro: "Completează <code>numara</code> astfel încât să întoarcă un <code>BTreeMap</code> cu de câte ori apare fiecare primul cuvânt din linii. Programul trebuie să afișeze <code>{\"ERROR\": 2, \"INFO\": 3, \"WARN\": 1}</code>.",
                en: "Complete <code>numara</code> (count) so it returns a <code>BTreeMap</code> with how many times each first word appears. The program must print <code>{\"ERROR\": 2, \"INFO\": 3, \"WARN\": 1}</code>." },
        hint: { ro: "<code>for l in linii { if let Some(w) = l.split_whitespace().next() { *m.entry(w).or_insert(0) += 1; } }</code>", en: "<code>for l in linii { if let Some(w) = l.split_whitespace().next() { *m.entry(w).or_insert(0) += 1; } }</code>" },
        starter: c`
use std::collections::BTreeMap;

fn numara<'a>(linii: &[&'a str]) -> BTreeMap<&'a str, u32> {
    let m = BTreeMap::new();
    // TODO: numără primul cuvânt din fiecare linie
    let _ = linii;
    m
}

fn main() {
    let linii = ["INFO start", "WARN disk 91%", "INFO ok", "ERROR link down", "INFO ok", "ERROR timeout"];
    println!("{:?}", numara(&linii));
}`,
        solution: c`
use std::collections::BTreeMap;

fn numara<'a>(linii: &[&'a str]) -> BTreeMap<&'a str, u32> {
    let mut m = BTreeMap::new();
    for l in linii {
        if let Some(w) = l.split_whitespace().next() {
            *m.entry(w).or_insert(0) += 1;
        }
    }
    m
}

fn main() {
    let linii = ["INFO start", "WARN disk 91%", "INFO ok", "ERROR link down", "INFO ok", "ERROR timeout"];
    println!("{:?}", numara(&linii));
}`,
        expect: `{"ERROR": 2, "INFO": 3, "WARN": 1}` },
      { title: { ro: "Elimină duplicatele păstrând ordinea", en: "Remove duplicates, keep order" },
        task: { ro: "Scrie <code>unice(v: &amp;[u16]) -&gt; Vec&lt;u16&gt;</code> care păstrează prima apariție a fiecărui port. Rezultat așteptat: <code>[80, 443, 22]</code>.", en: "Write <code>unice(v: &amp;[u16]) -&gt; Vec&lt;u16&gt;</code> that keeps the first occurrence of each port. Expected: <code>[80, 443, 22]</code>." },
        hint: { ro: "Folosește un <code>HashSet</code>: <code>insert</code> întoarce <code>true</code> doar dacă valoarea e nouă.", en: "Use a <code>HashSet</code>: <code>insert</code> returns <code>true</code> only if the value is new." },
        starter: c`
use std::collections::HashSet;

fn unice(v: &[u16]) -> Vec<u16> {
    let _vazute: HashSet<u16> = HashSet::new();
    v.to_vec() // TODO
}

fn main() {
    println!("{:?}", unice(&[80, 443, 80, 22, 443]));
}`,
        solution: c`
use std::collections::HashSet;

fn unice(v: &[u16]) -> Vec<u16> {
    let mut vazute = HashSet::new();
    let mut out = Vec::new();
    for &p in v {
        if vazute.insert(p) {
            out.push(p);
        }
    }
    out
}

fn main() {
    println!("{:?}", unice(&[80, 443, 80, 22, 443]));
}`,
        expect: "[80, 443, 22]" }
    ]
  });
  QB("l7", [
    ["Ce întoarce `v.pop()` pe un `Vec<i32>`? || What does `v.pop()` return on a `Vec<i32>`?", ["`Option<i32>`", "`i32`", "`Result<i32, ()>`", "`&i32`"], "Vectorul poate fi gol, deci rezultatul este `Some(ultimul)` sau `None`. || The vector may be empty, so the result is `Some(last)` or `None`."],
    ["Ce se întâmplă la `v[10]` când `v` are 3 elemente? || What happens with `v[10]` when `v` has 3 elements?", ["Programul dă panic la rulare || The program panics at runtime", "Întoarce `None` || It returns `None`", "Întoarce 0 || It returns 0", "Comportament nedefinit, ca în C || Undefined behaviour, like in C"], "Indexarea verifică limitele și dă panic. Pentru varianta fără panic folosește `v.get(10)`. || Indexing is bounds-checked and panics. For the non-panicking version use `v.get(10)`."],
    ["Ce întoarce `v.get(i)`? || What does `v.get(i)` return?", ["`Option<&T>`", "`&T`", "`T`", "`Result<&T, usize>`"], "`get` împrumută elementul dacă există. || `get` borrows the element if it exists."],
    ["Ce afișează programul? || What does the program print?", ["3", "2", "4", "5"], "`len()` numără octeți: „a” are 1 octet, „ș” are 2 în UTF-8. || `len()` counts bytes: “a” is 1 byte, “ș” is 2 in UTF-8.", { k: "out", c: c`
fn main() {
    println!("{}", "aș".len());
}` }],
    ["Ce afișează? || What does it print?", ["4 3", "3 3", "4 4", "3 4"], "`\"ași\"`.len() = 4 octeți (ș = 2), dar are 3 caractere. || `\"ași\".len()` = 4 bytes (ș = 2), but it has 3 characters.", { k: "out", c: c`
fn main() {
    let s = "ași";
    println!("{} {}", s.len(), s.chars().count());
}` }],
    ["De ce nu compilează `let c = s[0];` când `s` e un `String`? || Why doesn't `let c = s[0];` compile when `s` is a `String`?", ["`String` nu implementează indexarea cu întreg, pentru că UTF-8 are caractere de lungime variabilă || `String` doesn't implement integer indexing because UTF-8 characters have variable length", "Pentru că `s` nu e `mut` || Because `s` isn't `mut`", "Pentru că indexul trebuie să fie `u8` || Because the index must be `u8`", "Compilează, doar că e lent || It compiles, it's just slow"], "Rust refuză indexarea cu întreg pe text (eroarea E0277). Folosește `.chars().nth(0)` sau slice-uri pe granițe de caracter. || Rust rejects integer indexing on text (error E0277). Use `.chars().nth(0)` or slices on character boundaries."],
    ["Ce eroare dă acest cod? || Which error does this code give?", ["E0277", "E0382", "E0308", "E0599"], "E0277: tipul `String` nu poate fi indexat cu `{integer}` (trait-ul `Index<{integer}>` lipsește). || E0277: `String` cannot be indexed by `{integer}` (the `Index<{integer}>` trait is missing).", { k: "err", err: "E0277", c: c`
fn main() {
    let s = String::from("rust");
    let c = s[0];
    println!("{c}");
}` }],
    ["Ce afișează? || What does it print?", ["[\"a\", \"b\", \"\", \"c\"]", "[\"a\", \"b\", \"c\"]", "[\"a,b,,c\"]", "[\"a\", \"b\", \" \", \"c\"]"], "`split(',')` păstrează și bucățile goale dintre două virgule consecutive. || `split(',')` keeps empty pieces between two consecutive commas.", { k: "out", c: c`
fn main() {
    let v: Vec<&str> = "a,b,,c".split(',').collect();
    println!("{:?}", v);
}` }],
    ["Este garantată ordinea de iterare într-un `HashMap`? || Is iteration order guaranteed in a `HashMap`?", ["Nu || No", "Da, ordinea inserării || Yes, insertion order", "Da, ordinea sortată a cheilor || Yes, sorted key order", "Da, dar doar pentru chei numerice || Yes, but only for numeric keys"], "`HashMap` nu garantează nicio ordine (și folosește un hasher cu cheie aleatoare). Pentru ordine sortată folosește `BTreeMap`. || `HashMap` guarantees no order (and uses a randomly keyed hasher). For sorted order use `BTreeMap`."],
    ["Ce colecție păstrează cheile sortate? || Which collection keeps keys sorted?", ["`BTreeMap`", "`HashMap`", "`Vec`", "`VecDeque`"], "`BTreeMap` e un arbore B ordonat după cheie. || `BTreeMap` is a B-tree ordered by key."],
    ["Ce afișează? || What does it print?", ["{\"a\": 2, \"b\": 1}", "{\"b\": 1, \"a\": 2}", "{\"a\": 1, \"b\": 1}", "{\"a\": 3}"], "`entry(...).or_insert(0)` creează valoarea 0 dacă lipsește, apoi o incrementăm. `BTreeMap` afișează cheile sortate. || `entry(...).or_insert(0)` creates 0 if missing, then we increment it. `BTreeMap` prints keys sorted.", { k: "out", c: c`
use std::collections::BTreeMap;
fn main() {
    let mut m = BTreeMap::new();
    for w in ["b", "a", "a"] {
        *m.entry(w).or_insert(0) += 1;
    }
    println!("{:?}", m);
}` }],
    ["Ce întoarce `set.insert(x)` pe un `HashSet`? || What does `set.insert(x)` return on a `HashSet`?", ["`true` dacă valoarea era nouă, `false` dacă exista deja || `true` if the value was new, `false` if it was already there", "Mereu `()` || Always `()`", "Indexul unde a fost pusă || The index where it was placed", "`Option<T>` cu valoarea veche || `Option<T>` with the old value"], "Valoarea booleană îți spune dacă inserarea a adăugat ceva. || The boolean tells you whether the insert added anything."],
    ["Ce întoarce `map.insert(k, v)` pe un `HashMap`? || What does `map.insert(k, v)` return on a `HashMap`?", ["`Option<V>` — valoarea veche, dacă exista || `Option<V>` — the old value, if there was one", "`bool`", "`()`", "`Result<(), V>`"], "Dacă cheia exista, valoarea veche e înlocuită și întoarsă în `Some`. || If the key existed, the old value is replaced and returned in `Some`."],
    ["Ce afișează? || What does it print?", ["2", "3", "1", "0"], "Duplicatele dispar într-un `HashSet`. || Duplicates disappear in a `HashSet`.", { k: "out", c: c`
use std::collections::HashSet;
fn main() {
    let s: HashSet<i32> = vec![1, 2, 1, 2, 1].into_iter().collect();
    println!("{}", s.len());
}` }],
    ["Care colecție e potrivită pentru o coadă FIFO cu scoatere eficientă din față? || Which collection fits a FIFO queue with efficient removal from the front?", ["`VecDeque`", "`Vec` cu `remove(0)` || `Vec` with `remove(0)`", "`HashSet`", "`BTreeMap`"], "`VecDeque` e un buffer circular: `push_back` și `pop_front` sunt O(1) amortizat. `Vec::remove(0)` mută toate elementele (O(n)). || `VecDeque` is a ring buffer: `push_back` and `pop_front` are amortized O(1). `Vec::remove(0)` shifts every element (O(n))."],
    ["Ce afișează? || What does it print?", ["urgent\njob1\njob2", "job1\njob2\nurgent", "job2\njob1\nurgent", "urgent\njob2\njob1"], "`push_front` pune la început, `pop_front` scoate de la început. || `push_front` adds at the front, `pop_front` removes from the front.", { k: "out", c: c`
use std::collections::VecDeque;
fn main() {
    let mut q = VecDeque::new();
    q.push_back("job1");
    q.push_back("job2");
    q.push_front("urgent");
    while let Some(j) = q.pop_front() {
        println!("{j}");
    }
}` }],
    ["Ce face `Vec::with_capacity(100)`? || What does `Vec::with_capacity(100)` do?", ["Alocă spațiu pentru 100 de elemente, dar lungimea rămâne 0 || Allocates room for 100 elements, but the length stays 0", "Creează 100 de elemente cu valoarea 0 || Creates 100 elements set to 0", "Limitează vectorul la maximum 100 de elemente || Caps the vector at 100 elements", "Nu compilează fără tip explicit || Doesn't compile without an explicit type"], "Capacitatea e spațiul rezervat; `len()` e numărul real de elemente. Vectorul poate crește și peste 100. || Capacity is reserved space; `len()` is the real element count. The vector can still grow beyond 100."],
    ["Ce afișează? || What does it print?", ["0 true", "100 false", "0 false", "100 true"], "`len()` e 0, iar capacitatea este cel puțin 100. || `len()` is 0 and the capacity is at least 100.", { k: "out", c: c`
fn main() {
    let v: Vec<u8> = Vec::with_capacity(100);
    println!("{} {}", v.len(), v.capacity() >= 100);
}` }],
    ["Ce eroare primești aici? || Which error do you get here?", ["E0502", "E0499", "E0382", "E0277"], "`primul` împrumută imutabil vectorul, iar `push` cere un împrumut mutabil cât timp `primul` e încă folosit (E0502). `push` poate realoca memoria, iar referința ar rămâne atârnată. || `primul` borrows the vector immutably, and `push` needs a mutable borrow while `primul` is still used (E0502). `push` may reallocate, which would leave the reference dangling.", { k: "err", err: "E0502", c: c`
fn main() {
    let mut v = vec![1, 2, 3];
    let primul = &v[0];
    v.push(4);
    println!("{primul}");
}` }],
    ["Cum concatenezi corect două `String`-uri `a` și `b` păstrându-le pe amândouă? || How do you correctly join two `String`s `a` and `b` while keeping both?", ["`format!(\"{a}{b}\")`", "`a + b`", "`a.push(b)`", "`a[..] + b[..]`"], "`a + b` nu compilează (trebuie `a + &b`) și oricum consumă `a`. `format!` doar împrumută. `push` adaugă un singur `char`. || `a + b` doesn't compile (it needs `a + &b`) and consumes `a` anyway. `format!` only borrows. `push` adds a single `char`."],
    ["Ce afișează? || What does it print?", ["rust-ro", "rust ro", "rustro", "ro-rust"], "`a + \"-\" + &b` consumă `a` și împrumută `b`. || `a + \"-\" + &b` consumes `a` and borrows `b`.", { k: "out", c: c`
fn main() {
    let a = String::from("rust");
    let b = String::from("ro");
    let c = a + "-" + &b;
    println!("{c}");
}` }],
    ["Ce face `v.sort()` pe un `Vec<f64>`? || What does `v.sort()` do on a `Vec<f64>`?", ["Nu compilează: `f64` nu e `Ord` (NaN); folosești `sort_by(|a, b| a.total_cmp(b))` || Doesn't compile: `f64` isn't `Ord` (NaN); use `sort_by(|a, b| a.total_cmp(b))`", "Sortează crescător || Sorts ascending", "Sortează descrescător || Sorts descending", "Dă panic dacă există NaN || Panics if there is a NaN"], "`sort` cere `T: Ord`. `f64` are doar `PartialOrd` din cauza NaN. || `sort` requires `T: Ord`. `f64` only has `PartialOrd` because of NaN."],
    ["Ce eroare dă `v.sort()` pe `Vec<f64>`? || Which error does `v.sort()` give on `Vec<f64>`?", ["E0277", "E0599", "E0308", "E0502"], "Trait bound nesatisfăcut: `f64: Ord`. || Unsatisfied trait bound: `f64: Ord`.", { k: "err", err: "E0277", c: c`
fn main() {
    let mut v = vec![2.5, 1.0];
    v.sort();
    println!("{:?}", v);
}` }],
    ["Ce afișează? || What does it print?", ["[1, 2, 3]", "[3, 2, 1]", "[1, 3, 2]", "[2, 1, 3]"], "`dedup` scoate doar duplicatele <i>consecutive</i>, de aceea sortăm întâi. || `dedup` removes only <i>consecutive</i> duplicates, which is why we sort first.", { k: "out", c: c`
fn main() {
    let mut v = vec![3, 1, 2, 3, 1];
    v.sort();
    v.dedup();
    println!("{:?}", v);
}` }],
    ["Ce face `s.trim()` pe un `&str`? || What does `s.trim()` do on a `&str`?", ["Întoarce un `&str` fără spațiile albe de la capete, fără să aloce || Returns a `&str` without leading/trailing whitespace, without allocating", "Modifică textul pe loc || Modifies the text in place", "Întoarce un `String` nou || Returns a new `String`", "Șterge toate spațiile din text || Removes every space in the text"], "`trim` întoarce un sub-slice al textului original. || `trim` returns a sub-slice of the original text."]
  ]);
})();

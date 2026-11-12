(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 12, icon: "🔁", level: 2,
    title: { ro: "Iteratori", en: "Iterators" },
    summary: {
      ro: "Iteratorii procesează secvențe pas cu pas: <code>map</code>, <code>filter</code>, <code>sum</code>, <code>collect</code> și altele. Sunt <i>leneși</i> (nu fac nimic până nu sunt consumați) și se compilează la cod la fel de rapid ca o buclă scrisă de mână.",
      en: "Iterators process sequences step by step: <code>map</code>, <code>filter</code>, <code>sum</code>, <code>collect</code> and more. They are <i>lazy</i> (they do nothing until consumed) and compile down to code as fast as a hand-written loop."
    },
    sections: [
      { h: { ro: "iter, iter_mut, into_iter", en: "iter, iter_mut, into_iter" },
        p: { ro: "<code>v.iter()</code> dă <code>&amp;T</code>, <code>v.iter_mut()</code> dă <code>&amp;mut T</code>, iar <code>v.into_iter()</code> consumă vectorul și dă <code>T</code>. Bucla <code>for x in &amp;v</code> folosește <code>iter()</code>; <code>for x in v</code> folosește <code>into_iter()</code> și mută vectorul.",
             en: "<code>v.iter()</code> yields <code>&amp;T</code>, <code>v.iter_mut()</code> yields <code>&amp;mut T</code>, and <code>v.into_iter()</code> consumes the vector and yields <code>T</code>. <code>for x in &amp;v</code> uses <code>iter()</code>; <code>for x in v</code> uses <code>into_iter()</code> and moves the vector." },
        code: c`
fn main() {
    let mut lat = vec![12, 40, 7];
    for x in lat.iter_mut() {
        *x += 1;
    }
    let total: i32 = lat.iter().sum();
    println!("{:?} total={total}", lat);
    let texte: Vec<String> = lat.into_iter().map(|x| format!("{x}ms")).collect();
    println!("{:?}", texte);
}` },
      { h: { ro: "Adaptori și consumatori", en: "Adapters and consumers" },
        p: { ro: "Adaptorii (<code>map</code>, <code>filter</code>, <code>enumerate</code>, <code>zip</code>, <code>take</code>, <code>skip</code>, <code>rev</code>, <code>chain</code>) întorc un iterator nou. Consumatorii (<code>collect</code>, <code>sum</code>, <code>count</code>, <code>fold</code>, <code>any</code>, <code>all</code>, <code>find</code>, <code>max</code>) parcurg efectiv iteratorul. Fără consumator, nu se execută nimic.",
             en: "Adapters (<code>map</code>, <code>filter</code>, <code>enumerate</code>, <code>zip</code>, <code>take</code>, <code>skip</code>, <code>rev</code>, <code>chain</code>) return a new iterator. Consumers (<code>collect</code>, <code>sum</code>, <code>count</code>, <code>fold</code>, <code>any</code>, <code>all</code>, <code>find</code>, <code>max</code>) actually drive it. Without a consumer, nothing runs." },
        code: c`
fn main() {
    let ping = [12, 250, 31, 900, 18];
    let lente: Vec<(usize, &i32)> = ping.iter().enumerate().filter(|(_, &ms)| ms > 100).collect();
    println!("{:?}", lente);
    println!("max={:?} any>500={}", ping.iter().max(), ping.iter().any(|&x| x > 500));
    let medie = ping.iter().sum::<i32>() as f64 / ping.len() as f64;
    println!("medie={medie:.1}");
    let hosturi = ["r1", "r2", "r3"];
    for (h, ms) in hosturi.iter().zip(ping.iter()).take(2) {
        println!("{h}: {ms}ms");
    }
}` },
      { h: { ro: "collect în tipuri diferite", en: "collect into different types" },
        p: { ro: "<code>collect</code> poate construi <code>Vec</code>, <code>String</code>, <code>HashMap</code>, <code>HashSet</code>… după tipul cerut. Un truc util: un iterator de <code>Result&lt;T, E&gt;</code> poate fi colectat în <code>Result&lt;Vec&lt;T&gt;, E&gt;</code> — se oprește la prima eroare.",
             en: "<code>collect</code> can build a <code>Vec</code>, <code>String</code>, <code>HashMap</code>, <code>HashSet</code>… depending on the requested type. A handy trick: an iterator of <code>Result&lt;T, E&gt;</code> can be collected into <code>Result&lt;Vec&lt;T&gt;, E&gt;</code> — it stops at the first error." },
        code: c`
use std::collections::HashMap;

fn main() {
    let ok: Result<Vec<u16>, _> = "22,80,443".split(',').map(str::parse::<u16>).collect();
    println!("{:?}", ok);
    let rau: Result<Vec<u16>, _> = "22,x,443".split(',').map(str::parse::<u16>).collect();
    println!("{}", rau.is_err());
    let m: HashMap<&str, u16> = [("ssh", 22), ("https", 443)].into_iter().collect();
    println!("{}", m["ssh"]);
    let s: String = ['r', 'u', 's', 't'].iter().rev().collect();
    println!("{s}");
}` },
      { h: { ro: "Iteratorul tău: trait-ul Iterator", en: "Your own iterator: the Iterator trait" },
        p: { ro: "Implementezi doar <code>fn next(&amp;mut self) -&gt; Option&lt;Self::Item&gt;</code> și primești gratis toți adaptorii. <code>None</code> înseamnă „gata”.",
             en: "You implement only <code>fn next(&amp;mut self) -&gt; Option&lt;Self::Item&gt;</code> and get every adapter for free. <code>None</code> means “done”." },
        code: c`
struct Subretea {
    urm: u32,
    sfarsit: u32,
}

impl Iterator for Subretea {
    type Item = String;
    fn next(&mut self) -> Option<String> {
        if self.urm > self.sfarsit {
            return None;
        }
        let ip = format!("10.0.0.{}", self.urm);
        self.urm += 1;
        Some(ip)
    }
}

fn main() {
    let s = Subretea { urm: 1, sfarsit: 254 };
    let primele: Vec<String> = s.skip(9).step_by(100).collect();
    println!("{:?}", primele);
}` }
    ],
    exercises: [
      { title: { ro: "Statistici de latență", en: "Latency stats" },
        task: { ro: "Folosind doar iteratori (fără bucle <code>for</code>), calculează câte valori sunt sub 100 ms și suma lor. Rezultat așteptat: <code>3 61</code>.", en: "Using only iterators (no <code>for</code> loops), compute how many values are below 100 ms and their sum. Expected: <code>3 61</code>." },
        hint: { ro: "<code>let rapide: Vec&lt;u32&gt; = ping.iter().copied().filter(|&amp;x| x &lt; 100).collect();</code> apoi <code>len()</code> și <code>iter().sum::&lt;u32&gt;()</code>.", en: "<code>let rapide: Vec&lt;u32&gt; = ping.iter().copied().filter(|&amp;x| x &lt; 100).collect();</code> then <code>len()</code> and <code>iter().sum::&lt;u32&gt;()</code>." },
        starter: c`
fn main() {
    let ping = [12u32, 250, 31, 900, 18];
    let nr = 0; // TODO
    let suma = 0; // TODO
    let _ = ping;
    println!("{nr} {suma}");
}`,
        solution: c`
fn main() {
    let ping = [12u32, 250, 31, 900, 18];
    let rapide: Vec<u32> = ping.iter().copied().filter(|&x| x < 100).collect();
    let nr = rapide.len();
    let suma: u32 = rapide.iter().sum();
    println!("{nr} {suma}");
}`,
        expect: "3 61" }
    ]
  });
  QB("l12", [
    ["Ce înseamnă că iteratorii sunt „leneși” (lazy)? || What does it mean that iterators are lazy?", ["Nu fac nimic până nu sunt consumați (de ex. cu `collect`, `sum`, `for`) || They do nothing until consumed (e.g. by `collect`, `sum`, `for`)", "Sunt lenți || They are slow", "Se execută pe alt fir || They run on another thread", "Calculează totul dinainte || They compute everything upfront"], "De aceea `v.iter().map(...)` fără consumator primește un avertisment `unused_must_use`. || That's why `v.iter().map(...)` without a consumer gets an `unused_must_use` warning."],
    ["Ce tip de element dă `v.iter()` pe un `Vec<i32>`? || What element type does `v.iter()` yield on a `Vec<i32>`?", ["`&i32`", "`i32`", "`&mut i32`", "`Option<i32>`"], "`iter()` împrumută; `into_iter()` consumă; `iter_mut()` împrumută mutabil. || `iter()` borrows; `into_iter()` consumes; `iter_mut()` borrows mutably."],
    ["Ce afișează? || What does it print?", ["[13, 41, 8] total=62", "[12, 40, 7] total=59", "[13, 41, 8] total=59", "[12, 40, 7] total=62"], "`iter_mut` modifică elementele pe loc. || `iter_mut` modifies the elements in place.", { k: "out", c: c`
fn main() {
    let mut lat = vec![12, 40, 7];
    for x in lat.iter_mut() { *x += 1; }
    let total: i32 = lat.iter().sum();
    println!("{:?} total={total}", lat);
}` }],
    ["Ce afișează? || What does it print?", ["[(1, 250), (3, 900)]", "[250, 900]", "[(250, 1), (900, 3)]", "[1, 3]"], "`enumerate` dă perechi (index, valoare). || `enumerate` yields (index, value) pairs.", { k: "out", c: c`
fn main() {
    let ping = [12, 250, 31, 900, 18];
    let lente: Vec<(usize, i32)> = ping.iter().copied().enumerate().filter(|&(_, ms)| ms > 100).collect();
    println!("{:?}", lente);
}` }],
    ["Ce afișează? || What does it print?", ["Some(900) true", "900 true", "Some(900) false", "Some(12) true"], "`max()` întoarce `Option` (iteratorul ar putea fi gol). || `max()` returns an `Option` (the iterator could be empty).", { k: "out", c: c`
fn main() {
    let ping = [12, 250, 31, 900, 18];
    println!("{:?} {}", ping.iter().max(), ping.iter().any(|&x| x > 500));
}` }],
    ["Ce afișează? || What does it print?", ["r1: 12\nr2: 250", "r1: 12\nr2: 250\nr3: 31", "r1: 12", "12\n250"], "`zip` oprește la cel mai scurt iterator, `take(2)` ia primele două perechi. || `zip` stops at the shortest iterator, `take(2)` takes the first two pairs.", { k: "out", c: c`
fn main() {
    let ping = [12, 250, 31];
    let hosturi = ["r1", "r2", "r3"];
    for (h, ms) in hosturi.iter().zip(ping.iter()).take(2) {
        println!("{h}: {ms}");
    }
}` }],
    ["Care dintre acestea este un consumator? || Which of these is a consumer?", ["`fold`", "`map`", "`filter`", "`enumerate`"], "`fold` parcurge tot iteratorul și întoarce o valoare. Celelalte întorc iteratori noi. || `fold` drives the whole iterator and returns a value. The others return new iterators."],
    ["Ce afișează? || What does it print?", ["10", "24", "4", "0"], "`fold(0, |a, x| a + x)` adună 1+2+3+4. || `fold(0, |a, x| a + x)` adds 1+2+3+4.", { k: "out", c: c`
fn main() {
    println!("{}", (1..=4).fold(0, |a, x| a + x));
}` }],
    ["Ce afișează? || What does it print?", ["24", "10", "4", "1"], "Produsul 1×2×3×4 = 24. || The product 1×2×3×4 = 24.", { k: "out", c: c`
fn main() {
    let p: u32 = (1..=4).product();
    println!("{p}");
}` }],
    ["Ce afișează? || What does it print?", ["Ok([22, 80, 443])\ntrue", "[22, 80, 443]\nfalse", "Ok([22, 80, 443])\nfalse", "Err\ntrue"], "Colectarea în `Result<Vec<_>, _>` dă `Err` la primul element invalid. || Collecting into `Result<Vec<_>, _>` yields `Err` at the first invalid element.", { k: "out", c: c`
fn main() {
    let ok: Result<Vec<u16>, _> = "22,80,443".split(',').map(str::parse::<u16>).collect();
    println!("{:?}", ok);
    let rau: Result<Vec<u16>, _> = "22,x,443".split(',').map(str::parse::<u16>).collect();
    println!("{}", rau.is_err());
}` }],
    ["Ce afișează? || What does it print?", ["tsur", "rust", "t,s,u,r", "nu compilează || doesn't compile"], "`rev()` inversează, iar `collect` poate construi un `String` din caractere. || `rev()` reverses, and `collect` can build a `String` from chars.", { k: "out", c: c`
fn main() {
    let s: String = ['r', 'u', 's', 't'].iter().rev().collect();
    println!("{s}");
}` }],
    ["Ce metodă trebuie implementată pentru trait-ul `Iterator`? || Which method must you implement for the `Iterator` trait?", ["`next`", "`iter`", "`collect`", "`len`"], "`fn next(&mut self) -> Option<Self::Item>`; restul metodelor au implementări implicite. || `fn next(&mut self) -> Option<Self::Item>`; every other method has a default implementation."],
    ["Ce afișează? || What does it print?", ["[\"10.0.0.10\", \"10.0.0.110\", \"10.0.0.210\"]", "[\"10.0.0.1\", \"10.0.0.101\", \"10.0.0.201\"]", "[\"10.0.0.9\", \"10.0.0.109\", \"10.0.0.209\"]", "[\"10.0.0.10\"]"], "`skip(9)` sare peste .1–.9, apoi `step_by(100)` ia .10, .110, .210. || `skip(9)` skips .1–.9, then `step_by(100)` takes .10, .110, .210.", { k: "out", c: c`
struct Subretea { urm: u32, sfarsit: u32 }
impl Iterator for Subretea {
    type Item = String;
    fn next(&mut self) -> Option<String> {
        if self.urm > self.sfarsit { return None; }
        let ip = format!("10.0.0.{}", self.urm);
        self.urm += 1;
        Some(ip)
    }
}
fn main() {
    let v: Vec<String> = Subretea { urm: 1, sfarsit: 254 }.skip(9).step_by(100).collect();
    println!("{:?}", v);
}` }],
    ["Ce afișează? || What does it print?", ["0", "3", "nimic || nothing", "1 2 3"], "`map` e leneș: fără consumator, closure-ul nu rulează niciodată, deci `n` rămâne 0. || `map` is lazy: with no consumer, the closure never runs, so `n` stays 0.", { k: "out", c: c`
fn main() {
    let mut n = 0;
    let v = [1, 2, 3];
    let _it = v.iter().map(|x| { n += 1; x * 2 });
    drop(_it);
    println!("{n}");
}` }],
    ["Ce eroare dă? (vectorul e folosit după `for x in v`) || Which error? (vector used after `for x in v`)", ["E0382", "E0502", "E0499", "E0277"], "`for x in v` apelează `into_iter()` și mută `v`. Folosește `for x in &v`. || `for x in v` calls `into_iter()` and moves `v`. Use `for x in &v`.", { k: "err", err: "E0382", c: c`
fn main() {
    let v = vec![String::from("a")];
    for x in v {
        println!("{x}");
    }
    println!("{}", v.len());
}` }],
    ["Ce întoarce `iter.find(|x| ...)`? || What does `iter.find(|x| ...)` return?", ["`Option` cu primul element care satisface condiția || An `Option` with the first element matching the predicate", "Un `Vec` cu toate potrivirile || A `Vec` with every match", "`bool`", "Indexul elementului || The element's index"], "Pentru index există `position`. || For the index there's `position`."],
    ["Ce afișează? || What does it print?", ["Some(2)", "Some(31)", "2", "None"], "`position` întoarce indexul primului element > 30, adică 31 la index 2. || `position` returns the index of the first element > 30, i.e. 31 at index 2.", { k: "out", c: c`
fn main() {
    let v = [12, 25, 31, 90];
    println!("{:?}", v.iter().position(|&x| x > 30));
}` }],
    ["Ce afișează? || What does it print?", ["[1, 2, 3, 4]", "[[1, 2], [3, 4]]", "[1, 3]", "10"], "`flatten` (sau `flat_map`) aplatizează iteratori imbricați. || `flatten` (or `flat_map`) flattens nested iterators.", { k: "out", c: c`
fn main() {
    let v = vec![vec![1, 2], vec![3, 4]];
    let f: Vec<i32> = v.into_iter().flatten().collect();
    println!("{:?}", f);
}` }],
    ["Ce afișează? || What does it print?", ["[[1, 2], [3, 4], [5]]", "[[1, 2], [3, 4]]", "[1, 2, 3, 4, 5]", "[[1, 2, 3], [4, 5]]"], "`chunks(2)` împarte un slice în bucăți de câte 2; ultima poate fi mai scurtă. || `chunks(2)` splits a slice into pieces of 2; the last may be shorter.", { k: "out", c: c`
fn main() {
    let v = [1, 2, 3, 4, 5];
    let c: Vec<&[i32]> = v.chunks(2).collect();
    println!("{:?}", c);
}` }],
    ["Ce afișează? || What does it print?", ["[3, 5, 7]", "[1, 2, 3, 4]", "[2, 3, 4]", "[1, 3, 5, 7]"], "`windows(2)` dă ferestre suprapuse: [1,2], [2,3], [3,4]; sumele sunt 3, 5, 7. || `windows(2)` yields overlapping windows: [1,2], [2,3], [3,4]; the sums are 3, 5, 7.", { k: "out", c: c`
fn main() {
    let v = [1, 2, 3, 4];
    let s: Vec<i32> = v.windows(2).map(|w| w[0] + w[1]).collect();
    println!("{:?}", s);
}` }],
    ["De ce sunt iteratorii „zero-cost”? || Why are iterators “zero-cost”?", ["Compilatorul le face inline și le optimizează la cod echivalent cu o buclă scrisă manual || The compiler inlines and optimizes them into code equivalent to a hand-written loop", "Nu alocă niciodată memorie, deci sunt gratuite || They never allocate, so they're free", "Rulează pe GPU || They run on the GPU", "Sunt executate la compilare || They run at compile time"], "Abstracția nu adaugă cost la rulare față de varianta manuală (în build-ul optimizat). || The abstraction adds no runtime cost over the manual version (in an optimized build)."],
    ["Ce afișează? || What does it print?", ["Some(\"b\")", "Some(\"c\")", "Some(\"a\")", "None"], "`last()` consumă iteratorul și întoarce ultimul element. || `last()` consumes the iterator and returns the last element.", { k: "out", c: c`
fn main() {
    println!("{:?}", "a b".split(' ').last());
}` }],
    ["Ce face `.copied()` pe un iterator de `&u32`? || What does `.copied()` do on an iterator of `&u32`?", ["Transformă fiecare `&u32` în `u32` (pentru tipuri `Copy`) || Turns each `&u32` into `u32` (for `Copy` types)", "Clonează tot vectorul || Clones the whole vector", "Dublează elementele || Duplicates the elements", "Nu face nimic || Nothing"], "Pentru tipuri care nu sunt `Copy` folosești `.cloned()`. || For non-`Copy` types you use `.cloned()`."],
    ["Ce afișează? || What does it print?", ["(0, Some(5))", "(3, Some(3))", "(5, Some(5))", "(0, None)"], "`filter` nu poate ști dinainte câte elemente vor trece: limita de jos e 0, cea de sus 5. || `filter` can't know in advance how many elements will pass: the lower bound is 0, the upper bound 5.", { k: "out", c: c`
fn main() {
    let it = (0..5).filter(|x| x % 2 == 0);
    println!("{:?}", it.size_hint());
}` }]
  ]);
})();

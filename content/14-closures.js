(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 11, icon: "🪝", level: 2,
    title: { ro: "Closures", en: "Closures" },
    summary: {
      ro: "Closure-urile sunt funcții anonime care pot captura variabile din jur: <code>|x| x + 1</code>. Înveți cum capturează (prin referință, mutabil sau prin <code>move</code>) și trait-urile <code>Fn</code>, <code>FnMut</code>, <code>FnOnce</code>.",
      en: "Closures are anonymous functions that can capture surrounding variables: <code>|x| x + 1</code>. You learn how they capture (by reference, mutably or with <code>move</code>) and the <code>Fn</code>, <code>FnMut</code>, <code>FnOnce</code> traits."
    },
    sections: [
      { h: { ro: "Sintaxă și captură", en: "Syntax and capture" },
        p: { ro: "Parametrii stau între bare verticale. Tipurile sunt de obicei deduse. Un closure poate folosi variabile din scope-ul în care a fost creat — asta e diferența față de o funcție <code>fn</code>.",
             en: "Parameters go between vertical bars. Types are usually inferred. A closure can use variables from the scope where it was created — that's the difference from an <code>fn</code> function." },
        code: c`
fn main() {
    let prag = 80;
    let peste = |x: u32| x > prag; // capturează prag prin referință
    let dublu = |x| x * 2;
    println!("{} {}", peste(91), peste(10));
    println!("{}", dublu(21));
    let mut v = vec![91, 15, 85];
    v.retain(|&x| x > prag);
    println!("{:?}", v);
}` },
      { h: { ro: "Fn, FnMut, FnOnce", en: "Fn, FnMut, FnOnce" },
        p: { ro: "<code>Fn</code>: doar citește ce a capturat (se poate apela de multe ori). <code>FnMut</code>: modifică ce a capturat. <code>FnOnce</code>: consumă ce a capturat, deci se poate apela o singură dată. Compilatorul alege automat cel mai permisiv trait posibil.",
             en: "<code>Fn</code>: only reads its captures (callable many times). <code>FnMut</code>: mutates its captures. <code>FnOnce</code>: consumes its captures, so it can be called only once. The compiler automatically picks the most permissive trait it can." },
        code: c`
fn de_doua_ori<F: FnMut()>(mut f: F) {
    f();
    f();
}

fn o_data<F: FnOnce() -> String>(f: F) -> String {
    f()
}

fn main() {
    let mut contor = 0;
    de_doua_ori(|| contor += 1); // FnMut
    println!("contor = {contor}");

    let nume = String::from("sesiune");
    let s = o_data(move || nume + "-închisă"); // FnOnce: consumă nume
    println!("{s}");
}` },
      { h: { ro: "move și firele de execuție", en: "move and threads" },
        p: { ro: "<code>move</code> forțează closure-ul să preia proprietatea variabilelor capturate. E obligatoriu la <code>thread::spawn</code>, pentru că firul poate trăi mai mult decât funcția care l-a creat.",
             en: "<code>move</code> forces the closure to take ownership of its captures. It's required with <code>thread::spawn</code>, because the thread may outlive the function that created it." },
        code: c`
use std::thread;

fn main() {
    let hosturi = vec!["r1", "r2"];
    let h = thread::spawn(move || {
        println!("verific {:?}", hosturi);
        hosturi.len()
    });
    println!("rezultat: {}", h.join().unwrap());
}` },
      { h: { ro: "Closures ca parametri și valori de retur", en: "Closures as parameters and return values" },
        p: { ro: "Primești un closure generic cu <code>impl Fn(u32) -&gt; u32</code> sau <code>F: Fn(u32) -&gt; u32</code>. Pentru a întoarce unul: <code>-&gt; impl Fn(u32) -&gt; u32</code> (de obicei cu <code>move</code>). Pentru a ține closure-uri diferite în aceeași colecție: <code>Box&lt;dyn Fn(u32) -&gt; u32&gt;</code>.",
             en: "Accept a closure generically with <code>impl Fn(u32) -&gt; u32</code> or <code>F: Fn(u32) -&gt; u32</code>. To return one: <code>-&gt; impl Fn(u32) -&gt; u32</code> (usually with <code>move</code>). To store different closures in one collection: <code>Box&lt;dyn Fn(u32) -&gt; u32&gt;</code>." },
        code: c`
fn aplica(f: impl Fn(u32) -> u32, x: u32) -> u32 {
    f(x)
}

fn aduna(n: u32) -> impl Fn(u32) -> u32 {
    move |x| x + n
}

fn main() {
    let plus5 = aduna(5);
    println!("{}", aplica(&plus5, 10));
    let pasi: Vec<Box<dyn Fn(u32) -> u32>> = vec![Box::new(|x| x * 2), Box::new(aduna(1))];
    println!("{}", pasi.iter().fold(3, |acc, f| f(acc)));
}` }
    ],
    exercises: [
      { title: { ro: "Filtru configurabil", en: "Configurable filter" },
        task: { ro: "Scrie <code>fn filtru(min: u16) -&gt; impl Fn(&amp;u16) -&gt; bool</code> care întoarce un closure ce acceptă porturi &gt;= min. Rezultat așteptat: <code>[1024, 8080]</code>.", en: "Write <code>fn filtru(min: u16) -&gt; impl Fn(&amp;u16) -&gt; bool</code> returning a closure that accepts ports &gt;= min. Expected: <code>[1024, 8080]</code>." },
        hint: { ro: "<code>move |p| *p &gt;= min</code>", en: "<code>move |p| *p &gt;= min</code>" },
        starter: c`
fn filtru(min: u16) -> impl Fn(&u16) -> bool {
    let _ = min;
    |_p| true // TODO
}

fn main() {
    let v: Vec<u16> = vec![22, 1024, 80, 8080].into_iter().filter(filtru(1024)).collect();
    println!("{:?}", v);
}`,
        solution: c`
fn filtru(min: u16) -> impl Fn(&u16) -> bool {
    move |p| *p >= min
}

fn main() {
    let v: Vec<u16> = vec![22, 1024, 80, 8080].into_iter().filter(filtru(1024)).collect();
    println!("{:?}", v);
}`,
        expect: "[1024, 8080]" }
    ]
  });
  QB("l11", [
    ["Ce este un closure? || What is a closure?", ["O funcție anonimă care poate captura variabile din jur || An anonymous function that can capture surrounding variables", "Un bloc `unsafe` || An `unsafe` block", "Un macro || A macro", "O metodă statică || A static method"], "Sintaxa: `|param| expresie`. || Syntax: `|param| expression`."],
    ["Ce afișează? || What does it print?", ["true false\n42", "false true\n42", "true true\n21", "true false\n21"], "`peste(91)` e `true`, `peste(10)` e `false`, `dublu(21)` e 42. || `peste(91)` is `true`, `peste(10)` is `false`, `dublu(21)` is 42.", { k: "out", c: c`
fn main() {
    let prag = 80;
    let peste = |x: u32| x > prag;
    let dublu = |x| x * 2;
    println!("{} {}", peste(91), peste(10));
    println!("{}", dublu(21));
}` }],
    ["Care trait descrie un closure care modifică variabilele capturate? || Which trait describes a closure that mutates its captures?", ["`FnMut`", "`Fn`", "`FnOnce` doar || only `FnOnce`", "`Mut`"], "`FnMut` cere `&mut self` la apel. || `FnMut` takes `&mut self` when called."],
    ["Care trait descrie un closure care se poate apela o singură dată? || Which trait describes a closure that can be called only once?", ["`FnOnce`", "`Fn`", "`FnMut`", "`Once`"], "Un closure care mută afară o valoare capturată nu se poate apela a doua oară. || A closure that moves a captured value out can't be called again."],
    ["Ce relație există între `Fn`, `FnMut` și `FnOnce`? || How are `Fn`, `FnMut` and `FnOnce` related?", ["Orice `Fn` e și `FnMut`, iar orice `FnMut` e și `FnOnce` || Every `Fn` is also `FnMut`, and every `FnMut` is also `FnOnce`", "Sunt independente || They're independent", "Orice `FnOnce` e și `Fn` || Every `FnOnce` is also `Fn`", "Doar `Fn` poate fi folosit ca parametru || Only `Fn` can be used as a parameter"], "`FnOnce` e supertrait-ul lui `FnMut`, iar `FnMut` al lui `Fn`. || `FnOnce` is the supertrait of `FnMut`, and `FnMut` of `Fn`."],
    ["Ce afișează? || What does it print?", ["contor = 2", "contor = 0", "contor = 1", "nu compilează || doesn't compile"], "Closure-ul e apelat de două ori și incrementează `contor` prin referință mutabilă. || The closure is called twice and increments `contor` through a mutable borrow.", { k: "out", c: c`
fn de_doua_ori<F: FnMut()>(mut f: F) {
    f();
    f();
}
fn main() {
    let mut contor = 0;
    de_doua_ori(|| contor += 1);
    println!("contor = {contor}");
}` }],
    ["Ce face cuvântul `move` în fața unui closure? || What does `move` before a closure do?", ["Closure-ul preia proprietatea variabilelor capturate || The closure takes ownership of the captured variables", "Mută closure-ul pe alt fir || Moves the closure to another thread", "Face closure-ul `FnOnce` mereu || Always makes the closure `FnOnce`", "Copiază tot programul || Copies the whole program"], "`move` schimbă modul de captură, nu trait-ul: un closure `move` care doar citește e tot `Fn`. || `move` changes how captures happen, not the trait: a `move` closure that only reads is still `Fn`."],
    ["De ce cere `thread::spawn` de obicei `move`? || Why does `thread::spawn` usually need `move`?", ["Firul poate trăi mai mult decât funcția, deci nu poate împrumuta variabile locale || The thread may outlive the function, so it can't borrow locals", "Pentru performanță || For performance", "Pentru că firele nu pot citi memorie || Because threads can't read memory", "Nu cere niciodată || It never does"], "`spawn` cere `F: Send + 'static`. Fără `move`, primești E0373. || `spawn` requires `F: Send + 'static`. Without `move` you get E0373."],
    ["Ce eroare dă? || Which error does it give?", ["E0373", "E0382", "E0597", "E0499"], "E0373: closure-ul poate trăi mai mult decât funcția curentă, dar împrumută `v`. Folosește `move`. || E0373: the closure may outlive the current function but borrows `v`. Use `move`.", { k: "err", err: "E0373", c: c`
use std::thread;
fn main() {
    let v = vec![1, 2, 3];
    let h = thread::spawn(|| println!("{:?}", v));
    h.join().unwrap();
}` }],
    ["Ce afișează? || What does it print?", ["15\n7", "15\n8", "10\n7", "15\n6"], "`aduna(5)(10)` = 15. Pașii: 3*2 = 6, apoi 6+1 = 7. || `aduna(5)(10)` = 15. Steps: 3*2 = 6, then 6+1 = 7.", { k: "out", c: c`
fn aplica(f: impl Fn(u32) -> u32, x: u32) -> u32 { f(x) }
fn aduna(n: u32) -> impl Fn(u32) -> u32 { move |x| x + n }
fn main() {
    let plus5 = aduna(5);
    println!("{}", aplica(&plus5, 10));
    let pasi: Vec<Box<dyn Fn(u32) -> u32>> = vec![Box::new(|x| x * 2), Box::new(aduna(1))];
    println!("{}", pasi.iter().fold(3, |acc, f| f(acc)));
}` }],
    ["Ce eroare dă? (closure fără `move` întors dintr-o funcție) || Which error? (closure without `move` returned from a function)", ["E0373", "E0106", "E0308", "E0515"], "Closure-ul ar împrumuta `n`, care dispare la finalul funcției. || The closure would borrow `n`, which disappears at the end of the function.", { k: "err", err: "E0373", c: c`
fn aduna(n: u32) -> impl Fn(u32) -> u32 {
    |x| x + n
}
fn main() {
    println!("{}", aduna(1)(2));
}` }],
    ["Ce eroare primești dacă apelezi de două ori un closure `FnOnce`? || What error do you get if you call an `FnOnce` closure twice?", ["E0382 (use of moved value) || E0382 (use of moved value)", "E0499", "E0373", "Niciuna, merge || None, it works"], "Primul apel consumă closure-ul. || The first call consumes the closure.", { k: "err", err: "E0382", c: c`
fn main() {
    let nume = String::from("x");
    let f = move || nume;
    let a = f();
    let b = f();
    println!("{a}{b}");
}` }],
    ["Ce afișează? || What does it print?", ["[91, 85]", "[15]", "[91, 15, 85]", "[85, 91]"], "`retain` păstrează doar elementele pentru care closure-ul întoarce `true`. || `retain` keeps only the elements for which the closure returns `true`.", { k: "out", c: c`
fn main() {
    let prag = 80;
    let mut v = vec![91, 15, 85];
    v.retain(|&x| x > prag);
    println!("{:?}", v);
}` }],
    ["Fiecare closure are un tip unic, anonim. Ce consecință are? || Each closure has a unique anonymous type. What's the consequence?", ["Două closure-uri diferite nu au același tip, deci pentru colecții folosești `Box<dyn Fn...>` || Two different closures never share a type, so for collections you use `Box<dyn Fn...>`", "Nu pot fi stocate în variabile || They can't be stored in variables", "Nu pot fi apelate de două ori || They can't be called twice", "Nu au niciun cost || They have no cost"], "Chiar dacă au aceeași semnătură, tipurile diferă. || Even with the same signature their types differ."],
    ["Ce eroare dă? || Which error does it give?", ["E0308", "E0277", "E0373", "E0599"], "Ramurile `if` întorc două closure-uri care capturează `k`, cu tipuri diferite (E0308). Soluția: `Box<dyn Fn(i32) -> i32>`. (Closure-urile care nu capturează nimic s-ar converti automat la `fn(i32) -> i32` și ar compila.) || The `if` branches return two closures that capture `k`, with different types (E0308). Fix: `Box<dyn Fn(i32) -> i32>`. (Closures that capture nothing would coerce to `fn(i32) -> i32` and compile.)", { k: "err", err: "E0308", c: c`
fn main() {
    let (dublu, k) = (true, 2);
    let f = if dublu { move |x: i32| x * k } else { move |x: i32| x + k };
    println!("{}", f(3));
}` }],
    ["Un `fn` obișnuit poate fi trimis unde se așteaptă `impl Fn(u32) -> u32`? || Can a plain `fn` be passed where `impl Fn(u32) -> u32` is expected?", ["Da, funcțiile implementează trait-urile `Fn*` || Yes, functions implement the `Fn*` traits", "Nu, doar closure-uri || No, only closures", "Doar cu `unsafe` || Only with `unsafe`", "Doar dacă e `pub` || Only if it's `pub`"], "De exemplu `v.iter().map(u32::to_string)`. || For example `v.iter().map(u32::to_string)`."],
    ["Ce afișează? || What does it print?", ["[\"1\", \"2\"]", "[1, 2]", "\"12\"", "nu compilează || doesn't compile"], "`ToString::to_string` e folosit direct ca funcție. || `ToString::to_string` is used directly as a function.", { k: "out", c: c`
fn main() {
    let v: Vec<String> = [1, 2].iter().map(ToString::to_string).collect();
    println!("{:?}", v);
}` }],
    ["Ce afișează? || What does it print?", ["sesiune-închisă", "sesiune", "-închisă", "nu compilează || doesn't compile"], "Closure-ul `move` consumă `nume` și întoarce un `String` nou. || The `move` closure consumes `nume` and returns a new `String`.", { k: "out", c: c`
fn o_data<F: FnOnce() -> String>(f: F) -> String { f() }
fn main() {
    let nume = String::from("sesiune");
    println!("{}", o_data(move || nume + "-închisă"));
}` }],
    ["Când e mai potrivit `Box<dyn Fn()>` decât un generic `F: Fn()`? || When is `Box<dyn Fn()>` a better fit than a generic `F: Fn()`?", ["Când ții closure-uri diferite în aceeași colecție sau struct, ales la rulare || When you store different closures in the same collection or struct, chosen at runtime", "Mereu, e mai rapid || Always, it's faster", "Niciodată || Never", "Doar pentru funcții fără parametri || Only for functions without parameters"], "Genericul e rezolvat la compilare și se poate face inline; `dyn` costă o alocare și o indirecție. || The generic is resolved at compile time and can be inlined; `dyn` costs an allocation and an indirection."],
    ["Ce afișează? || What does it print?", ["6", "5", "3", "0"], "`sort_by_key` sortează după lungimea textului; `len()` pentru „switch” e 6. || `sort_by_key` sorts by text length; `len()` of “switch” is 6.", { k: "out", c: c`
fn main() {
    let mut v = vec!["switch", "ap", "fw"];
    v.sort_by_key(|s| s.len());
    println!("{}", v.last().unwrap().len());
}` }],
    ["Ce face `unwrap_or_else(|| ...)` față de `unwrap_or(...)`? || What does `unwrap_or_else(|| ...)` do compared with `unwrap_or(...)`?", ["Calculează valoarea implicită doar dacă e nevoie (leneș) || Computes the default only if needed (lazily)", "Dă panic || Panics", "E identic || It's identical", "Ignoră erorile || Ignores errors"], "Argumentul lui `unwrap_or` se evaluează mereu; closure-ul doar când e `None`/`Err`. || `unwrap_or`'s argument is always evaluated; the closure only on `None`/`Err`."]
  ]);
})();

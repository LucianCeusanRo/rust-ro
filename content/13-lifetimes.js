(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 10, icon: "⏳", level: 3,
    title: { ro: "Lifetimes (durate de viață)", en: "Lifetimes" },
    summary: {
      ro: "Lifetime-urile spun compilatorului cât timp trebuie să rămână validă o referință. Nu schimbă cât trăiește o valoare — doar descriu relații între referințe, ca borrow checker-ul să poată dovedi că nu există referințe atârnate.",
      en: "Lifetimes tell the compiler how long a reference must stay valid. They don't change how long a value lives — they only describe relationships between references, so the borrow checker can prove there are no dangling references."
    },
    sections: [
      { h: { ro: "Problema: referința atârnată", en: "The problem: a dangling reference" },
        p: { ro: "Dacă o referință ar trăi mai mult decât valoarea la care arată, ar indica spre memorie eliberată. Rust respinge asta la compilare: în exemplul de mai jos <code>x</code> e eliberat la finalul blocului, dar <code>r</code> e folosit după (E0597).",
             en: "If a reference outlived the value it points to, it would point into freed memory. Rust rejects that at compile time: below, <code>x</code> is dropped at the end of the block but <code>r</code> is used afterwards (E0597)." },
        code: c`
fn main() {
    let r;
    {
        let x = 5;
        r = &x;
    }
    println!("{r}");
}`, fails: "E0597" },
      { h: { ro: "Adnotări explicite: 'a", en: "Explicit annotations: 'a" },
        p: { ro: "<code>fn mai_lung&lt;'a&gt;(a: &amp;'a str, b: &amp;'a str) -&gt; &amp;'a str</code> spune: „rezultatul trăiește cel mult cât cea mai scurtă dintre cele două intrări”. Fără adnotare, compilatorul nu știe de care parametru depinde rezultatul (E0106).",
             en: "<code>fn mai_lung&lt;'a&gt;(a: &amp;'a str, b: &amp;'a str) -&gt; &amp;'a str</code> says: “the result lives at most as long as the shorter of the two inputs”. Without the annotation the compiler doesn't know which parameter the result depends on (E0106)." },
        code: c`
fn mai_lung<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let h1 = String::from("router-core-01");
    let rez;
    {
        let h2 = String::from("sw1");
        rez = mai_lung(&h1, &h2);
        println!("{rez}");
    }
}` },
      { h: { ro: "Regulile de eliziune", en: "The elision rules" },
        p: { ro: "De cele mai multe ori nu scrii lifetime-uri: (1) fiecare referință de intrare primește propriul lifetime; (2) dacă există exact un lifetime de intrare, el e dat ieșirii; (3) dacă există <code>&amp;self</code> sau <code>&amp;mut self</code>, ieșirea primește lifetime-ul lui <code>self</code>.",
             en: "Most of the time you don't write lifetimes: (1) each input reference gets its own lifetime; (2) if there is exactly one input lifetime, it is assigned to the output; (3) if there is <code>&amp;self</code> or <code>&amp;mut self</code>, the output gets <code>self</code>'s lifetime." },
        code: c`
struct Config { nume: String }

impl Config {
    fn nume(&self) -> &str { // regula 3: ieșirea trăiește cât self
        &self.nume
    }
}

fn primul(s: &str) -> &str { // regula 2: un singur lifetime de intrare
    s.split(' ').next().unwrap_or("")
}

fn main() {
    let c = Config { nume: "edge".to_string() };
    println!("{} {}", c.nume(), primul("GET /index.html"));
}` },
      { h: { ro: "Struct-uri care țin referințe și 'static", en: "Structs holding references, and 'static" },
        p: { ro: "Un struct care ține o referință trebuie să declare lifetime-ul: <code>struct Linie&lt;'a&gt; { text: &amp;'a str }</code>. Asta garantează că struct-ul nu trăiește mai mult decât textul. <code>'static</code> înseamnă „valabil pe toată durata programului”, de exemplu literalii de text.",
             en: "A struct holding a reference must declare the lifetime: <code>struct Linie&lt;'a&gt; { text: &amp;'a str }</code>. That guarantees the struct doesn't outlive the text. <code>'static</code> means “valid for the whole program”, e.g. string literals." },
        code: c`
#[derive(Debug)]
struct Linie<'a> {
    nivel: &'a str,
    mesaj: &'a str,
}

fn parseaza(l: &str) -> Option<Linie<'_>> {
    let (nivel, mesaj) = l.split_once(' ')?;
    Some(Linie { nivel, mesaj })
}

const VERSIUNE: &'static str = "1.0";

fn main() {
    let log = String::from("ERROR link down");
    println!("{:?}", parseaza(&log));
    println!("v{VERSIUNE}");
}` }
    ],
    exercises: [
      { title: { ro: "Repară semnătura", en: "Fix the signature" },
        task: { ro: "Codul nu compilează (E0106): <code>ultimul</code> întoarce o referință, dar are doi parametri-referință. Adaugă un lifetime <code>'a</code> legat de <code>linii</code> (al doilea parametru, <code>implicit</code>, e tot <code>&amp;'a str</code>). Rezultat așteptat: <code>c</code> și <code>-</code>.",
                en: "The code doesn't compile (E0106): <code>ultimul</code> returns a reference but has two reference parameters. Add a lifetime <code>'a</code> tied to <code>linii</code> (the second parameter, <code>implicit</code> (default), is also <code>&amp;'a str</code>). Expected: <code>c</code> and <code>-</code>." },
        hint: { ro: "<code>fn ultimul&lt;'a&gt;(linii: &amp;'a [&amp;'a str], implicit: &amp;'a str) -&gt; &amp;'a str</code>", en: "<code>fn ultimul&lt;'a&gt;(linii: &amp;'a [&amp;'a str], implicit: &amp;'a str) -&gt; &amp;'a str</code>" },
        starter: c`
fn ultimul(linii: &[&str], implicit: &str) -> &str {
    linii.last().copied().unwrap_or(implicit)
}

fn main() {
    println!("{}", ultimul(&["a", "b", "c"], "-"));
    println!("{}", ultimul(&[], "-"));
}`, starterFails: "E0106",
        solution: c`
fn ultimul<'a>(linii: &'a [&'a str], implicit: &'a str) -> &'a str {
    linii.last().copied().unwrap_or(implicit)
}

fn main() {
    println!("{}", ultimul(&["a", "b", "c"], "-"));
    println!("{}", ultimul(&[], "-"));
}`,
        expect: "c\n-" }
    ]
  });
  QB("l10", [
    ["Ce descrie un lifetime? || What does a lifetime describe?", ["Cât timp trebuie să rămână validă o referință || How long a reference must remain valid", "Cât trăiește o valoare pe heap, controlat de programator || How long a heap value lives, controlled by the programmer", "Timpul de execuție al unei funcții || A function's execution time", "Durata unui fir de execuție || A thread's duration"], "Adnotările nu prelungesc viața nimănui; doar leagă referințele între ele, ca verificatorul să le poată valida. || Annotations don't extend anyone's life; they only relate references so the checker can validate them."],
    ["Ce eroare dă? || Which error does it give?", ["E0597", "E0106", "E0382", "E0499"], "E0597: `x` nu trăiește suficient (`x` does not live long enough). || E0597: `x` does not live long enough.", { k: "err", err: "E0597", c: c`
fn main() {
    let r;
    {
        let x = 5;
        r = &x;
    }
    println!("{r}");
}` }],
    ["Ce eroare dă? || Which error does it give?", ["E0106", "E0597", "E0621", "E0308"], "E0106: lipsește specificatorul de lifetime: rezultatul ar putea veni din `a` sau din `b`. || E0106: missing lifetime specifier: the result could come from `a` or `b`.", { k: "err", err: "E0106", c: c`
fn mai_lung(a: &str, b: &str) -> &str {
    if a.len() > b.len() { a } else { b }
}
fn main() {}` }],
    ["Ce înseamnă `fn f<'a>(a: &'a str, b: &'a str) -> &'a str`? || What does `fn f<'a>(a: &'a str, b: &'a str) -> &'a str` mean?", ["Rezultatul e valid cel mult cât cea mai scurtă dintre referințele `a` și `b` || The result is valid at most as long as the shorter of `a` and `b`", "Rezultatul trăiește pentru totdeauna || The result lives forever", "`a` și `b` trebuie să fie același string || `a` and `b` must be the same string", "Funcția copiază textul || The function copies the text"], "Compilatorul alege pentru `'a` intersecția duratelor de viață ale argumentelor. || The compiler picks for `'a` the intersection of the arguments' lifetimes."],
    ["Ce afișează? || What does it print?", ["router-core-01", "sw1", "nu compilează || doesn't compile", "router"], "Ambele referințe sunt valide la `println!`, deci codul compilează. || Both references are valid at the `println!`, so it compiles.", { k: "out", c: c`
fn mai_lung<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
fn main() {
    let h1 = String::from("router-core-01");
    {
        let h2 = String::from("sw1");
        let rez = mai_lung(&h1, &h2);
        println!("{rez}");
    }
}` }],
    ["Ce eroare dă? (rezultatul e folosit după ce `h2` a fost eliberat) || Which error? (the result is used after `h2` is dropped)", ["E0597", "E0106", "E0505", "E0716"], "`rez` e legat de lifetime-ul lui `h2`, care se termină la `}`. || `rez` is tied to `h2`'s lifetime, which ends at `}`.", { k: "err", err: "E0597", c: c`
fn mai_lung<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
fn main() {
    let h1 = String::from("router-core-01");
    let rez;
    {
        let h2 = String::from("sw1");
        rez = mai_lung(&h1, &h2);
    }
    println!("{rez}");
}` }],
    ["Câte reguli de eliziune a lifetime-urilor există pentru funcții? || How many lifetime elision rules are there for functions?", ["3", "1", "2", "5"], "Fiecare intrare primește un lifetime; un singur lifetime de intrare trece la ieșire; `&self` dă lifetime-ul ieșirii. || Each input gets a lifetime; a single input lifetime goes to the output; `&self` gives the output lifetime."],
    ["De ce compilează `fn primul(s: &str) -> &str` fără `'a`? || Why does `fn primul(s: &str) -> &str` compile without `'a`?", ["Există un singur lifetime de intrare, deci e atribuit automat ieșirii || There's exactly one input lifetime, so it's assigned to the output", "Pentru că `&str` e mereu `'static` || Because `&str` is always `'static`", "Pentru că funcția e mică || Because the function is small", "Pentru că nu are `mut` || Because it has no `mut`"], "Regula 2 de eliziune. || Elision rule 2."],
    ["Ce înseamnă `'static`? || What does `'static` mean?", ["Referința poate fi validă pe toată durata programului || The reference can be valid for the entire program", "Variabila e pe stack || The variable is on the stack", "Valoarea nu se poate modifica || The value can't change", "Variabila e globală și mutabilă || The variable is global and mutable"], "Literalii de text sunt `&'static str`: sunt incluși în binar. || String literals are `&'static str`: they live in the binary."],
    ["Ce tip are literalul `\"salut\"`? || What type does the literal `\"salut\"` have?", ["`&'static str`", "`String`", "`&'a String`", "`str`"], "Literalii sunt stocați în binar și împrumutați pentru toată durata programului. || Literals are stored in the binary and borrowed for the whole program."],
    ["De ce are nevoie `struct Linie<'a> { text: &'a str }` de `'a`? || Why does `struct Linie<'a> { text: &'a str }` need `'a`?", ["Ca să garanteze că struct-ul nu trăiește mai mult decât textul împrumutat || To guarantee the struct doesn't outlive the borrowed text", "Pentru că toate struct-urile au nevoie de lifetime || Because every struct needs a lifetime", "Ca să poată fi `Copy` || So it can be `Copy`", "Ca să fie mai rapid || To make it faster"], "Orice referință într-un struct trebuie să aibă un lifetime declarat (altfel E0106). || Every reference in a struct must have a declared lifetime (otherwise E0106)."],
    ["Ce eroare dă? || Which error does it give?", ["E0106", "E0597", "E0277", "E0308"], "Câmpul referință nu are lifetime. || The reference field has no lifetime.", { k: "err", err: "E0106", c: c`
struct Linie {
    text: &str,
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["Some(Linie { nivel: \"ERROR\", mesaj: \"link down\" })", "Linie { nivel: \"ERROR\", mesaj: \"link down\" }", "Some(\"ERROR link down\")", "None"], "`split_once(' ')` împarte la primul spațiu și întoarce `Option<(&str, &str)>`. || `split_once(' ')` splits at the first space and returns `Option<(&str, &str)>`.", { k: "out", c: c`
#[derive(Debug)]
struct Linie<'a> { nivel: &'a str, mesaj: &'a str }
fn parseaza(l: &str) -> Option<Linie<'_>> {
    let (nivel, mesaj) = l.split_once(' ')?;
    Some(Linie { nivel, mesaj })
}
fn main() {
    println!("{:?}", parseaza("ERROR link down"));
}` }],
    ["Ce înseamnă `'_` în `Option<Linie<'_>>`? || What does `'_` mean in `Option<Linie<'_>>`?", ["Lifetime anonim, dedus prin regulile de eliziune || An anonymous lifetime, inferred by the elision rules", "Un lifetime `'static` || A `'static` lifetime", "Lipsa unui lifetime || No lifetime at all", "Un wildcard pentru orice tip || A wildcard for any type"], "Îl folosești ca să arăți că tipul împrumută ceva, fără să dai un nume lifetime-ului. || You use it to show the type borrows something without naming the lifetime."],
    ["Ce face borrow checker-ul cu lifetime-urile la rulare? || What does the borrow checker do with lifetimes at runtime?", ["Nimic — totul se verifică la compilare, fără cost la rulare || Nothing — everything is checked at compile time, with no runtime cost", "Numără referințele || Counts references", "Pornește un garbage collector || Runs a garbage collector", "Verifică pointerii la fiecare acces || Checks pointers on every access"], "Lifetime-urile dispar complet din binar. || Lifetimes disappear completely from the binary."],
    ["Ce eroare dă? || Which error does it give?", ["E0515", "E0106", "E0597", "E0382"], "E0515: nu poți întoarce o referință la o variabilă locală (`s` e eliberat la finalul funcției). Întoarce `String`. || E0515: you can't return a reference to a local variable (`s` is dropped at the end of the function). Return `String`.", { k: "err", err: "E0515", c: c`
fn creeaza() -> &'static str {
    let s = String::from("temp");
    &s
}
fn main() {
    println!("{}", creeaza());
}` }],
    ["Cum repari o funcție care vrea să întoarcă o referință la un `String` creat în interior? || How do you fix a function that wants to return a reference to a `String` it created?", ["Întorci `String` (proprietate), nu `&str` || Return `String` (ownership), not `&str`", "Adaugi `'static` || Add `'static`", "Folosești `unsafe` || Use `unsafe`", "Pui `mut` || Add `mut`"], "Valoarea locală dispare la finalul funcției; mută proprietatea către apelant. || The local value disappears at the end of the function; move ownership to the caller."],
    ["Ce eroare dă? (`&mut self` și o referință ținută) || Which error? (`&mut self` while a reference is held)", ["E0502", "E0499", "E0597", "E0506"], "`n` împrumută `c` imutabil, apoi `schimba` cere `&mut c` cât timp `n` e încă folosit. || `n` borrows `c` immutably, then `schimba` needs `&mut c` while `n` is still used.", { k: "err", err: "E0502", c: c`
struct C { nume: String }
impl C {
    fn nume(&self) -> &str { &self.nume }
    fn schimba(&mut self) { self.nume.push('!'); }
}
fn main() {
    let mut c = C { nume: "a".into() };
    let n = c.nume();
    c.schimba();
    println!("{n}");
}` }],
    ["Ce afișează? || What does it print?", ["edge GET", "edge GET /index.html", "Config GET", "nu compilează || doesn't compile"], "Ambele funcții folosesc eliziunea (regulile 2 și 3). || Both functions rely on elision (rules 2 and 3).", { k: "out", c: c`
struct Config { nume: String }
impl Config {
    fn nume(&self) -> &str { &self.nume }
}
fn primul(s: &str) -> &str {
    s.split(' ').next().unwrap_or("")
}
fn main() {
    let c = Config { nume: "edge".to_string() };
    println!("{} {}", c.nume(), primul("GET /index.html"));
}` }],
    ["Ce înseamnă `T: 'static` într-un bound (de ex. la `thread::spawn`)? || What does `T: 'static` mean in a bound (e.g. on `thread::spawn`)?", ["`T` nu conține referințe care ar putea expira (poate fi un tip deținut, ca `String`) || `T` contains no references that could expire (it may be an owned type like `String`)", "`T` trebuie să fie o constantă globală || `T` must be a global constant", "`T` trăiește pe stack || `T` lives on the stack", "`T` e imutabil || `T` is immutable"], "Un `String` deținut satisface `'static`; un `&str` temporar nu. || An owned `String` satisfies `'static`; a temporary `&str` doesn't."],
    ["NLL (non-lexical lifetimes) înseamnă că... || NLL (non-lexical lifetimes) means that...", ["un împrumut se termină după ultima folosire, nu la sfârșitul blocului || a borrow ends after its last use, not at the end of the block", "nu mai există lifetime-uri || lifetimes no longer exist", "referințele trăiesc mereu până la `}` || references always live until `}`", "lifetime-urile sunt verificate la rulare || lifetimes are checked at runtime"], "De aceea codul cu `&mut` creat după ultima folosire a unui `&` compilează. || That's why code creating a `&mut` after the last use of a `&` compiles."],
    ["Ce afișează? || What does it print?", ["[1, 2, 3, 4] 1", "nu compilează || doesn't compile", "[1, 2, 3] 1", "1 [1, 2, 3, 4]"], "Datorită NLL, împrumutul `p` se termină înainte de `push`, deci codul compilează. Valoarea 1 a fost copiată în `x`. || Thanks to NLL the borrow `p` ends before the `push`, so it compiles. The value 1 was copied into `x`.", { k: "out", c: c`
fn main() {
    let mut v = vec![1, 2, 3];
    let p = &v[0];
    let x = *p;
    v.push(4);
    println!("{:?} {}", v, x);
}` }]
  ]);
})();

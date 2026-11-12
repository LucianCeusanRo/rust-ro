(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 4,
    icon: "🔐",
    title: { ro: "Ownership și borrowing", en: "Ownership & borrowing" },
    summary: {
      ro: "Ideea centrală din Rust: fiecare valoare are un singur proprietar, iar referințele respectă reguli verificate la compilare.",
      en: "Rust's central idea: every value has a single owner and references follow rules checked at compile time."
    },
    sections: [
      {
        h: { ro: "Cele trei reguli", en: "The three rules" },
        p: {
          ro: "1) Fiecare valoare are un <b>proprietar</b> (o variabilă). 2) Există un singur proprietar la un moment dat. 3) Când proprietarul iese din scope, valoarea este eliberată automat (<i>drop</i>). Așa eliberează Rust memoria fără garbage collector.",
          en: "1) Every value has an <b>owner</b> (a variable). 2) There is only one owner at a time. 3) When the owner goes out of scope the value is freed automatically (<i>drop</i>). That is how Rust frees memory without a garbage collector."
        },
        code: c`
fn main() {
    {
        let s = String::from("sesiune");
        println!("în scope: {s}");
    } // aici s iese din scope => memoria e eliberată
    println!("după bloc / after the block");
}`
      },
      {
        h: { ro: "Move: proprietarul se schimbă", en: "Move: the owner changes" },
        p: {
          ro: "Un <code>String</code> își ține textul pe heap. La <code>let b = a;</code> proprietatea se <b>mută</b> în <code>b</code>, iar <code>a</code> nu mai poate fi folosit. Codul de mai jos dă intenționat eroarea E0382 („borrow of moved value”).",
          en: "A <code>String</code> keeps its text on the heap. With <code>let b = a;</code> ownership <b>moves</b> to <code>b</code> and <code>a</code> can no longer be used. The code below intentionally triggers error E0382 (“borrow of moved value”)."
        },
        code: c`
fn main() {
    let a = String::from("config");
    let b = a;           // a s-a mutat în b
    println!("{a} {b}"); // eroare: a nu mai e valid
}`,
        fails: "E0382"
      },
      {
        h: { ro: "Copy și clone", en: "Copy and clone" },
        p: {
          ro: "Tipurile mici de pe stack (întregi, <code>f64</code>, <code>bool</code>, <code>char</code>, tupluri din acestea) sunt <code>Copy</code>: se copiază, nu se mută. Pentru datele de pe heap ceri explicit o copie cu <code>.clone()</code>, care costă memorie și timp.",
          en: "Small stack types (integers, <code>f64</code>, <code>bool</code>, <code>char</code>, tuples of these) are <code>Copy</code>: they are copied, not moved. For heap data you explicitly ask for a copy with <code>.clone()</code>, which costs memory and time."
        },
        code: c`
fn main() {
    let x = 5;
    let y = x;             // Copy: ambele valide
    println!("{x} {y}");

    let a = String::from("config");
    let b = a.clone();     // copie adâncă / deep copy
    println!("{a} {b}");
}`
      },
      {
        h: { ro: "Referințe: împrumuți fără să muți", en: "References: borrow without moving" },
        p: {
          ro: "<code>&amp;T</code> este o referință (împrumut) care doar citește. <code>&amp;mut T</code> permite modificarea. Regula: în orice moment poți avea <b>oricâte</b> referințe <code>&amp;</code> <b>SAU</b> <b>una singură</b> <code>&amp;mut</code>. Așa dispar data races încă de la compilare.",
          en: "<code>&amp;T</code> is a read-only reference (borrow). <code>&amp;mut T</code> allows modification. The rule: at any moment you can have <b>any number</b> of <code>&amp;</code> references <b>OR</b> <b>exactly one</b> <code>&amp;mut</code>. That removes data races at compile time."
        },
        code: c`
fn lungime(s: &str) -> usize {
    s.len() // doar citește / read only
}

fn adauga_sufix(s: &mut String) {
    s.push_str(".local");
}

fn main() {
    let mut host = String::from("router1");
    println!("lungime = {}", lungime(&host));
    adauga_sufix(&mut host);
    println!("host = {host}");
}`
      },
      {
        h: { ro: "Două &mut simultan = eroare", en: "Two &mut at once = error" },
        p: {
          ro: "Exemplul de mai jos ține două referințe mutabile active în același timp și primește intenționat E0499. Soluția: termină de folosit prima referință înainte s-o creezi pe a doua.",
          en: "The example below keeps two mutable references alive at the same time and intentionally gets E0499. Fix: finish using the first reference before creating the second."
        },
        code: c`
fn main() {
    let mut s = String::from("vlan");
    let r1 = &mut s;
    let r2 = &mut s;
    r1.push('1');
    r2.push('2');
    println!("{s}");
}`,
        fails: "E0499"
      },
      {
        h: { ro: "Slice-uri: &str și &[T]", en: "Slices: &str and &[T]" },
        p: {
          ro: "Un slice e o referință către o parte dintr-o colecție. <code>&amp;str</code> este un slice de text — la parametri preferă <code>&amp;str</code> în loc de <code>&amp;String</code>, pentru că acceptă și literali și <code>String</code>-uri.",
          en: "A slice is a reference to part of a collection. <code>&amp;str</code> is a string slice — for parameters prefer <code>&amp;str</code> over <code>&amp;String</code>, because it accepts both literals and <code>String</code>s."
        },
        code: c`
fn primul_cuvant(s: &str) -> &str {
    match s.find(' ') {
        Some(i) => &s[..i],
        None => s,
    }
}

fn main() {
    let linie = String::from("ERROR link down");
    println!("{}", primul_cuvant(&linie));
    println!("{}", primul_cuvant("INFO"));

    let porturi = [22, 80, 443, 8080];
    let primele: &[i32] = &porturi[..2];
    println!("{:?}", primele);
}`
      }
    ],
    exercises: [
      {
        title: { ro: "Repară move-ul", en: "Fix the move" },
        task: {
          ro: "Codul de pornire <b>nu compilează</b> (E0382): <code>afiseaza</code> preia <code>String</code>-ul, apoi încercăm să-l folosim din nou. Schimbă funcția astfel încât să împrumute (<code>&amp;str</code>).",
          en: "The starter code <b>does not compile</b> (E0382): <code>afiseaza</code> (show) takes the <code>String</code>, then we try to use it again. Change the function so it borrows (<code>&amp;str</code>)."
        },
        hint: { ro: "Semnătura: <code>fn afiseaza(s: &amp;str)</code>, iar apelul: <code>afiseaza(&amp;nume)</code>.", en: "Signature: <code>fn afiseaza(s: &amp;str)</code>, and the call: <code>afiseaza(&amp;nume)</code>." },
        starter: c`
fn afiseaza(s: String) {
    println!("> {s}");
}

fn main() {
    let nume = String::from("switch-core");
    afiseaza(nume);
    afiseaza(nume);
}`,
        starterFails: "E0382",
        solution: c`
fn afiseaza(s: &str) {
    println!("> {s}");
}

fn main() {
    let nume = String::from("switch-core");
    afiseaza(&nume);
    afiseaza(&nume);
}`
      },
      {
        title: { ro: "Modifică prin &mut", en: "Modify through &mut" },
        task: {
          ro: "Scrie <code>fn normalizeaza(s: &amp;mut String)</code> care transformă textul în litere mici și adaugă <code>!</code> la final.",
          en: "Write <code>fn normalizeaza(s: &amp;mut String)</code> (normalize) that lowercases the text and appends <code>!</code>."
        },
        hint: { ro: "<code>*s = s.to_lowercase();</code> apoi <code>s.push('!');</code>", en: "<code>*s = s.to_lowercase();</code> then <code>s.push('!');</code>" },
        starter: c`
fn normalizeaza(s: &mut String) {
    // TODO
    let _ = s;
}

fn main() {
    let mut alarma = String::from("LINK DOWN");
    normalizeaza(&mut alarma);
    println!("{alarma}");
}`,
        solution: c`
fn normalizeaza(s: &mut String) {
    *s = s.to_lowercase();
    s.push('!');
}

fn main() {
    let mut alarma = String::from("LINK DOWN");
    normalizeaza(&mut alarma);
    println!("{alarma}"); // link down!
}`
      }
    ],
    quiz: [
      { q: { ro: "După <code>let b = a;</code> (<code>a</code> fiind <code>String</code>), ce se întâmplă cu <code>a</code>?", en: "After <code>let b = a;</code> (<code>a</code> is a <code>String</code>), what happens to <code>a</code>?" },
        o: { ro: ["Rămâne o copie validă", "S-a mutat; nu mai poate fi folosit", "Devine referință la b", "Devine gol (\"\")"], en: ["It stays a valid copy", "It was moved and can't be used", "It becomes a reference to b", "It becomes empty (\"\")"] },
        a: 1, e: { ro: "<code>String</code> nu este <code>Copy</code>, deci proprietatea se mută. Dacă folosești <code>a</code> după, primești E0382.", en: "<code>String</code> is not <code>Copy</code>, so ownership moves. Using <code>a</code> afterwards gives E0382." } },
      { q: { ro: "Care tip este <code>Copy</code>?", en: "Which type is <code>Copy</code>?" },
        o: { ro: ["String", "Vec&lt;i32&gt;", "i32", "Box&lt;i32&gt;"], en: ["String", "Vec&lt;i32&gt;", "i32", "Box&lt;i32&gt;"] },
        a: 2, e: { ro: "Întregii sunt mici și stau pe stack, deci se copiază bit cu bit. Celelalte dețin memorie pe heap.", en: "Integers are small stack values copied bit by bit. The others own heap memory." } },
      { q: { ro: "Care e regula de borrowing?", en: "What is the borrowing rule?" },
        o: { ro: ["Oricâte &amp;mut", "Oricâte &amp; SAU o singură &amp;mut", "Exact o &amp; și o &amp;mut", "Nicio regulă, totul se verifică la rulare"], en: ["Any number of &amp;mut", "Any number of &amp; OR exactly one &amp;mut", "Exactly one &amp; and one &amp;mut", "No rule, everything is checked at runtime"] },
        a: 1, e: { ro: "Mai mulți cititori sau un singur scriitor — niciodată ambele simultan.", en: "Many readers or one writer — never both at the same time." } },
      { q: { ro: "Când este eliberată memoria unui <code>String</code>?", en: "When is a <code>String</code>'s memory freed?" },
        o: { ro: ["Când rulează garbage collector-ul", "Când proprietarul iese din scope", "Doar la finalul programului", "Doar dacă apelezi free()"], en: ["When the garbage collector runs", "When the owner goes out of scope", "Only at program exit", "Only if you call free()"] },
        a: 1, e: { ro: "La finalul scope-ului proprietarului se apelează automat <code>drop</code>.", en: "At the end of the owner's scope <code>drop</code> is called automatically." } },
      { q: { ro: "Ce este <code>&amp;str</code>?", en: "What is <code>&amp;str</code>?" },
        o: { ro: ["Un String deținut, pe heap", "Un slice de text împrumutat", "Un pointer nul", "Un char"], en: ["An owned heap String", "A borrowed string slice", "A null pointer", "A char"] },
        a: 1, e: { ro: "<code>&amp;str</code> e o referință la text UTF-8 (dintr-un literal sau dintr-un <code>String</code>).", en: "<code>&amp;str</code> is a reference to UTF-8 text (from a literal or from a <code>String</code>)." } },
      { q: { ro: "Ce face <code>.clone()</code> pe un <code>String</code>?", en: "What does <code>.clone()</code> do on a <code>String</code>?" },
        o: { ro: ["Creează o referință", "Copiază datele de pe heap într-un String nou", "Mută valoarea", "Nimic, e doar un alias"], en: ["Creates a reference", "Copies the heap data into a new String", "Moves the value", "Nothing, it's just an alias"] },
        a: 1, e: { ro: "Clone face o copie adâncă: o alocare nouă cu același conținut. Ambele variabile rămân valide.", en: "Clone makes a deep copy: a new allocation with the same contents. Both variables stay valid." } },
      { q: { ro: "Ce se întâmplă când trimiți un <code>String</code> la <code>fn f(s: String)</code>?", en: "What happens when you pass a <code>String</code> to <code>fn f(s: String)</code>?" },
        o: { ro: ["Funcția primește o copie", "Proprietatea se mută în funcție", "Se transmite automat ca &amp;", "E mereu eroare"], en: ["The function gets a copy", "Ownership moves into the function", "It is passed as &amp; automatically", "It's always an error"] },
        a: 1, e: { ro: "Parametrul devine noul proprietar; la finalul funcției valoarea e eliberată, dacă nu e returnată.", en: "The parameter becomes the new owner; at the end of the function the value is dropped unless it is returned." } },
      { q: { ro: "Cum previne Rust referințele „atârnate” (dangling)?", en: "How does Rust prevent dangling references?" },
        o: { ro: ["Cu un garbage collector", "Borrow checker-ul verifică la compilare că nicio referință nu trăiește mai mult decât datele", "Le transformă în null", "Nu le previne"], en: ["With a garbage collector", "The borrow checker verifies at compile time that no reference outlives its data", "It turns them into null", "It doesn't"] },
        a: 1, e: { ro: "Analiza duratelor de viață (lifetimes) respinge codul care ar returna o referință la o valoare deja eliberată.", en: "Lifetime analysis rejects code that would return a reference to an already freed value." } }
    ]
  });
})();

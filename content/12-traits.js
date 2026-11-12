(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 9, icon: "🧩", level: 2,
    title: { ro: "Trait-uri", en: "Traits" },
    summary: {
      ro: "Un trait descrie un comportament comun (ca o interfață). Înveți să definești și să implementezi trait-uri, metodele implicite, <code>derive</code>, trait-urile standard (<code>Display</code>, <code>From</code>, <code>Default</code>) și obiectele <code>dyn Trait</code>.",
      en: "A trait describes shared behaviour (like an interface). You learn to define and implement traits, default methods, <code>derive</code>, standard traits (<code>Display</code>, <code>From</code>, <code>Default</code>) and <code>dyn Trait</code> objects."
    },
    sections: [
      { h: { ro: "Definire și implementare", en: "Defining and implementing" },
        p: { ro: "<code>trait Descriere { fn descrie(&amp;self) -&gt; String; }</code> declară o metodă. Fiecare tip o implementează cu <code>impl Descriere for Tip</code>. Un trait poate avea și <b>metode implicite</b>, cu corp, pe care tipurile le pot suprascrie.",
             en: "<code>trait Descriere { fn descrie(&amp;self) -&gt; String; }</code> declares a method. Each type implements it with <code>impl Descriere for Type</code>. A trait can also have <b>default methods</b>, with a body, that types may override." },
        code: c`
trait Descriere {
    fn nume(&self) -> String;
    fn descrie(&self) -> String {
        format!("echipament: {}", self.nume()) // metodă implicită
    }
}

struct Router { host: String }
struct Switch { porturi: u8 }

impl Descriere for Router {
    fn nume(&self) -> String { self.host.clone() }
}
impl Descriere for Switch {
    fn nume(&self) -> String { format!("switch {}p", self.porturi) }
    fn descrie(&self) -> String { format!("L2: {}", self.nume()) }
}

fn main() {
    let r = Router { host: "r1".into() };
    let s = Switch { porturi: 24 };
    println!("{}", r.descrie());
    println!("{}", s.descrie());
}` },
      { h: { ro: "derive și trait-urile standard", en: "derive and the standard traits" },
        p: { ro: "<code>#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]</code> generează automat implementări. <code>Display</code> nu se poate deriva: îl scrii tu, și primești gratis <code>.to_string()</code>. <code>From</code> definește conversii; implementând <code>From&lt;A&gt; for B</code> primești automat și <code>Into&lt;B&gt; for A</code>.",
             en: "<code>#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]</code> generates implementations automatically. <code>Display</code> cannot be derived: you write it, and you get <code>.to_string()</code> for free. <code>From</code> defines conversions; implementing <code>From&lt;A&gt; for B</code> automatically gives you <code>Into&lt;B&gt; for A</code>." },
        code: c`
use std::fmt;

#[derive(Debug, Clone, PartialEq, Default)]
struct Port {
    nr: u16,
    deschis: bool,
}

impl fmt::Display for Port {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}/{}", self.nr, if self.deschis { "open" } else { "closed" })
    }
}

impl From<u16> for Port {
    fn from(nr: u16) -> Self {
        Port { nr, deschis: false }
    }
}

fn main() {
    let p = Port { nr: 22, deschis: true };
    println!("{p} {:?}", p);
    let q: Port = 443.into();
    println!("{}", q.to_string());
    println!("{:?} {}", Port::default(), p == p.clone());
}` },
      { h: { ro: "Generic static vs dyn Trait", en: "Static generics vs dyn Trait" },
        p: { ro: "<code>fn f&lt;T: Descriere&gt;(x: &amp;T)</code> e rezolvat la compilare (dispatch static). <code>&amp;dyn Descriere</code> sau <code>Box&lt;dyn Descriere&gt;</code> folosește o tabelă de metode (vtable) la rulare și permite colecții de tipuri diferite: <code>Vec&lt;Box&lt;dyn Descriere&gt;&gt;</code>.",
             en: "<code>fn f&lt;T: Descriere&gt;(x: &amp;T)</code> is resolved at compile time (static dispatch). <code>&amp;dyn Descriere</code> or <code>Box&lt;dyn Descriere&gt;</code> uses a method table (vtable) at runtime and allows collections of different types: <code>Vec&lt;Box&lt;dyn Descriere&gt;&gt;</code>." },
        code: c`
trait Forma {
    fn arie(&self) -> f64;
}
struct Patrat(f64);
struct Cerc(f64);
impl Forma for Patrat { fn arie(&self) -> f64 { self.0 * self.0 } }
impl Forma for Cerc { fn arie(&self) -> f64 { 3.14159 * self.0 * self.0 } }

fn total(forme: &[Box<dyn Forma>]) -> f64 {
    forme.iter().map(|f| f.arie()).sum()
}

fn main() {
    let v: Vec<Box<dyn Forma>> = vec![Box::new(Patrat(2.0)), Box::new(Cerc(1.0))];
    println!("{:.2}", total(&v));
}` },
      { h: { ro: "Operatori și tipuri asociate", en: "Operators and associated types" },
        p: { ro: "Operatorii sunt trait-uri din <code>std::ops</code>: implementând <code>Add</code> poți scrie <code>a + b</code>. Un trait poate avea <b>tip asociat</b>, ca <code>Iterator { type Item; }</code>. Regula orfanilor: poți implementa un trait pentru un tip doar dacă trait-ul <i>sau</i> tipul e definit în crate-ul tău.",
             en: "Operators are traits from <code>std::ops</code>: implementing <code>Add</code> lets you write <code>a + b</code>. A trait can have an <b>associated type</b>, like <code>Iterator { type Item; }</code>. The orphan rule: you can implement a trait for a type only if the trait <i>or</i> the type is defined in your crate." },
        code: c`
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq)]
struct Trafic { rx: u64, tx: u64 }

impl Add for Trafic {
    type Output = Trafic;
    fn add(self, o: Trafic) -> Trafic {
        Trafic { rx: self.rx + o.rx, tx: self.tx + o.tx }
    }
}

fn main() {
    let a = Trafic { rx: 100, tx: 20 };
    let b = Trafic { rx: 5, tx: 1 };
    println!("{:?}", a + b);
}` }
    ],
    exercises: [
      { title: { ro: "Display pentru adresă IPv4", en: "Display for an IPv4 address" },
        task: { ro: "Implementează <code>fmt::Display</code> pentru <code>Ip([u8; 4])</code> astfel încât programul să afișeze <code>192.168.1.10</code>.", en: "Implement <code>fmt::Display</code> for <code>Ip([u8; 4])</code> so the program prints <code>192.168.1.10</code>." },
        hint: { ro: "<code>let [a, b, c, d] = self.0; write!(f, \"{a}.{b}.{c}.{d}\")</code>", en: "<code>let [a, b, c, d] = self.0; write!(f, \"{a}.{b}.{c}.{d}\")</code>" },
        starter: c`
use std::fmt;

struct Ip([u8; 4]);

impl fmt::Display for Ip {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "TODO")
    }
}

fn main() {
    println!("{}", Ip([192, 168, 1, 10]));
}`,
        solution: c`
use std::fmt;

struct Ip([u8; 4]);

impl fmt::Display for Ip {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let [a, b, c, d] = self.0;
        write!(f, "{a}.{b}.{c}.{d}")
    }
}

fn main() {
    println!("{}", Ip([192, 168, 1, 10]));
}`,
        expect: "192.168.1.10" },
      { title: { ro: "Un trait pentru alerte", en: "A trait for alerts" },
        task: { ro: "Implementează trait-ul <code>Severitate</code> pentru <code>Disk</code> (nivel 2 dacă e peste 90%, altfel 0) și <code>Link</code> (nivel 3 dacă e căzut). Programul trebuie să afișeze <code>5</code> (suma nivelurilor).", en: "Implement the <code>Severitate</code> (severity) trait for <code>Disk</code> (level 2 if above 90%, else 0) and <code>Link</code> (level 3 if down). The program must print <code>5</code> (sum of levels)." },
        hint: { ro: "<code>impl Severitate for Disk { fn nivel(&amp;self) -&gt; u8 { if self.0 &gt; 90 { 2 } else { 0 } } }</code>", en: "<code>impl Severitate for Disk { fn nivel(&amp;self) -&gt; u8 { if self.0 &gt; 90 { 2 } else { 0 } } }</code>" },
        starter: c`
trait Severitate {
    fn nivel(&self) -> u8;
}
struct Disk(u8);
struct Link { sus: bool }

// TODO: impl Severitate for Disk și Link

fn main() {
    let _a = (Disk(95), Link { sus: false });
    // let v: Vec<Box<dyn Severitate>> = vec![Box::new(Disk(95)), Box::new(Link { sus: false }), Box::new(Disk(40))];
    // println!("{}", v.iter().map(|x| x.nivel() as u32).sum::<u32>());
}`,
        solution: c`
trait Severitate {
    fn nivel(&self) -> u8;
}
struct Disk(u8);
struct Link { sus: bool }

impl Severitate for Disk {
    fn nivel(&self) -> u8 { if self.0 > 90 { 2 } else { 0 } }
}
impl Severitate for Link {
    fn nivel(&self) -> u8 { if self.sus { 0 } else { 3 } }
}

fn main() {
    let v: Vec<Box<dyn Severitate>> = vec![Box::new(Disk(95)), Box::new(Link { sus: false }), Box::new(Disk(40))];
    println!("{}", v.iter().map(|x| x.nivel() as u32).sum::<u32>());
}`,
        expect: "5" }
    ]
  });
  QB("l9", [
    ["Ce este un trait? || What is a trait?", ["Un set de metode (comportament) pe care tipurile îl pot implementa || A set of methods (behaviour) that types can implement", "O clasă cu moștenire || A class with inheritance", "Un macro || A macro", "Un tip de pointer || A kind of pointer"], "Trait-urile seamănă cu interfețele din Java, dar pot avea metode implicite, tipuri asociate și pot fi implementate pentru tipuri existente. || Traits resemble Java interfaces but can have default methods, associated types and can be implemented for existing types."],
    ["Ce afișează? || What does it print?", ["echipament: r1\nL2: switch 24p", "r1\nswitch 24p", "echipament: r1\nechipament: switch 24p", "L2: r1\nL2: switch 24p"], "`Router` folosește metoda implicită `descrie`, `Switch` o suprascrie. || `Router` uses the default `descrie` method, `Switch` overrides it.", { k: "out", c: c`
trait Descriere {
    fn nume(&self) -> String;
    fn descrie(&self) -> String { format!("echipament: {}", self.nume()) }
}
struct Router { host: String }
struct Switch { porturi: u8 }
impl Descriere for Router { fn nume(&self) -> String { self.host.clone() } }
impl Descriere for Switch {
    fn nume(&self) -> String { format!("switch {}p", self.porturi) }
    fn descrie(&self) -> String { format!("L2: {}", self.nume()) }
}
fn main() {
    println!("{}", Router { host: "r1".into() }.descrie());
    println!("{}", Switch { porturi: 24 }.descrie());
}` }],
    ["Se poate deriva `Display` cu `#[derive(Display)]` din biblioteca standard? || Can `Display` be derived with `#[derive(Display)]` from the standard library?", ["Nu, îl implementezi manual || No, you implement it by hand", "Da || Yes", "Doar pentru enum-uri || Only for enums", "Doar pentru struct-uri tuple || Only for tuple structs"], "Std nu oferă derive pentru `Display` (formatul pentru utilizator e decizia ta). Crate-uri externe pot oferi așa ceva. || std has no derive for `Display` (the user-facing format is your decision). External crates can offer one."],
    ["Ce primești gratis când implementezi `Display`? || What do you get for free when you implement `Display`?", ["Metoda `.to_string()` || The `.to_string()` method", "`Debug`", "`Clone`", "`PartialEq`"], "Există o implementare generală `impl<T: Display + ?Sized> ToString for T`. || There is a blanket `impl<T: Display + ?Sized> ToString for T`."],
    ["Dacă implementezi `From<u16> for Port`, ce mai poți scrie? || If you implement `From<u16> for Port`, what else can you write?", ["`let p: Port = 443.into();`", "`let n: u16 = Port::into();`", "`Port::parse(443)`", "`443 as Port`"], "`Into` se obține automat din `From` prin implementarea generală din std. `as` merge doar pentru tipuri primitive. || `Into` comes automatically from `From` through std's blanket impl. `as` only works for primitive types."],
    ["Ce afișează? || What does it print?", ["22/open Port { nr: 22, deschis: true }", "22/open 22/open", "Port { nr: 22, deschis: true } 22/open", "22 open"], "`{p}` folosește `Display`, `{:?}` folosește `Debug` derivat. || `{p}` uses `Display`, `{:?}` uses the derived `Debug`.", { k: "out", c: c`
use std::fmt;
#[derive(Debug)]
struct Port { nr: u16, deschis: bool }
impl fmt::Display for Port {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}/{}", self.nr, if self.deschis { "open" } else { "closed" })
    }
}
fn main() {
    let p = Port { nr: 22, deschis: true };
    println!("{p} {:?}", p);
}` }],
    ["Ce afișează? || What does it print?", ["Port { nr: 0, deschis: false }", "Port { nr: 1, deschis: true }", "Port", "nu compilează || doesn't compile"], "`Default` derivat folosește valorile implicite ale câmpurilor: 0 și `false`. || A derived `Default` uses each field's default: 0 and `false`.", { k: "out", c: c`
#[derive(Debug, Default)]
struct Port { nr: u16, deschis: bool }
fn main() {
    println!("{:?}", Port::default());
}` }],
    ["Ce eroare dă? || Which error does it give?", ["E0277", "E0599", "E0308", "E0369"], "`Port` nu implementează `Debug`, deci `{:?}` nu poate fi folosit (E0277). Adaugă `#[derive(Debug)]`. || `Port` doesn't implement `Debug`, so `{:?}` can't be used (E0277). Add `#[derive(Debug)]`.", { k: "err", err: "E0277", c: c`
struct Port { nr: u16 }
fn main() {
    let p = Port { nr: 22 };
    println!("{:?}", p);
}` }],
    ["Ce eroare dă? || Which error does it give?", ["E0046", "E0407", "E0277", "E0599"], "E0046: lipsește implementarea metodei obligatorii `nume` din trait. || E0046: the required trait method `nume` is not implemented.", { k: "err", err: "E0046", c: c`
trait Nume { fn nume(&self) -> String; }
struct R;
impl Nume for R {}
fn main() {}` }],
    ["Ce eroare dă `==` pe un struct fără `PartialEq`? || What error does `==` give on a struct without `PartialEq`?", ["E0369", "E0277", "E0599", "E0308"], "Operatorul binar `==` nu poate fi aplicat (E0369). Adaugă `#[derive(PartialEq)]`. || The binary operator `==` cannot be applied (E0369). Add `#[derive(PartialEq)]`.", { k: "err", err: "E0369", c: c`
struct P { x: i32 }
fn main() {
    println!("{}", P { x: 1 } == P { x: 1 });
}` }],
    ["Ce înseamnă `dyn Trait`? || What does `dyn Trait` mean?", ["Un obiect trait: tipul concret e aflat la rulare, prin vtable || A trait object: the concrete type is resolved at runtime via a vtable", "Un trait dinamic care se poate modifica la rulare || A trait that can change at runtime", "Un generic rezolvat la compilare || A generic resolved at compile time", "Un trait fără metode || A trait without methods"], "`dyn` stă mereu în spatele unui pointer: `&dyn T`, `Box<dyn T>`, `Arc<dyn T>`. || `dyn` always sits behind a pointer: `&dyn T`, `Box<dyn T>`, `Arc<dyn T>`."],
    ["De ce ai nevoie de `Vec<Box<dyn Forma>>` și nu de `Vec<dyn Forma>`? || Why do you need `Vec<Box<dyn Forma>>` rather than `Vec<dyn Forma>`?", ["`dyn Forma` nu are dimensiune cunoscută la compilare (nu e `Sized`) || `dyn Forma` has no size known at compile time (it isn't `Sized`)", "`Vec` nu acceptă trait-uri || `Vec` doesn't accept traits", "`Box` e mai rapid || `Box` is faster", "E doar o convenție || It's just a convention"], "Elementele unui `Vec` trebuie să aibă toate aceeași dimensiune; pointerii au. || A `Vec`'s elements must all have the same size; pointers do."],
    ["Ce afișează? || What does it print?", ["7.14", "7.00", "4.00", "3.14"], "Pătrat 2×2 = 4, cerc de rază 1 ≈ 3.14159; total ≈ 7.14. || Square 2×2 = 4, circle radius 1 ≈ 3.14159; total ≈ 7.14.", { k: "out", c: c`
trait Forma { fn arie(&self) -> f64; }
struct Patrat(f64);
struct Cerc(f64);
impl Forma for Patrat { fn arie(&self) -> f64 { self.0 * self.0 } }
impl Forma for Cerc { fn arie(&self) -> f64 { 3.14159 * self.0 * self.0 } }
fn main() {
    let v: Vec<Box<dyn Forma>> = vec![Box::new(Patrat(2.0)), Box::new(Cerc(1.0))];
    let t: f64 = v.iter().map(|f| f.arie()).sum();
    println!("{:.2}", t);
}` }],
    ["Ce este dispatch-ul static? || What is static dispatch?", ["Compilatorul știe exact ce metodă apelează (generice, monomorfizare) || The compiler knows exactly which method is called (generics, monomorphization)", "Apel prin vtable || A call through a vtable", "Apel între fire de execuție || A call between threads", "Un apel `unsafe` || An `unsafe` call"], "Dispatch static permite inlining; dispatch dinamic (`dyn`) adaugă o indirecție, dar binar mai mic și colecții eterogene. || Static dispatch allows inlining; dynamic dispatch (`dyn`) adds an indirection but gives smaller binaries and heterogeneous collections."],
    ["Ce spune regula orfanilor (orphan rule)? || What does the orphan rule say?", ["Poți implementa un trait pentru un tip doar dacă trait-ul sau tipul e definit în crate-ul tău || You can implement a trait for a type only if the trait or the type is defined in your crate", "Un trait trebuie să aibă cel puțin o implementare || A trait must have at least one implementation", "Tipurile fără trait-uri nu compilează || Types without traits don't compile", "Nu poți implementa trait-uri pentru enum-uri || You can't implement traits for enums"], "De aceea nu poți scrie `impl Display for Vec<u8>` în crate-ul tău; soluția e un tip nou (newtype). || That's why you can't write `impl Display for Vec<u8>` in your crate; the fix is a newtype."],
    ["Ce eroare dă? || Which error does it give?", ["E0117", "E0119", "E0277", "E0210"], "E0117: implementare „orfană”: nici `Display`, nici `Vec<u8>` nu sunt locale. || E0117: “orphan” impl: neither `Display` nor `Vec<u8>` is local.", { k: "err", err: "E0117", c: c`
use std::fmt;
impl fmt::Display for Vec<u8> {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result { write!(f, "v") }
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["Trafic { rx: 105, tx: 21 }", "Trafic { rx: 100, tx: 20 }", "105 21", "nu compilează || doesn't compile"], "Implementarea `Add` permite `a + b`. || Implementing `Add` enables `a + b`.", { k: "out", c: c`
use std::ops::Add;
#[derive(Debug, Clone, Copy)]
struct Trafic { rx: u64, tx: u64 }
impl Add for Trafic {
    type Output = Trafic;
    fn add(self, o: Trafic) -> Trafic { Trafic { rx: self.rx + o.rx, tx: self.tx + o.tx } }
}
fn main() {
    println!("{:?}", Trafic { rx: 100, tx: 20 } + Trafic { rx: 5, tx: 1 });
}` }],
    ["Ce este un tip asociat (associated type)? || What is an associated type?", ["Un tip declarat în trait și ales de fiecare implementare, ca `type Item` în `Iterator` || A type declared in the trait and chosen by each implementation, like `type Item` in `Iterator`", "Un alias global || A global alias", "Tipul lui `self` || The type of `self`", "Un tip generic implicit || A default generic type"], "Fiecare iterator are un singur `Item`, de aceea e tip asociat, nu parametru generic. || Each iterator has exactly one `Item`, which is why it's an associated type rather than a generic parameter."],
    ["Ce face `#[derive(Clone)]`? || What does `#[derive(Clone)]` do?", ["Generează `.clone()` care clonează fiecare câmp || Generates `.clone()` cloning each field", "Face tipul `Copy` || Makes the type `Copy`", "Copiază tipul la fiecare atribuire || Copies the type on every assignment", "Creează un alias || Creates an alias"], "`Clone` e explicit (apelezi `.clone()`); `Copy` e implicit și cere ca toate câmpurile să fie `Copy`. || `Clone` is explicit (you call `.clone()`); `Copy` is implicit and requires all fields to be `Copy`."],
    ["Poate un struct cu un câmp `String` să fie `Copy`? || Can a struct with a `String` field be `Copy`?", ["Nu, `String` nu e `Copy` || No, `String` isn't `Copy`", "Da, cu `#[derive(Copy)]` || Yes, with `#[derive(Copy)]`", "Da, dacă e `pub` || Yes, if it's `pub`", "Da, dacă implementezi `Drop` || Yes, if you implement `Drop`"], "`Copy` cere ca toate câmpurile să fie `Copy` (E0204 altfel). || `Copy` requires every field to be `Copy` (E0204 otherwise)."],
    ["Ce eroare dă? || Which error does it give?", ["E0204", "E0277", "E0382", "E0599"], "E0204: trait-ul `Copy` nu poate fi implementat pentru un tip cu câmp `String`. || E0204: `Copy` can't be implemented for a type with a `String` field.", { k: "err", err: "E0204", c: c`
#[derive(Clone, Copy)]
struct Host { nume: String }
fn main() {}` }],
    ["Ce face `impl<T: Display> Descriere for T`? || What does `impl<T: Display> Descriere for T` do?", ["O implementare generală (blanket impl) pentru toate tipurile care au `Display` || A blanket impl for every type that has `Display`", "Nu compilează niciodată || It never compiles", "Implementează doar pentru `T` literal || Implements only for a literal `T`", "Creează un nou tip `T` || Creates a new type `T`"], "Std folosește la fel: `impl<T: Display> ToString for T`. || std does the same: `impl<T: Display> ToString for T`."],
    ["Ce afișează? || What does it print?", ["10.0.0.1", "[10, 0, 0, 1]", "Ip([10, 0, 0, 1])", "10 0 0 1"], "`Display` implementat de noi formatează cu puncte. || Our `Display` impl formats with dots.", { k: "out", c: c`
use std::fmt;
struct Ip([u8; 4]);
impl fmt::Display for Ip {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let [a, b, c, d] = self.0;
        write!(f, "{a}.{b}.{c}.{d}")
    }
}
fn main() {
    println!("{}", Ip([10, 0, 0, 1]));
}` }],
    ["Ce sunt `PartialEq` și `Eq`? || What are `PartialEq` and `Eq`?", ["`PartialEq` oferă `==`; `Eq` marchează că egalitatea e reflexivă (a == a mereu) || `PartialEq` provides `==`; `Eq` marks equality as reflexive (a == a always)", "Sunt identice || They are identical", "`Eq` e pentru numere, `PartialEq` pentru text || `Eq` is for numbers, `PartialEq` for text", "`Eq` compară adrese de memorie || `Eq` compares memory addresses"], "`f64` are doar `PartialEq`, pentru că `NaN != NaN`. Cheile `HashMap` cer `Eq + Hash`. || `f64` only has `PartialEq` because `NaN != NaN`. `HashMap` keys require `Eq + Hash`."],
    ["Ce afișează? || What does it print?", ["false", "true"], "NaN nu este egal nici cu el însuși. || NaN isn't even equal to itself.", { k: "out", c: c`
fn main() {
    let x = f64::NAN;
    println!("{}", x == x);
}` }]
  ]);
})();

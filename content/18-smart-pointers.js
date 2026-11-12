(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 15, icon: "📌", level: 3,
    title: { ro: "Smart pointers: Box, Rc, RefCell", en: "Smart pointers: Box, Rc, RefCell" },
    summary: {
      ro: "Pointeri care dețin date și au comportament extra: <code>Box&lt;T&gt;</code> (valoare pe heap), <code>Rc&lt;T&gt;</code> (mai mulți proprietari, numărare de referințe), <code>RefCell&lt;T&gt;</code> (mutabilitate interioară verificată la rulare), plus <code>Weak</code> și trait-ul <code>Drop</code>.",
      en: "Pointers that own data and add behaviour: <code>Box&lt;T&gt;</code> (value on the heap), <code>Rc&lt;T&gt;</code> (several owners, reference counting), <code>RefCell&lt;T&gt;</code> (interior mutability checked at runtime), plus <code>Weak</code> and the <code>Drop</code> trait."
    },
    sections: [
      { h: { ro: "Box<T> și tipurile recursive", en: "Box<T> and recursive types" },
        p: { ro: "<code>Box::new(x)</code> pune <code>x</code> pe heap; box-ul (un pointer) stă pe stack. E necesar pentru tipuri recursive, a căror dimensiune altfel ar fi infinită (E0072), și pentru obiecte <code>dyn Trait</code>.",
             en: "<code>Box::new(x)</code> puts <code>x</code> on the heap; the box (a pointer) lives on the stack. It's needed for recursive types, whose size would otherwise be infinite (E0072), and for <code>dyn Trait</code> objects." },
        code: c`
#[derive(Debug)]
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
}

fn eval(e: &Expr) -> i64 {
    match e {
        Expr::Num(n) => *n,
        Expr::Add(a, b) => eval(a) + eval(b),
        Expr::Mul(a, b) => eval(a) * eval(b),
    }
}

fn main() {
    // (2 + 3) * 4
    let e = Expr::Mul(Box::new(Expr::Add(Box::new(Expr::Num(2)), Box::new(Expr::Num(3)))), Box::new(Expr::Num(4)));
    println!("{}", eval(&e));
}` },
      { h: { ro: "Rc<T>: proprietate partajată", en: "Rc<T>: shared ownership" },
        p: { ro: "<code>Rc::clone(&amp;a)</code> nu copiază datele: crește un contor. Datele sunt eliberate când contorul ajunge la 0. <code>Rc</code> e doar pentru un singur fir; între fire folosești <code>Arc</code>. Datele dintr-un <code>Rc</code> sunt doar de citit.",
             en: "<code>Rc::clone(&amp;a)</code> doesn't copy the data: it bumps a counter. The data is freed when the count reaches 0. <code>Rc</code> is single-threaded only; across threads use <code>Arc</code>. Data inside an <code>Rc</code> is read-only." },
        code: c`
use std::rc::Rc;

fn main() {
    let config = Rc::new(String::from("mtu=1500"));
    let a = Rc::clone(&config);
    {
        let b = Rc::clone(&config);
        println!("{} proprietari: {}", b, Rc::strong_count(&config));
    }
    println!("după bloc: {}", Rc::strong_count(&config));
    drop(a);
    println!("după drop: {}", Rc::strong_count(&config));
}` },
      { h: { ro: "RefCell<T>: mutabilitate interioară", en: "RefCell<T>: interior mutability" },
        p: { ro: "<code>RefCell</code> mută verificarea regulilor de borrowing de la compilare la <b>rulare</b>: <code>borrow()</code> și <code>borrow_mut()</code>. Dacă încalci regula (două <code>borrow_mut</code> simultan) primești panic. Combinația <code>Rc&lt;RefCell&lt;T&gt;&gt;</code> dă date partajate și modificabile pe un fir. Pentru valori <code>Copy</code> mici există <code>Cell</code>.",
             en: "<code>RefCell</code> moves the borrowing rules from compile time to <b>runtime</b>: <code>borrow()</code> and <code>borrow_mut()</code>. Break the rule (two <code>borrow_mut</code> at once) and you get a panic. <code>Rc&lt;RefCell&lt;T&gt;&gt;</code> gives shared, mutable data on one thread. For small <code>Copy</code> values there's <code>Cell</code>." },
        code: c`
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Debug)]
struct Contoare { rx: u64, tx: u64 }

fn main() {
    let c = Rc::new(RefCell::new(Contoare { rx: 0, tx: 0 }));
    let pentru_rx = Rc::clone(&c);
    pentru_rx.borrow_mut().rx += 1500;
    c.borrow_mut().tx += 64;
    println!("{:?}", c.borrow());
    let incercare = c.try_borrow_mut();
    println!("ok: {}", incercare.is_ok());
}` },
      { h: { ro: "Drop și Weak", en: "Drop and Weak" },
        p: { ro: "Trait-ul <code>Drop</code> rulează cod când o valoare iese din scope (închide un fișier, eliberează o conexiune). Variabilele sunt eliberate în ordinea <b>inversă</b> declarării. Două <code>Rc</code> care se referă reciproc formează un ciclu și nu se eliberează; <code>Weak</code> (obținut cu <code>Rc::downgrade</code>) nu ține valoarea în viață și sparge ciclul.",
             en: "The <code>Drop</code> trait runs code when a value goes out of scope (close a file, release a connection). Variables are dropped in <b>reverse</b> declaration order. Two <code>Rc</code>s pointing at each other form a cycle that is never freed; <code>Weak</code> (from <code>Rc::downgrade</code>) doesn't keep the value alive and breaks the cycle." },
        code: c`
use std::rc::{Rc, Weak};

struct Conexiune(&'static str);
impl Drop for Conexiune {
    fn drop(&mut self) {
        println!("închid {}", self.0);
    }
}

fn main() {
    let _a = Conexiune("a");
    let _b = Conexiune("b");
    let tare = Rc::new(5);
    let slab: Weak<i32> = Rc::downgrade(&tare);
    println!("{:?}", slab.upgrade());
    drop(tare);
    println!("{:?}", slab.upgrade());
    println!("sfârșit main");
}` }
    ],
    exercises: [
      { title: { ro: "Jurnal partajat", en: "Shared log" },
        task: { ro: "Două componente (<code>a</code> și <code>b</code>) trebuie să scrie în același jurnal. Folosește <code>Rc&lt;RefCell&lt;Vec&lt;String&gt;&gt;&gt;</code> ca programul să afișeze <code>[\"a: start\", \"b: ok\"] 3</code> (3 = numărul de proprietari).", en: "Two components (<code>a</code> and <code>b</code>) must write to the same log. Use <code>Rc&lt;RefCell&lt;Vec&lt;String&gt;&gt;&gt;</code> so the program prints <code>[\"a: start\", \"b: ok\"] 3</code> (3 = number of owners)." },
        hint: { ro: "<code>let a = Rc::clone(&amp;jurnal); a.borrow_mut().push(\"a: start\".to_string());</code>", en: "<code>let a = Rc::clone(&amp;jurnal); a.borrow_mut().push(\"a: start\".to_string());</code>" },
        starter: c`
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let jurnal: Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(Vec::new()));
    // TODO: a și b, câte un Rc::clone, fiecare adaugă o linie
    println!("{:?} {}", jurnal.borrow(), Rc::strong_count(&jurnal));
}`,
        solution: c`
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let jurnal: Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(Vec::new()));
    let a = Rc::clone(&jurnal);
    let b = Rc::clone(&jurnal);
    a.borrow_mut().push("a: start".to_string());
    b.borrow_mut().push("b: ok".to_string());
    println!("{:?} {}", jurnal.borrow(), Rc::strong_count(&jurnal));
}`,
        expect: "[\"a: start\", \"b: ok\"] 3" }
    ]
  });
  QB("l15", [
    ["Unde stau datele dintr-un `Box<T>`? || Where does the data in a `Box<T>` live?", ["Pe heap; box-ul (pointerul) e pe stack || On the heap; the box (pointer) is on the stack", "Pe stack || On the stack", "În registrele CPU || In CPU registers", "Într-un fișier || In a file"], "`Box` e cel mai simplu smart pointer: proprietate unică, eliberare automată. || `Box` is the simplest smart pointer: single owner, automatic free."],
    ["Ce eroare dă un enum recursiv fără `Box`? || Which error does a recursive enum without `Box` give?", ["E0072", "E0106", "E0277", "E0391"], "E0072: tip recursiv cu dimensiune infinită. Pune câmpul recursiv într-un `Box`. || E0072: recursive type has infinite size. Put the recursive field in a `Box`.", { k: "err", err: "E0072", c: c`
enum Lista {
    Nod(i32, Lista),
    Gol,
}
fn main() {}` }],
    ["Ce afișează? || What does it print?", ["20", "14", "9", "24"], "(2 + 3) * 4 = 20. || (2 + 3) * 4 = 20.", { k: "out", c: c`
enum Expr { Num(i64), Add(Box<Expr>, Box<Expr>), Mul(Box<Expr>, Box<Expr>) }
fn eval(e: &Expr) -> i64 {
    match e {
        Expr::Num(n) => *n,
        Expr::Add(a, b) => eval(a) + eval(b),
        Expr::Mul(a, b) => eval(a) * eval(b),
    }
}
fn main() {
    let e = Expr::Mul(Box::new(Expr::Add(Box::new(Expr::Num(2)), Box::new(Expr::Num(3)))), Box::new(Expr::Num(4)));
    println!("{}", eval(&e));
}` }],
    ["Ce face `Rc::clone(&a)`? || What does `Rc::clone(&a)` do?", ["Crește contorul de referințe; nu copiază datele || Increments the reference count; doesn't copy the data", "Copiază adânc datele || Deep-copies the data", "Mută datele || Moves the data", "Creează un `Weak` || Creates a `Weak`"], "E ieftin: o incrementare de contor. || It's cheap: one counter increment."],
    ["Ce afișează? || What does it print?", ["mtu=1500 proprietari: 3\ndupă bloc: 2\ndupă drop: 1", "mtu=1500 proprietari: 2\ndupă bloc: 2\ndupă drop: 1", "mtu=1500 proprietari: 3\ndupă bloc: 3\ndupă drop: 2", "mtu=1500 proprietari: 1\ndupă bloc: 1\ndupă drop: 0"], "config + a + b = 3; `b` iese din scope → 2; `drop(a)` → 1. || config + a + b = 3; `b` leaves scope → 2; `drop(a)` → 1.", { k: "out", c: c`
use std::rc::Rc;
fn main() {
    let config = Rc::new(String::from("mtu=1500"));
    let a = Rc::clone(&config);
    {
        let b = Rc::clone(&config);
        println!("{} proprietari: {}", b, Rc::strong_count(&config));
    }
    println!("după bloc: {}", Rc::strong_count(&config));
    drop(a);
    println!("după drop: {}", Rc::strong_count(&config));
}` }],
    ["Poți trimite un `Rc<T>` către alt fir de execuție? || Can you send an `Rc<T>` to another thread?", ["Nu, `Rc` nu e `Send`; folosești `Arc` || No, `Rc` isn't `Send`; use `Arc`", "Da || Yes", "Doar cu `move` || Only with `move`", "Doar dacă `T` e `Copy` || Only if `T` is `Copy`"], "Contorul din `Rc` nu e atomic. `Arc` folosește operații atomice. || `Rc`'s counter isn't atomic. `Arc` uses atomic operations."],
    ["Ce eroare dă `thread::spawn` cu un `Rc`? || Which error does `thread::spawn` with an `Rc` give?", ["E0277", "E0373", "E0382", "E0599"], "E0277: `Rc<i32>` nu poate fi trimis între fire în siguranță (`Send` nu e implementat). || E0277: `Rc<i32>` cannot be sent between threads safely (`Send` isn't implemented).", { k: "err", err: "E0277", c: c`
use std::rc::Rc;
use std::thread;
fn main() {
    let r = Rc::new(1);
    let h = thread::spawn(move || println!("{}", r));
    h.join().unwrap();
}` }],
    ["Ce este mutabilitatea interioară? || What is interior mutability?", ["Posibilitatea de a modifica date printr-o referință `&`, cu regulile verificate la rulare (`RefCell`, `Cell`, `Mutex`) || Mutating data through a `&` reference, with the rules checked at runtime (`RefCell`, `Cell`, `Mutex`)", "Variabile `mut` în interiorul unei funcții || `mut` variables inside a function", "Modificarea câmpurilor private || Mutating private fields", "Un bug al compilatorului || A compiler bug"], "Regulile de borrowing rămân valabile, doar că sunt verificate mai târziu. || The borrowing rules still hold, they're just checked later."],
    ["Ce se întâmplă la două `borrow_mut()` active simultan pe același `RefCell`? || What happens with two `borrow_mut()` active at once on the same `RefCell`?", ["Panic la rulare (`already borrowed`) || A runtime panic (`already borrowed`)", "Eroare de compilare || A compile error", "Merge || It works", "Comportament nedefinit || Undefined behaviour"], "Pentru a evita panicul folosești `try_borrow_mut()`, care întoarce `Result`. || To avoid the panic use `try_borrow_mut()`, which returns a `Result`."],
    ["Ce afișează? || What does it print?", ["Contoare { rx: 1500, tx: 64 }\nok: true", "Contoare { rx: 0, tx: 0 }\nok: true", "Contoare { rx: 1500, tx: 64 }\nok: false", "panic"], "Ambele `Rc` arată spre același `RefCell`. `try_borrow_mut` reușește, pentru că împrumutul `c.borrow()` din `println!` s-a terminat deja. || Both `Rc`s point to the same `RefCell`. `try_borrow_mut` succeeds because the `c.borrow()` from the `println!` has already ended.", { k: "out", c: c`
use std::cell::RefCell;
use std::rc::Rc;
#[derive(Debug)]
struct Contoare { rx: u64, tx: u64 }
fn main() {
    let c = Rc::new(RefCell::new(Contoare { rx: 0, tx: 0 }));
    let pentru_rx = Rc::clone(&c);
    pentru_rx.borrow_mut().rx += 1500;
    c.borrow_mut().tx += 64;
    println!("{:?}", c.borrow());
    println!("ok: {}", c.try_borrow_mut().is_ok());
}` }],
    ["Ce afișează? || What does it print?", ["false", "true", "panic"], "`r` ține un împrumut imutabil activ, deci `try_borrow_mut` eșuează. || `r` holds an active immutable borrow, so `try_borrow_mut` fails.", { k: "out", c: c`
use std::cell::RefCell;
fn main() {
    let c = RefCell::new(5);
    let r = c.borrow();
    println!("{}", c.try_borrow_mut().is_ok());
    drop(r);
}` }],
    ["Pentru ce e potrivit `Cell<T>`? || What is `Cell<T>` good for?", ["Mutabilitate interioară pentru valori mici, de obicei `Copy`, cu `get`/`set` fără împrumuturi || Interior mutability for small, usually `Copy`, values via `get`/`set` without borrows", "Date partajate între fire || Data shared between threads", "Fișiere || Files", "Colecții mari || Large collections"], "`Cell` nu dă niciodată referințe la conținut, deci nu are verificări de împrumut. || `Cell` never hands out references to its contents, so it needs no borrow checks."],
    ["Ce afișează? || What does it print?", ["3", "0", "1", "nu compilează || doesn't compile"], "`Cell::set` modifică valoarea prin `&`. || `Cell::set` changes the value through `&`.", { k: "out", c: c`
use std::cell::Cell;
fn main() {
    let n = Cell::new(0);
    let r = &n;
    for _ in 0..3 { r.set(r.get() + 1); }
    println!("{}", n.get());
}` }],
    ["În ce ordine sunt eliberate variabilele locale? || In what order are local variables dropped?", ["Invers ordinii declarării || In reverse declaration order", "În ordinea declarării || In declaration order", "Alfabetic || Alphabetically", "Aleator || Randomly"], "Ultima variabilă declarată e eliberată prima. || The last declared variable is dropped first."],
    ["Ce afișează? || What does it print?", ["sfârșit\nînchid b\nînchid a", "închid a\nînchid b\nsfârșit", "sfârșit\nînchid a\nînchid b", "închid b\nînchid a\nsfârșit"], "`Drop` rulează la finalul lui `main`, în ordine inversă. || `Drop` runs at the end of `main`, in reverse order.", { k: "out", c: c`
struct C(&'static str);
impl Drop for C {
    fn drop(&mut self) { println!("închid {}", self.0); }
}
fn main() {
    let _a = C("a");
    let _b = C("b");
    println!("sfârșit");
}` }],
    ["Ce afișează? || What does it print?", ["Some(5)\nNone", "Some(5)\nSome(5)", "5\n0", "None\nNone"], "`Weak::upgrade` întoarce `None` după ce ultimul `Rc` tare a fost eliberat. || `Weak::upgrade` returns `None` after the last strong `Rc` is dropped.", { k: "out", c: c`
use std::rc::{Rc, Weak};
fn main() {
    let tare = Rc::new(5);
    let slab: Weak<i32> = Rc::downgrade(&tare);
    println!("{:?}", slab.upgrade());
    drop(tare);
    println!("{:?}", slab.upgrade());
}` }],
    ["De ce poate `Rc` produce scurgeri de memorie (memory leaks)? || Why can `Rc` leak memory?", ["Două `Rc` care se referă reciproc formează un ciclu: contorul nu ajunge niciodată la 0 || Two `Rc`s pointing at each other form a cycle: the count never reaches 0", "Pentru că nu eliberează niciodată memoria || Because it never frees memory", "Pentru că e `unsafe` || Because it's `unsafe`", "Nu poate || It can't"], "Soluția: una dintre legături e `Weak`. Scurgerile de memorie nu sunt considerate nesigure (unsafe) în Rust. || The fix: make one of the links `Weak`. Memory leaks aren't considered unsafe in Rust."],
    ["Poți apela manual `x.drop()`? || Can you call `x.drop()` manually?", ["Nu (E0040); folosești `drop(x)` din prelude || No (E0040); use `drop(x)` from the prelude", "Da || Yes", "Doar în `unsafe` || Only in `unsafe`", "Doar pentru `Box` || Only for `Box`"], "`std::mem::drop` preia proprietatea și o eliberează imediat. || `std::mem::drop` takes ownership and frees it right away.", { k: "err", err: "E0040", c: c`
struct C;
impl Drop for C { fn drop(&mut self) {} }
fn main() {
    let c = C;
    c.drop();
}` }],
    ["Ce face `Deref` pentru un smart pointer? || What does `Deref` do for a smart pointer?", ["Permite `*p` și conversia automată `&Box<String>` → `&String` → `&str` (deref coercion) || Enables `*p` and automatic `&Box<String>` → `&String` → `&str` conversion (deref coercion)", "Eliberează memoria || Frees memory", "Copiază valoarea || Copies the value", "Face pointerul nul || Nulls the pointer"], "De aceea poți trimite `&Box<String>` unei funcții care cere `&str`. || That's why you can pass `&Box<String>` to a function expecting `&str`."],
    ["Ce afișează? || What does it print?", ["5", "nu compilează || doesn't compile", "0", "Box(\"salut\")"], "Deref coercion: `&Box<String>` devine `&str`. || Deref coercion: `&Box<String>` becomes `&str`.", { k: "out", c: c`
fn lungime(s: &str) -> usize { s.len() }
fn main() {
    let b = Box::new(String::from("salut"));
    println!("{}", lungime(&b));
}` }],
    ["Ce afișează (pe 64 de biți)? || What does it print (on 64-bit)?", ["8", "16", "4", "0"], "Un `Box<i32>` e un singur pointer: 8 octeți pe 64 de biți. || A `Box<i32>` is a single pointer: 8 bytes on 64-bit.", { k: "out", c: c`
fn main() {
    println!("{}", std::mem::size_of::<Box<i32>>());
}` }],
    ["Ce combinație dă date partajate și modificabile pe un singur fir? || Which combination gives shared, mutable data on a single thread?", ["`Rc<RefCell<T>>`", "`Box<T>`", "`Arc<T>`", "`&mut Rc<T>`"], "Între fire, echivalentul este `Arc<Mutex<T>>`. || Across threads the equivalent is `Arc<Mutex<T>>`."],
    ["Care e diferența dintre `Rc::strong_count` și `Rc::weak_count`? || What's the difference between `Rc::strong_count` and `Rc::weak_count`?", ["Doar referințele tari țin valoarea în viață || Only strong references keep the value alive", "Sunt mereu egale || They're always equal", "`weak_count` numără firele || `weak_count` counts threads", "`strong_count` include și `Weak` || `strong_count` includes `Weak` too"], "Valoarea e eliberată când `strong_count` ajunge la 0, chiar dacă mai există `Weak`. || The value is dropped when `strong_count` hits 0, even if `Weak`s remain."]
  ]);
})();

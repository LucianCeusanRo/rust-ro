(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 8, icon: "🧬", level: 2,
    title: { ro: "Generice", en: "Generics" },
    summary: {
      ro: "Scrii o singură dată cod care merge pentru mai multe tipuri: funcții, struct-uri și enum-uri generice, cu <i>trait bounds</i>. Compilatorul generează cod separat pentru fiecare tip folosit (monomorfizare), deci nu plătești la rulare.",
      en: "Write code once that works for many types: generic functions, structs and enums, with <i>trait bounds</i>. The compiler generates separate code for every concrete type used (monomorphization), so there is no runtime cost."
    },
    sections: [
      { h: { ro: "Funcții generice și trait bounds", en: "Generic functions and trait bounds" },
        p: { ro: "<code>fn maxim&lt;T: PartialOrd + Copy&gt;(v: &amp;[T]) -&gt; T</code> spune: „merge pentru orice <code>T</code> care se poate compara și copia”. Fără bound, compilatorul nu te lasă să folosești <code>&gt;</code> pe <code>T</code>.",
             en: "<code>fn maxim&lt;T: PartialOrd + Copy&gt;(v: &amp;[T]) -&gt; T</code> says: “works for any <code>T</code> that can be compared and copied”. Without the bound the compiler won't let you use <code>&gt;</code> on <code>T</code>." },
        code: c`
fn maxim<T: PartialOrd + Copy>(v: &[T]) -> T {
    let mut m = v[0];
    for &x in v {
        if x > m {
            m = x;
        }
    }
    m
}

fn main() {
    println!("{}", maxim(&[3, 9, 2]));
    println!("{}", maxim(&[1.5, -2.0]));
    println!("{}", maxim(&['a', 'z', 'q']));
}` },
      { h: { ro: "Struct-uri și enum-uri generice", en: "Generic structs and enums" },
        p: { ro: "<code>Option&lt;T&gt;</code> și <code>Result&lt;T, E&gt;</code> sunt chiar enum-uri generice din biblioteca standard. Poți face la fel: <code>struct Pereche&lt;T&gt; { a: T, b: T }</code>. Un bloc <code>impl&lt;T&gt;</code> definește metode pentru orice <code>T</code>.",
             en: "<code>Option&lt;T&gt;</code> and <code>Result&lt;T, E&gt;</code> are themselves generic enums from the standard library. You can do the same: <code>struct Pereche&lt;T&gt; { a: T, b: T }</code>. An <code>impl&lt;T&gt;</code> block defines methods for any <code>T</code>." },
        code: c`
#[derive(Debug)]
struct Pereche<T> {
    a: T,
    b: T,
}

impl<T: PartialOrd + std::fmt::Debug> Pereche<T> {
    fn mai_mare(&self) -> &T {
        if self.a > self.b { &self.a } else { &self.b }
    }
}

fn main() {
    let p = Pereche { a: 10, b: 42 };
    let q = Pereche { a: "alfa", b: "beta" };
    println!("{:?} -> {:?}", p, p.mai_mare());
    println!("{:?}", q.mai_mare());
}` },
      { h: { ro: "where și impl Trait", en: "where and impl Trait" },
        p: { ro: "Când bound-urile devin lungi, mută-le într-o clauză <code>where</code>. La parametri, <code>impl Display</code> e o scurtătură pentru un generic anonim. La tipul de retur, <code>impl Iterator&lt;Item = u32&gt;</code> ascunde tipul concret.",
             en: "When bounds get long, move them into a <code>where</code> clause. In parameters, <code>impl Display</code> is shorthand for an anonymous generic. In return position, <code>impl Iterator&lt;Item = u32&gt;</code> hides the concrete type." },
        code: c`
use std::fmt::Display;

fn eticheta<T, U>(a: T, b: U) -> String
where
    T: Display,
    U: Display,
{
    format!("[{a}] {b}")
}

fn arata(x: impl Display) {
    println!("> {x}");
}

fn pare(n: u32) -> impl Iterator<Item = u32> {
    (0..n).filter(|x| x % 2 == 0)
}

fn main() {
    println!("{}", eticheta("WARN", 91));
    arata(3.5);
    let v: Vec<u32> = pare(7).collect();
    println!("{:?}", v);
}` },
      { h: { ro: "Generice constante (const generics)", en: "Const generics" },
        p: { ro: "Parametrii generici pot fi și valori constante, de exemplu lungimea unui array: <code>fn suma&lt;const N: usize&gt;(a: [i32; N])</code>. Așa scrii funcții pentru array-uri de orice lungime, verificate la compilare.",
             en: "Generic parameters can also be constant values, e.g. an array length: <code>fn suma&lt;const N: usize&gt;(a: [i32; N])</code>. That lets you write functions for arrays of any length, checked at compile time." },
        code: c`
fn suma<const N: usize>(a: [i32; N]) -> i32 {
    a.iter().sum()
}

fn main() {
    println!("{}", suma([1, 2, 3]));
    println!("{}", suma([10; 5]));
}` }
    ],
    exercises: [
      { title: { ro: "Primul element care trece un test", en: "First element that passes a test" },
        task: { ro: "Scrie funcția generică <code>primul_peste&lt;T: PartialOrd + Copy&gt;(v: &amp;[T], prag: T) -&gt; Option&lt;T&gt;</code>, care întoarce primul element strict mai mare decât pragul. Rezultat așteptat: <code>Some(12)</code> și <code>None</code> pe două linii.",
                en: "Write the generic function <code>primul_peste&lt;T: PartialOrd + Copy&gt;(v: &amp;[T], prag: T) -&gt; Option&lt;T&gt;</code> returning the first element strictly greater than the threshold. Expected: <code>Some(12)</code> and <code>None</code> on two lines." },
        hint: { ro: "<code>for &amp;x in v { if x &gt; prag { return Some(x); } } None</code>", en: "<code>for &amp;x in v { if x &gt; prag { return Some(x); } } None</code>" },
        starter: c`
fn primul_peste<T: PartialOrd + Copy>(v: &[T], prag: T) -> Option<T> {
    let _ = (v, prag);
    None // TODO
}

fn main() {
    println!("{:?}", primul_peste(&[3, 12, 40], 10));
    println!("{:?}", primul_peste(&[0.5, 0.7], 1.0));
}`,
        solution: c`
fn primul_peste<T: PartialOrd + Copy>(v: &[T], prag: T) -> Option<T> {
    for &x in v {
        if x > prag {
            return Some(x);
        }
    }
    None
}

fn main() {
    println!("{:?}", primul_peste(&[3, 12, 40], 10));
    println!("{:?}", primul_peste(&[0.5, 0.7], 1.0));
}`,
        expect: "Some(12)\nNone" }
    ]
  });
  QB("l8", [
    ["Ce înseamnă monomorfizare? || What is monomorphization?", ["Compilatorul generează o copie a codului generic pentru fiecare tip concret folosit || The compiler generates a copy of generic code for each concrete type used", "Tipurile generice sunt verificate la rulare || Generic types are checked at runtime", "Toate genericele devin `Box<dyn Any>` || All generics become `Box<dyn Any>`", "O optimizare care elimină funcțiile nefolosite || An optimization that removes unused functions"], "De aceea genericele nu au cost la rulare, dar pot mări binarul și timpul de compilare. || That's why generics have no runtime cost but can grow binary size and compile time."],
    ["De ce nu compilează `fn mare<T>(a: T, b: T) -> bool { a > b }`? || Why doesn't `fn mare<T>(a: T, b: T) -> bool { a > b }` compile?", ["Lipsește bound-ul `T: PartialOrd` || The `T: PartialOrd` bound is missing", "Lipsește `mut` || `mut` is missing", "Funcțiile generice nu pot întoarce `bool` || Generic functions can't return `bool`", "Trebuie `T: Copy` || It needs `T: Copy`"], "Fără bound, compilatorul nu știe că `T` suportă `>` (E0369). || Without the bound the compiler doesn't know `T` supports `>` (E0369)."],
    ["Ce eroare dă? || Which error does it give?", ["E0369", "E0277", "E0308", "E0599"], "E0369: operația binară `>` nu poate fi aplicată tipului `T`. || E0369: binary operation `>` cannot be applied to type `T`.", { k: "err", err: "E0369", c: c`
fn mare<T>(a: T, b: T) -> bool {
    a > b
}
fn main() {
    println!("{}", mare(1, 2));
}` }],
    ["Ce afișează? || What does it print?", ["9\nz", "3\na", "9\nq", "2\nz"], "Funcția găsește maximul pentru orice tip `PartialOrd + Copy`. || The function finds the maximum for any `PartialOrd + Copy` type.", { k: "out", c: c`
fn maxim<T: PartialOrd + Copy>(v: &[T]) -> T {
    let mut m = v[0];
    for &x in v {
        if x > m { m = x; }
    }
    m
}
fn main() {
    println!("{}", maxim(&[3, 9, 2]));
    println!("{}", maxim(&['a', 'z', 'q']));
}` }],
    ["Unde poți pune trait bounds? || Where can you put trait bounds?", ["În `<T: Bound>` sau într-o clauză `where` || In `<T: Bound>` or in a `where` clause", "Doar în `where` || Only in `where`", "Doar în corpul funcției || Only in the function body", "Doar la struct-uri || Only on structs"], "Ambele forme sunt echivalente; `where` e mai lizibil la bound-uri multe. || Both forms are equivalent; `where` reads better with many bounds."],
    ["Ce înseamnă `fn f(x: impl Display)`? || What does `fn f(x: impl Display)` mean?", ["Un parametru generic anonim care implementează `Display` || An anonymous generic parameter implementing `Display`", "Un obiect trait alocat pe heap || A heap-allocated trait object", "Că `x` trebuie să fie `String` || That `x` must be a `String`", "Că funcția nu poate fi apelată cu literali || That the function can't be called with literals"], "Este zahăr sintactic pentru `fn f<T: Display>(x: T)`. || It's syntactic sugar for `fn f<T: Display>(x: T)`."],
    ["Ce înseamnă `-> impl Iterator<Item = u32>`? || What does `-> impl Iterator<Item = u32>` mean?", ["Funcția întoarce un tip concret ascuns care implementează `Iterator` || The function returns one hidden concrete type implementing `Iterator`", "Poate întoarce tipuri diferite pe ramuri diferite || It can return different types on different branches", "Întoarce un `Vec<u32>` || It returns a `Vec<u32>`", "Întoarce un `Box<dyn Iterator>` || It returns a `Box<dyn Iterator>`"], "Tipul e unul singur, fixat de compilator; dacă ai nevoie de tipuri diferite pe ramuri, folosește `Box<dyn Iterator<Item = u32>>`. || It's a single type fixed by the compiler; if you need different types per branch, use `Box<dyn Iterator<Item = u32>>`."],
    ["Ce afișează? || What does it print?", ["[0, 2, 4, 6]", "[2, 4, 6]", "[0, 2, 4]", "[1, 3, 5]"], "`(0..7)` merge de la 0 la 6; păstrăm numerele pare. || `(0..7)` goes from 0 to 6; we keep the even ones.", { k: "out", c: c`
fn pare(n: u32) -> impl Iterator<Item = u32> {
    (0..n).filter(|x| x % 2 == 0)
}
fn main() {
    let v: Vec<u32> = pare(7).collect();
    println!("{:?}", v);
}` }],
    ["`Option<T>` și `Result<T, E>` sunt... || `Option<T>` and `Result<T, E>` are...", ["enum-uri generice din biblioteca standard || generic enums from the standard library", "cuvinte cheie ale limbajului || language keywords", "macro-uri || macros", "trait-uri || traits"], "Sunt definite ca `enum Option<T> { None, Some(T) }` și `enum Result<T, E> { Ok(T), Err(E) }`. || They are defined as `enum Option<T> { None, Some(T) }` and `enum Result<T, E> { Ok(T), Err(E) }`."],
    ["Ce afișează? || What does it print?", ["6 50", "3 5", "6 10", "1 10"], "`N` este dedus din lungimea array-ului: 3 și apoi 5 elemente. || `N` is inferred from the array length: 3 and then 5 elements.", { k: "out", c: c`
fn suma<const N: usize>(a: [i32; N]) -> i32 {
    a.iter().sum()
}
fn main() {
    println!("{} {}", suma([1, 2, 3]), suma([10; 5]));
}` }],
    ["Ce eroare dă? || Which error does it give?", ["E0308", "E0277", "E0369", "E0382"], "`Pereche<T>` cere ca `a` și `b` să aibă același tip `T`; aici avem întreg și `&str` (E0308, mismatched types). || `Pereche<T>` requires `a` and `b` to share the same `T`; here we have an integer and a `&str` (E0308, mismatched types).", { k: "err", err: "E0308", c: c`
struct Pereche<T> {
    a: T,
    b: T,
}
fn main() {
    let p = Pereche { a: 1, b: "doi" };
    let _ = (p.a, p.b);
}` }],
    ["Ce face `::<>` (turbofish) în `\"42\".parse::<u8>()`? || What does the `::<>` (turbofish) do in `\"42\".parse::<u8>()`?", ["Specifică explicit parametrul generic al funcției || Explicitly specifies the function's generic parameter", "Face cast la `u8` || Casts to `u8`", "Importă tipul `u8` || Imports the `u8` type", "Marchează funcția ca `unsafe` || Marks the function as `unsafe`"], "Când compilatorul nu poate deduce tipul, i-l spui cu turbofish. || When the compiler can't infer the type, you tell it with the turbofish."],
    ["Ce afișează? || What does it print?", ["Ok(42)", "Ok(\"42\")", "42", "Err(42)"], "`parse::<u8>()` întoarce `Result<u8, ParseIntError>`. || `parse::<u8>()` returns `Result<u8, ParseIntError>`.", { k: "out", c: c`
fn main() {
    println!("{:?}", "42".parse::<u8>());
}` }],
    ["Ce afișează? || What does it print?", ["true", "false", "Err", "nu compilează || doesn't compile"], "300 nu încape în `u8` (0–255), deci `parse` întoarce `Err`. || 300 doesn't fit in `u8` (0–255), so `parse` returns `Err`.", { k: "out", c: c`
fn main() {
    println!("{}", "300".parse::<u8>().is_err());
}` }],
    ["De ce `impl<T> Pereche<T>` scrie `<T>` de două ori? || Why does `impl<T> Pereche<T>` write `<T>` twice?", ["Primul declară parametrul generic, al doilea îl folosește în tip || The first declares the generic parameter, the second uses it in the type", "E o greșeală de stil, merge și fără || It's a style mistake, it works without", "Primul e pentru lifetime-uri || The first is for lifetimes", "Pentru a genera două implementări || To generate two implementations"], "Fără `impl<T>`, `T` din `Pereche<T>` ar fi interpretat ca un tip concret numit `T`. || Without `impl<T>`, the `T` in `Pereche<T>` would be read as a concrete type named `T`."],
    ["Poți scrie `impl Pereche<f64> { ... }`? || Can you write `impl Pereche<f64> { ... }`?", ["Da, metode doar pentru `Pereche<f64>` || Yes, methods only for `Pereche<f64>`", "Nu, impl trebuie să fie generic || No, impl must be generic", "Doar cu `unsafe` || Only with `unsafe`", "Doar pentru enum-uri || Only for enums"], "Poți specializa blocuri `impl` pentru tipuri concrete. || You can write `impl` blocks for specific concrete types."],
    ["Ce afișează? || What does it print?", ["[WARN] 91", "WARN 91", "[91] WARN", "[WARN]91"], "`format!(\"[{a}] {b}\")` cu `a = \"WARN\"`, `b = 91`. || `format!(\"[{a}] {b}\")` with `a = \"WARN\"`, `b = 91`.", { k: "out", c: c`
use std::fmt::Display;
fn eticheta<T: Display, U: Display>(a: T, b: U) -> String {
    format!("[{a}] {b}")
}
fn main() {
    println!("{}", eticheta("WARN", 91));
}` }],
    ["Ce face `std::mem::size_of::<Option<Box<i32>>>()` comparat cu `size_of::<Box<i32>>()`? || How does `size_of::<Option<Box<i32>>>()` compare with `size_of::<Box<i32>>()`?", ["Sunt egale: `None` folosește valoarea nulă interzisă a pointerului || They are equal: `None` uses the pointer's forbidden null value", "Option e cu 8 octeți mai mare || Option is 8 bytes larger", "Option e dublu || Option is double", "Nu compilează || It doesn't compile"], "Optimizarea „niche”: `Box` nu poate fi nul, deci `None` e codat ca pointer nul. || The “niche” optimization: `Box` can't be null, so `None` is encoded as a null pointer."],
    ["Ce afișează? || What does it print?", ["true", "false"], "Documentația garantează că `Option<Box<T>>` are aceeași dimensiune ca `Box<T>` (pentru `T: Sized`). || The docs guarantee `Option<Box<T>>` has the same size as `Box<T>` (for `T: Sized`).", { k: "out", c: c`
use std::mem::size_of;
fn main() {
    println!("{}", size_of::<Option<Box<i32>>>() == size_of::<Box<i32>>());
}` }],
    ["Ce eroare primești când compilatorul nu poate deduce tipul generic? || Which error do you get when the compiler can't infer a generic type?", ["E0282 (type annotations needed) || E0282 (type annotations needed)", "E0382", "E0499", "E0425"], "De exemplu `let v = Vec::new();` fără nicio folosire care să fixeze tipul elementelor. || For example `let v = Vec::new();` with no use that fixes the element type."],
    ["Ce eroare dă? || Which error does it give?", ["E0282", "E0308", "E0277", "E0599"], "Nimic nu fixează tipul elementelor vectorului (E0282, type annotations needed). Notă: un `collect()` fără tip dă E0283. || Nothing fixes the vector's element type (E0282, type annotations needed). Note: an untyped `collect()` gives E0283.", { k: "err", err: "E0282", c: c`
fn main() {
    let v = Vec::new();
    let _ = v;
}` }],
    ["Genericele în Rust pot avea valori implicite pentru parametri de tip, ca `struct S<T = i32>`? || Can Rust generics have default type parameters, like `struct S<T = i32>`?", ["Da, de exemplu `HashMap<K, V, S = RandomState>` || Yes, e.g. `HashMap<K, V, S = RandomState>`", "Nu, niciodată || No, never", "Doar pentru funcții || Only for functions", "Doar în nightly || Only on nightly"], "Parametrii de tip impliciți există pe tipuri și trait-uri (de ex. `Add<Rhs = Self>`). || Default type parameters exist on types and traits (e.g. `Add<Rhs = Self>`)."],
    ["Ce afișează? || What does it print?", ["Pereche { a: 10, b: 42 } -> 42", "Pereche(10, 42) -> 42", "Pereche { a: 10, b: 42 } -> 10", "10 42 -> 42"], "`#[derive(Debug)]` afișează numele câmpurilor. || `#[derive(Debug)]` prints field names.", { k: "out", c: c`
#[derive(Debug)]
struct Pereche<T> { a: T, b: T }
impl<T: PartialOrd> Pereche<T> {
    fn mai_mare(&self) -> &T {
        if self.a > self.b { &self.a } else { &self.b }
    }
}
fn main() {
    let p = Pereche { a: 10, b: 42 };
    println!("{:?} -> {:?}", p, p.mai_mare());
}` }]
  ]);
})();

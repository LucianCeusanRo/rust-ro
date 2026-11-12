(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 2,
    icon: "📦",
    title: { ro: "Variabile, tipuri și mutabilitate", en: "Variables, types & mutability" },
    summary: {
      ro: "Variabilele sunt imutabile implicit. Vezi <code>mut</code>, shadowing, constante și tipurile de bază.",
      en: "Variables are immutable by default. Learn <code>mut</code>, shadowing, constants and the basic types."
    },
    sections: [
      {
        h: { ro: "Imutabil implicit", en: "Immutable by default" },
        p: {
          ro: "<code>let x = 5;</code> nu mai poate fi modificat. Dacă vrei să schimbi valoarea, ceri explicit: <code>let mut x</code>. Codul de mai jos <b>nu compilează</b> intenționat — deschide-l în Playground și citește eroarea E0384; compilatorul îți sugerează chiar soluția.",
          en: "<code>let x = 5;</code> cannot be changed later. If you want to change it you must ask explicitly: <code>let mut x</code>. The code below <b>does not compile</b> on purpose — open it in the Playground and read error E0384; the compiler even suggests the fix."
        },
        code: c`
fn main() {
    let pachete = 10;
    println!("{pachete}");
    pachete = 11; // eroare: variabila nu e mut
    println!("{pachete}");
}`,
        fails: "E0384"
      },
      {
        h: { ro: "mut și shadowing", en: "mut and shadowing" },
        p: {
          ro: "<code>mut</code> permite modificarea valorii, dar tipul rămâne același. <b>Shadowing</b> înseamnă să declari din nou o variabilă cu același nume prin <code>let</code>; noua variabilă o „ascunde” pe cea veche și poate avea alt tip.",
          en: "<code>mut</code> lets you change the value, but the type stays the same. <b>Shadowing</b> means declaring a variable with the same name again with <code>let</code>; the new one “hides” the old one and may have a different type."
        },
        code: c`
fn main() {
    let mut contor = 0;
    contor += 1;
    contor += 1;
    println!("contor = {contor}");

    let port = "8080";                     // &str
    let port: u16 = port.parse().unwrap(); // acum u16 (shadowing)
    println!("port + 1 = {}", port + 1);
}`
      },
      {
        h: { ro: "Tipuri scalare și compuse", en: "Scalar and compound types" },
        p: {
          ro: "Întregi: <code>i8..i128</code> (cu semn), <code>u8..u128</code> (fără semn), <code>usize</code> pentru indecși. Implicit, un întreg e <code>i32</code>, iar un număr zecimal <code>f64</code>. <code>bool</code> e <code>true/false</code>, iar <code>char</code> e un caracter Unicode pe 4 octeți. Tipuri compuse: tuplu <code>(&amp;str, u32)</code> și array cu lungime fixă <code>[u8; 4]</code>.",
          en: "Integers: <code>i8..i128</code> (signed), <code>u8..u128</code> (unsigned), <code>usize</code> for indexes. By default an integer is <code>i32</code> and a decimal number is <code>f64</code>. <code>bool</code> is <code>true/false</code> and <code>char</code> is a 4-byte Unicode character. Compound types: tuple <code>(&amp;str, u32)</code> and fixed-length array <code>[u8; 4]</code>."
        },
        code: c`
fn main() {
    let ttl: u8 = 64;
    let temperatura = -3;      // i32
    let pierdere = 0.25;       // f64
    let activ = true;
    let litera = 'ș';          // char Unicode
    let ip: [u8; 4] = [192, 168, 1, 10];
    let link: (&str, u32) = ("ge-0/0/1", 1000);

    println!("{ttl} {temperatura} {pierdere} {activ} {litera}");
    println!("{}.{}.{}.{}", ip[0], ip[1], ip[2], ip[3]);
    println!("{} @ {} Mbps", link.0, link.1);
    println!("char = {} octeți", std::mem::size_of::<char>());
}`
      },
      {
        h: { ro: "Constante, conversii și overflow", en: "Constants, casts and overflow" },
        p: {
          ro: "<code>const</code> cere tip explicit și se scrie cu MAJUSCULE. Conversiile între numere se fac explicit cu <code>as</code>; Rust nu face conversii ascunse. Pentru calcule care pot depăși limita folosește <code>checked_add</code> (întoarce <code>Option</code>) sau <code>wrapping_add</code>.",
          en: "<code>const</code> needs an explicit type and is written in UPPERCASE. Numeric conversions are explicit with <code>as</code>; Rust does no hidden conversions. For arithmetic that may overflow use <code>checked_add</code> (returns an <code>Option</code>) or <code>wrapping_add</code>."
        },
        code: c`
const MTU: u32 = 1500;

fn main() {
    let octeti: u64 = 4_500;
    let cadre = octeti as f64 / MTU as f64;
    println!("cadre ≈ {:.1}", cadre);

    let x: u8 = 250;
    println!("{:?}", x.checked_add(10)); // None
    println!("{}", x.wrapping_add(10));  // 4
}`
      }
    ],
    exercises: [
      {
        title: { ro: "Celsius → Fahrenheit", en: "Celsius → Fahrenheit" },
        task: {
          ro: "Completează <code>main</code> astfel încât să transforme <code>c = 36.6</code> în Fahrenheit (<code>F = C × 9/5 + 32</code>) și să afișeze cu o zecimală.",
          en: "Complete <code>main</code> so it converts <code>c = 36.6</code> to Fahrenheit (<code>F = C × 9/5 + 32</code>) and prints it with one decimal."
        },
        hint: { ro: "Folosește <code>9.0 / 5.0</code> (f64), nu <code>9 / 5</code> (care la întregi dă 1).", en: "Use <code>9.0 / 5.0</code> (f64), not <code>9 / 5</code> (which is 1 with integers)." },
        starter: c`
fn main() {
    let c = 36.6;
    let f = 0.0; // TODO
    println!("{c} °C = {:.1} °F", f);
}`,
        solution: c`
fn main() {
    let c = 36.6;
    let f = c * 9.0 / 5.0 + 32.0;
    println!("{c} °C = {:.1} °F", f);
}`
      },
      {
        title: { ro: "Shadowing pentru input", en: "Shadowing for input" },
        task: {
          ro: "Ai <code>let vlan = \" 120 \";</code> (text cu spații). Folosește shadowing ca să obții un <code>u16</code> și afișează <code>vlan * 2</code>.",
          en: "You have <code>let vlan = \" 120 \";</code> (text with spaces). Use shadowing to get a <code>u16</code> and print <code>vlan * 2</code>."
        },
        hint: { ro: "<code>let vlan: u16 = vlan.trim().parse().unwrap();</code>", en: "<code>let vlan: u16 = vlan.trim().parse().unwrap();</code>" },
        starter: c`
fn main() {
    let vlan = " 120 ";
    // TODO: shadowing
    println!("{}", vlan);
}`,
        solution: c`
fn main() {
    let vlan = " 120 ";
    let vlan: u16 = vlan.trim().parse().unwrap();
    println!("{}", vlan * 2);
}`
      }
    ],
    quiz: [
      { q: { ro: "Ce se întâmplă la <code>let x = 5; x = 6;</code>?", en: "What happens with <code>let x = 5; x = 6;</code>?" },
        o: { ro: ["x devine 6", "Eroare de compilare: x nu e mut", "Panic la rulare", "Doar un warning, apoi rulează"], en: ["x becomes 6", "Compile error: x is not mut", "Runtime panic", "Just a warning, then it runs"] },
        a: 1, e: { ro: "Variabilele sunt imutabile implicit; compilatorul dă eroarea E0384 și sugerează <code>let mut x</code>.", en: "Variables are immutable by default; the compiler emits E0384 and suggests <code>let mut x</code>." } },
      { q: { ro: "Care e tipul implicit pentru <code>let n = 7;</code>?", en: "What is the default type of <code>let n = 7;</code>?" },
        o: { ro: ["i64", "u32", "i32", "usize"], en: ["i64", "u32", "i32", "usize"] },
        a: 2, e: { ro: "Dacă nimic nu forțează alt tip, întregii sunt <code>i32</code>.", en: "When nothing forces another type, integers default to <code>i32</code>." } },
      { q: { ro: "Ce poate face shadowing și <code>mut</code> nu poate?", en: "What can shadowing do that <code>mut</code> cannot?" },
        o: { ro: ["Să schimbe tipul variabilei", "Să facă variabila globală", "Să evite orice copiere", "Nimic, sunt identice"], en: ["Change the variable's type", "Make the variable global", "Avoid any copying", "Nothing, they are identical"] },
        a: 0, e: { ro: "Cu <code>let</code> repetat creezi o variabilă nouă, deci poate avea alt tip (de ex. din <code>&amp;str</code> în <code>u16</code>).", en: "A repeated <code>let</code> creates a new variable, so it can have a different type (e.g. from <code>&amp;str</code> to <code>u16</code>)." } },
      { q: { ro: "Câți octeți ocupă un <code>char</code> în Rust?", en: "How many bytes does a <code>char</code> take in Rust?" },
        o: { ro: ["1", "2", "4", "Variabil"], en: ["1", "2", "4", "Variable"] },
        a: 2, e: { ro: "<code>char</code> reprezintă o valoare scalară Unicode și are mereu 4 octeți. În <code>String</code> textul e stocat ca UTF-8, cu lungime variabilă.", en: "<code>char</code> is a Unicode scalar value and is always 4 bytes. Inside a <code>String</code> text is stored as variable-length UTF-8." } },
      { q: { ro: "Ce înseamnă <code>[u8; 4]</code>?", en: "What does <code>[u8; 4]</code> mean?" },
        o: { ro: ["Un vector care crește până la 4", "Un array de 4 elemente u8", "Un u8 cu valoarea 4", "Un tuplu de 4 tipuri"], en: ["A vector growing up to 4", "An array of 4 u8 elements", "A u8 with value 4", "A tuple of 4 types"] },
        a: 1, e: { ro: "Array cu lungime fixă, cunoscută la compilare: 4 elemente <code>u8</code> — perfect pentru o adresă IPv4.", en: "A fixed-length array known at compile time: 4 <code>u8</code> elements — perfect for an IPv4 address." } },
      { q: { ro: "Ce e obligatoriu la <code>const</code>?", en: "What is mandatory for a <code>const</code>?" },
        o: { ro: ["Să fie mut", "Tipul explicit", "Să fie în main", "Să fie String"], en: ["Being mut", "An explicit type", "Being inside main", "Being a String"] },
        a: 1, e: { ro: "<code>const MTU: u32 = 1500;</code> — tipul trebuie scris. Constantele nu pot fi niciodată <code>mut</code>.", en: "<code>const MTU: u32 = 1500;</code> — the type must be written. Constants can never be <code>mut</code>." } },
      { q: { ro: "Ce întoarce <code>250u8.checked_add(10)</code>?", en: "What does <code>250u8.checked_add(10)</code> return?" },
        o: { ro: ["Some(260)", "4", "None", "Panic"], en: ["Some(260)", "4", "None", "Panic"] },
        a: 2, e: { ro: "260 nu încape în <code>u8</code> (max 255), deci <code>checked_add</code> întoarce <code>None</code>. <code>wrapping_add</code> ar da 4.", en: "260 does not fit in a <code>u8</code> (max 255), so <code>checked_add</code> returns <code>None</code>. <code>wrapping_add</code> would give 4." } }
    ]
  });
})();

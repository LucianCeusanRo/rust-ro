(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 6,
    icon: "🛟",
    title: { ro: "Tratarea erorilor: Result, Option și ?", en: "Error handling: Result, Option & ?" },
    summary: {
      ro: "Rust nu are null și nici excepții. Lipsa unei valori e un <code>Option</code>, iar o operație care poate eșua întoarce un <code>Result</code>.",
      en: "Rust has no null and no exceptions. A missing value is an <code>Option</code> and an operation that can fail returns a <code>Result</code>."
    },
    sections: [
      {
        h: { ro: "Option<T>: valoarea poate lipsi", en: "Option<T>: the value may be absent" },
        p: {
          ro: "<code>Option&lt;T&gt;</code> este fie <code>Some(valoare)</code>, fie <code>None</code>. Compilatorul te obligă să tratezi ambele cazuri înainte să folosești valoarea, deci nu există „null pointer exception”.",
          en: "<code>Option&lt;T&gt;</code> is either <code>Some(value)</code> or <code>None</code>. The compiler forces you to handle both cases before using the value, so there is no “null pointer exception”."
        },
        code: c`
fn gaseste_vlan(nume: &str) -> Option<u16> {
    match nume {
        "voce" => Some(20),
        "date" => Some(10),
        _ => None,
    }
}

fn main() {
    for n in ["voce", "camere"] {
        match gaseste_vlan(n) {
            Some(id) => println!("{n} => VLAN {id}"),
            None => println!("{n} => nu există"),
        }
    }
    // valoare implicită / default value
    println!("{}", gaseste_vlan("camere").unwrap_or(1));
}`
      },
      {
        h: { ro: "Result<T, E>: operația poate eșua", en: "Result<T, E>: the operation may fail" },
        p: {
          ro: "<code>Result&lt;T, E&gt;</code> este <code>Ok(valoare)</code> sau <code>Err(eroare)</code>. De exemplu, <code>\"abc\".parse::&lt;u16&gt;()</code> întoarce <code>Err</code>. <code>unwrap()</code> și <code>expect(\"mesaj\")</code> scot valoarea, dar dau <b>panic</b> la eroare — bune pentru prototipuri și teste, nu pentru input de la utilizator.",
          en: "<code>Result&lt;T, E&gt;</code> is <code>Ok(value)</code> or <code>Err(error)</code>. For example <code>\"abc\".parse::&lt;u16&gt;()</code> returns <code>Err</code>. <code>unwrap()</code> and <code>expect(\"msg\")</code> extract the value but <b>panic</b> on error — fine for prototypes and tests, not for user input."
        },
        code: c`
fn main() {
    for text in ["443", "abc", "70000"] {
        match text.parse::<u16>() {
            Ok(port) => println!("{text} => port {port}"),
            Err(e) => println!("{text} => eroare: {e}"),
        }
    }
}`
      },
      {
        h: { ro: "Operatorul ?", en: "The ? operator" },
        p: {
          ro: "<code>?</code> pus după un <code>Result</code> înseamnă: dacă e <code>Ok</code>, scoate valoarea; dacă e <code>Err</code>, <b>întoarce imediat</b> eroarea din funcția curentă (convertind-o cu <code>From</code> dacă e nevoie). Merge doar în funcții care întorc <code>Result</code> (sau <code>Option</code>). Chiar și <code>main</code> poate întoarce <code>Result</code>.",
          en: "<code>?</code> after a <code>Result</code> means: if it's <code>Ok</code>, unwrap the value; if it's <code>Err</code>, <b>return</b> the error from the current function right away (converting it with <code>From</code> if needed). It only works in functions that return <code>Result</code> (or <code>Option</code>). Even <code>main</code> can return a <code>Result</code>."
        },
        code: c`
use std::error::Error;
use std::num::ParseIntError;

fn citeste_ip(text: &str) -> Result<[u8; 4], String> {
    let parti: Vec<&str> = text.split('.').collect();
    if parti.len() != 4 {
        return Err(format!("„{text}” nu are 4 octeți"));
    }
    let mut ip = [0u8; 4];
    for (i, p) in parti.iter().enumerate() {
        ip[i] = p.parse().map_err(|e: ParseIntError| format!("„{p}”: {e}"))?;
    }
    Ok(ip)
}

fn main() -> Result<(), Box<dyn Error>> {
    println!("{:?}", citeste_ip("10.0.0.1")?);
    println!("{:?}", citeste_ip("10.0.300.1"));
    println!("{:?}", citeste_ip("10.0.1"));
    Ok(())
}`
      },
      {
        h: { ro: "Erori proprii", en: "Custom errors" },
        p: {
          ro: "În aplicații reale definești un <code>enum</code> de erori și implementezi <code>Display</code>, ca mesajele să fie clare. <code>ok_or</code> transformă un <code>Option</code> în <code>Result</code>. Folosește <code>panic!</code> doar pentru bug-uri care n-ar trebui să apară niciodată.",
          en: "In real apps you define an error <code>enum</code> and implement <code>Display</code> so messages are clear. <code>ok_or</code> turns an <code>Option</code> into a <code>Result</code>. Use <code>panic!</code> only for bugs that should never happen."
        },
        code: c`
use std::fmt;

#[derive(Debug)]
enum EroareConfig {
    Lipsa(&'static str),
    Invalid(String),
}

impl fmt::Display for EroareConfig {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            EroareConfig::Lipsa(cheie) => write!(f, "lipsește cheia „{cheie}”"),
            EroareConfig::Invalid(v) => write!(f, "valoare invalidă: {v}"),
        }
    }
}

fn citeste_mtu(valoare: Option<&str>) -> Result<u32, EroareConfig> {
    let text = valoare.ok_or(EroareConfig::Lipsa("mtu"))?;
    let mtu: u32 = text
        .parse()
        .map_err(|_| EroareConfig::Invalid(text.to_string()))?;
    if !(576..=9216).contains(&mtu) {
        return Err(EroareConfig::Invalid(text.to_string()));
    }
    Ok(mtu)
}

fn main() {
    for v in [Some("1500"), Some("jumbo"), Some("100"), None] {
        match citeste_mtu(v) {
            Ok(m) => println!("MTU = {m}"),
            Err(e) => println!("eroare: {e}"),
        }
    }
}`
      }
    ],
    exercises: [
      {
        title: { ro: "parse_port", en: "parse_port" },
        task: {
          ro: "Scrie <code>fn parse_port(s: &amp;str) -&gt; Result&lt;u16, String&gt;</code> care acceptă doar porturile 1..=65535 și ignoră spațiile.",
          en: "Write <code>fn parse_port(s: &amp;str) -&gt; Result&lt;u16, String&gt;</code> that only accepts ports 1..=65535 and ignores whitespace."
        },
        hint: { ro: "<code>s.trim().parse::&lt;u16&gt;().map_err(|e| e.to_string())?</code>, apoi verifici că nu e 0.", en: "<code>s.trim().parse::&lt;u16&gt;().map_err(|e| e.to_string())?</code>, then check it's not 0." },
        starter: c`
fn parse_port(s: &str) -> Result<u16, String> {
    todo!("{s}")
}

fn main() {
    for t in [" 22 ", "0", "http", "65535"] {
        println!("{t:?} => {:?}", parse_port(t));
    }
}`,
        solution: c`
fn parse_port(s: &str) -> Result<u16, String> {
    let port = s.trim().parse::<u16>().map_err(|e| e.to_string())?;
    if port == 0 {
        return Err(String::from("portul 0 este rezervat"));
    }
    Ok(port)
}

fn main() {
    for t in [" 22 ", "0", "http", "65535"] {
        println!("{t:?} => {:?}", parse_port(t));
    }
}`
      },
      {
        title: { ro: "Suma liniilor cu ?", en: "Sum of lines with ?" },
        task: {
          ro: "Scrie <code>fn suma(text: &amp;str) -&gt; Result&lt;i64, ParseIntError&gt;</code> care adună câte un număr de pe fiecare linie și se oprește la prima eroare, folosind <code>?</code>.",
          en: "Write <code>fn suma(text: &amp;str) -&gt; Result&lt;i64, ParseIntError&gt;</code> (sum) that adds one number per line and stops at the first error, using <code>?</code>."
        },
        hint: { ro: "<code>for linie in text.lines() { total += linie.trim().parse::&lt;i64&gt;()?; }</code>", en: "<code>for line in text.lines() { total += line.trim().parse::&lt;i64&gt;()?; }</code>" },
        starter: c`
use std::num::ParseIntError;

fn suma(text: &str) -> Result<i64, ParseIntError> {
    todo!("{text}")
}

fn main() {
    println!("{:?}", suma("10\n20\n12"));
    println!("{:?}", suma("10\ndoi\n12"));
}`,
        solution: c`
use std::num::ParseIntError;

fn suma(text: &str) -> Result<i64, ParseIntError> {
    let mut total = 0;
    for linie in text.lines() {
        total += linie.trim().parse::<i64>()?;
    }
    Ok(total)
}

fn main() {
    println!("{:?}", suma("10\n20\n12"));  // Ok(42)
    println!("{:?}", suma("10\ndoi\n12")); // Err(ParseIntError { .. })
}`
      }
    ],
    quiz: [
      { q: { ro: "Ce face <code>?</code> pe un <code>Err</code>?", en: "What does <code>?</code> do on an <code>Err</code>?" },
        o: { ro: ["Dă panic", "Întoarce imediat eroarea din funcția curentă", "Ignoră eroarea", "Reîncearcă operația"], en: ["Panics", "Returns the error from the current function right away", "Ignores the error", "Retries the operation"] },
        a: 1, e: { ro: "E o prescurtare pentru un <code>match</code> care face <code>return Err(From::from(e))</code>.", en: "It's shorthand for a <code>match</code> that does <code>return Err(From::from(e))</code>." } },
      { q: { ro: "Poți folosi <code>?</code> pe un <code>Result</code> într-un <code>fn main()</code> fără tip returnat?", en: "Can you use <code>?</code> on a <code>Result</code> in <code>fn main()</code> with no return type?" },
        o: { ro: ["Da, mereu", "Nu — main trebuie să întoarcă Result", "Doar în release", "Doar împreună cu unwrap"], en: ["Yes, always", "No — main must return a Result", "Only in release", "Only together with unwrap"] },
        a: 1, e: { ro: "<code>?</code> are nevoie de un tip returnat compatibil. Scrie <code>fn main() -&gt; Result&lt;(), Box&lt;dyn Error&gt;&gt;</code>.", en: "<code>?</code> needs a compatible return type. Write <code>fn main() -&gt; Result&lt;(), Box&lt;dyn Error&gt;&gt;</code>." } },
      { q: { ro: "Ce reprezintă <code>Option&lt;T&gt;</code>?", en: "What does <code>Option&lt;T&gt;</code> represent?" },
        o: { ro: ["O eroare", "O valoare care poate lipsi", "Un pointer nul", "O listă"], en: ["An error", "A value that may be absent", "A null pointer", "A list"] },
        a: 1, e: { ro: "<code>Some(T)</code> sau <code>None</code> — înlocuiește null-ul din alte limbaje.", en: "<code>Some(T)</code> or <code>None</code> — it replaces null from other languages." } },
      { q: { ro: "Ce face <code>unwrap()</code> pe un <code>Err</code>?", en: "What does <code>unwrap()</code> do on an <code>Err</code>?" },
        o: { ro: ["Întoarce 0", "Dă panic", "Întoarce None", "Nimic"], en: ["Returns 0", "Panics", "Returns None", "Nothing"] },
        a: 1, e: { ro: "De aceea, în cod de producție preferi <code>match</code>, <code>?</code> sau <code>unwrap_or</code>.", en: "That's why in production code you prefer <code>match</code>, <code>?</code> or <code>unwrap_or</code>." } },
      { q: { ro: "Ce întoarce <code>\"abc\".parse::&lt;i32&gt;()</code>?", en: "What does <code>\"abc\".parse::&lt;i32&gt;()</code> return?" },
        o: { ro: ["0", "None", "Err(ParseIntError)", "Panic"], en: ["0", "None", "Err(ParseIntError)", "Panic"] },
        a: 2, e: { ro: "<code>parse</code> întoarce <code>Result</code>; pentru întregi eroarea e <code>ParseIntError</code> („invalid digit found in string”).", en: "<code>parse</code> returns a <code>Result</code>; for integers the error is <code>ParseIntError</code> (“invalid digit found in string”)." } },
      { q: { ro: "Ce face <code>opt.ok_or(e)</code>?", en: "What does <code>opt.ok_or(e)</code> do?" },
        o: { ro: ["Transformă Option în Result", "Transformă Result în Option", "Dă panic la None", "Ignoră e"], en: ["Turns an Option into a Result", "Turns a Result into an Option", "Panics on None", "Ignores e"] },
        a: 0, e: { ro: "<code>Some(v)</code> devine <code>Ok(v)</code>, <code>None</code> devine <code>Err(e)</code> — apoi poți folosi <code>?</code>.", en: "<code>Some(v)</code> becomes <code>Ok(v)</code>, <code>None</code> becomes <code>Err(e)</code> — then you can use <code>?</code>." } },
      { q: { ro: "Când e potrivit <code>panic!</code>?", en: "When is <code>panic!</code> appropriate?" },
        o: { ro: ["Pentru input greșit de la utilizator", "Pentru bug-uri și stări imposibile, irecuperabile", "Pentru un timeout de rețea", "Niciodată"], en: ["For bad user input", "For bugs and impossible, unrecoverable states", "For a network timeout", "Never"] },
        a: 1, e: { ro: "Erorile așteptate (input, rețea, fișiere) se tratează cu <code>Result</code>; <code>panic!</code> e pentru situații care indică un bug.", en: "Expected errors (input, network, files) are handled with <code>Result</code>; <code>panic!</code> is for situations that indicate a bug." } }
    ]
  });
})();

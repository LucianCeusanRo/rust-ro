(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 5,
    icon: "🧩",
    title: { ro: "Structuri, enum-uri și match", en: "Structs, enums & match" },
    summary: {
      ro: "Îți modelezi datele cu <code>struct</code> și <code>enum</code>, adaugi metode cu <code>impl</code> și tratezi fiecare caz cu <code>match</code>.",
      en: "Model your data with <code>struct</code> and <code>enum</code>, add methods with <code>impl</code> and handle every case with <code>match</code>."
    },
    sections: [
      {
        h: { ro: "struct și impl", en: "struct and impl" },
        p: {
          ro: "Un <code>struct</code> grupează câmpuri cu nume. În blocul <code>impl</code> pui metode (<code>&amp;self</code> citește, <code>&amp;mut self</code> modifică) și funcții asociate, precum constructorul convențional <code>new</code>, apelat cu <code>Tip::new()</code>. <code>#[derive(Debug)]</code> permite afișarea cu <code>{:?}</code> / <code>{:#?}</code>.",
          en: "A <code>struct</code> groups named fields. In an <code>impl</code> block you add methods (<code>&amp;self</code> reads, <code>&amp;mut self</code> modifies) and associated functions such as the conventional constructor <code>new</code>, called as <code>Type::new()</code>. <code>#[derive(Debug)]</code> enables printing with <code>{:?}</code> / <code>{:#?}</code>."
        },
        code: c`
#[derive(Debug)]
struct Interfata {
    nume: String,
    viteza_mbps: u32,
    activa: bool,
}

impl Interfata {
    fn new(nume: &str, viteza_mbps: u32) -> Self {
        Interfata { nume: nume.to_string(), viteza_mbps, activa: true }
    }

    fn descriere(&self) -> String {
        let stare = if self.activa { "up" } else { "down" };
        format!("{} {} Mbps [{}]", self.nume, self.viteza_mbps, stare)
    }

    fn opreste(&mut self) {
        self.activa = false;
    }
}

fn main() {
    let mut eth = Interfata::new("ge-0/0/1", 1000);
    println!("{}", eth.descriere());
    eth.opreste();
    println!("{:#?}", eth);
}`
      },
      {
        h: { ro: "enum cu date", en: "Enums with data" },
        p: {
          ro: "Un <code>enum</code> descrie o valoare care este <b>una</b> din mai multe variante, iar fiecare variantă poate avea datele ei. E ideal pentru stări: un link e fie Up, fie Down de un număr de secunde, fie Degradat cu un procent de pierdere.",
          en: "An <code>enum</code> describes a value that is <b>one</b> of several variants, and each variant can carry its own data. Ideal for states: a link is either Up, Down for some number of seconds, or Degraded with a loss percentage."
        },
        code: c`
#[derive(Debug)]
enum StareLink {
    Up,
    Down { de_secunde: u32 },
    Degradat(u8), // pierdere în % / loss in %
}

fn alarma(s: &StareLink) -> String {
    match s {
        StareLink::Up => String::from("OK"),
        StareLink::Down { de_secunde } if *de_secunde > 300 => {
            format!("CRITIC: căzut de {de_secunde}s")
        }
        StareLink::Down { de_secunde } => format!("căzut de {de_secunde}s"),
        StareLink::Degradat(p) => format!("pierdere {p}%"),
    }
}

fn main() {
    let stari = [
        StareLink::Up,
        StareLink::Down { de_secunde: 45 },
        StareLink::Down { de_secunde: 900 },
        StareLink::Degradat(7),
    ];
    for s in &stari {
        println!("{:?} => {}", s, alarma(s));
    }
}`
      },
      {
        h: { ro: "match, _ și if let", en: "match, _ and if let" },
        p: {
          ro: "<code>match</code> este <b>exhaustiv</b>: compilatorul refuză codul dacă uiți un caz. <code>_</code> prinde tot ce a rămas. Pattern-urile pot avea alternative (<code>22 | 80</code>), intervale (<code>1..=1023</code>) și condiții (<i>guards</i>, <code>if</code>). Când te interesează un singur caz, <code>if let</code> e mai scurt.",
          en: "<code>match</code> is <b>exhaustive</b>: the compiler rejects the code if you forget a case. <code>_</code> catches everything left. Patterns can have alternatives (<code>22 | 80</code>), ranges (<code>1..=1023</code>) and conditions (<i>guards</i>, <code>if</code>). When you care about one case only, <code>if let</code> is shorter."
        },
        code: c`
fn tip_port(p: u16) -> &'static str {
    match p {
        0 => "rezervat",
        22 | 80 | 443 => "bine-cunoscut (ssh/http/https)",
        1..=1023 => "port sistem",
        1024..=49151 => "port înregistrat",
        _ => "dinamic/privat",
    }
}

fn main() {
    for p in [0, 22, 161, 8080, 50000] {
        println!("{p}: {}", tip_port(p));
    }

    let gateway: Option<&str> = Some("10.0.0.1");
    if let Some(gw) = gateway {
        println!("gateway = {gw}");
    }
}`
      }
    ],
    exercises: [
      {
        title: { ro: "Struct Router", en: "Router struct" },
        task: {
          ro: "Pentru <code>struct Router { nume: String, interfete: u8 }</code> scrie <code>fn new</code> și metoda <code>fn e_mare(&amp;self) -&gt; bool</code>, care întoarce <code>true</code> dacă routerul are peste 24 de interfețe.",
          en: "For <code>struct Router { nume: String, interfete: u8 }</code> write <code>fn new</code> and the method <code>fn e_mare(&amp;self) -&gt; bool</code> (is_big), returning <code>true</code> when the router has more than 24 interfaces."
        },
        hint: { ro: "<code>self.interfete &gt; 24</code>", en: "<code>self.interfete &gt; 24</code>" },
        starter: c`
struct Router {
    nume: String,
    interfete: u8,
}

// TODO: impl Router { fn new(...) -> Self, fn e_mare(&self) -> bool }

fn main() {
    let r = Router { nume: String::from("R1"), interfete: 48 };
    println!("{} are {} interfețe", r.nume, r.interfete);
}`,
        solution: c`
struct Router {
    nume: String,
    interfete: u8,
}

impl Router {
    fn new(nume: &str, interfete: u8) -> Self {
        Router { nume: nume.to_string(), interfete }
    }

    fn e_mare(&self) -> bool {
        self.interfete > 24
    }
}

fn main() {
    let r = Router::new("R1", 48);
    println!("{} mare? {}", r.nume, r.e_mare());
    let mic = Router::new("R2", 8);
    println!("{} mare? {}", mic.nume, mic.e_mare());
}`
      },
      {
        title: { ro: "Enum Protocol", en: "Protocol enum" },
        task: {
          ro: "Pentru <code>enum Protocol { Tcp(u16), Udp(u16), Icmp }</code> scrie o funcție care întoarce un text: <code>\"TCP/443\"</code>, <code>\"UDP/53\"</code>, <code>\"ICMP\"</code>.",
          en: "For <code>enum Protocol { Tcp(u16), Udp(u16), Icmp }</code> write a function returning text such as <code>\"TCP/443\"</code>, <code>\"UDP/53\"</code>, <code>\"ICMP\"</code>."
        },
        hint: { ro: "<code>Protocol::Tcp(port) =&gt; format!(\"TCP/{port}\")</code>", en: "<code>Protocol::Tcp(port) =&gt; format!(\"TCP/{port}\")</code>" },
        starter: c`
#[allow(dead_code)]
enum Protocol {
    Tcp(u16),
    Udp(u16),
    Icmp,
}

fn eticheta(p: &Protocol) -> String {
    let _ = p;
    todo!()
}

fn main() {
    for p in [Protocol::Tcp(443), Protocol::Udp(53), Protocol::Icmp] {
        println!("{}", eticheta(&p));
    }
}`,
        solution: c`
enum Protocol {
    Tcp(u16),
    Udp(u16),
    Icmp,
}

fn eticheta(p: &Protocol) -> String {
    match p {
        Protocol::Tcp(port) => format!("TCP/{port}"),
        Protocol::Udp(port) => format!("UDP/{port}"),
        Protocol::Icmp => String::from("ICMP"),
    }
}

fn main() {
    for p in [Protocol::Tcp(443), Protocol::Udp(53), Protocol::Icmp] {
        println!("{}", eticheta(&p));
    }
}`
      }
    ],
    quiz: [
      { q: { ro: "Ce înseamnă că <code>match</code> e exhaustiv?", en: "What does it mean that <code>match</code> is exhaustive?" },
        o: { ro: ["Rulează toate ramurile", "Trebuie să acopere toate valorile posibile", "E mai lent decât if", "Acceptă doar numere"], en: ["It runs every arm", "It must cover every possible value", "It's slower than if", "It only accepts numbers"] },
        a: 1, e: { ro: "Dacă lipsește o variantă, compilatorul dă eroarea E0004 și îți spune exact ce caz lipsește.", en: "If a variant is missing the compiler reports E0004 and tells you exactly which case is missing." } },
      { q: { ro: "Ce înseamnă <code>&amp;self</code> într-o metodă?", en: "What does <code>&amp;self</code> mean in a method?" },
        o: { ro: ["Metoda preia obiectul", "Metoda împrumută obiectul doar pentru citire", "Metoda e statică", "Metoda modifică obiectul"], en: ["The method takes ownership", "The method borrows the object read-only", "The method is static", "The method mutates the object"] },
        a: 1, e: { ro: "<code>&amp;self</code> = împrumut imutabil. Pentru modificare folosești <code>&amp;mut self</code>, iar <code>self</code> preia proprietatea.", en: "<code>&amp;self</code> = immutable borrow. To modify use <code>&amp;mut self</code>; <code>self</code> takes ownership." } },
      { q: { ro: "Cum apelezi funcția asociată <code>new</code> a lui <code>Router</code>?", en: "How do you call <code>Router</code>'s associated function <code>new</code>?" },
        o: { ro: ["Router.new()", "new Router()", "Router::new()", "Router-&gt;new()"], en: ["Router.new()", "new Router()", "Router::new()", "Router-&gt;new()"] },
        a: 2, e: { ro: "Funcțiile asociate (fără <code>self</code>) se apelează cu <code>::</code>. Rust nu are cuvântul cheie <code>new</code>.", en: "Associated functions (no <code>self</code>) are called with <code>::</code>. Rust has no <code>new</code> keyword." } },
      { q: { ro: "La ce folosește <code>#[derive(Debug)]</code>?", en: "What is <code>#[derive(Debug)]</code> for?" },
        o: { ro: ["Activează modul debug al compilatorului", "Generează implementarea pentru afișarea cu {:?}", "Adaugă breakpoint-uri", "Face struct-ul Copy"], en: ["Turns on compiler debug mode", "Generates the implementation for {:?} printing", "Adds breakpoints", "Makes the struct Copy"] },
        a: 1, e: { ro: "<code>derive</code> generează automat implementarea trait-ului <code>Debug</code>.", en: "<code>derive</code> auto-generates the <code>Debug</code> trait implementation." } },
      { q: { ro: "Ce face <code>_</code> într-un <code>match</code>?", en: "What does <code>_</code> do in a <code>match</code>?" },
        o: { ro: ["Sare peste match", "Prinde toate valorile neacoperite", "E o eroare", "Potrivește doar 0"], en: ["Skips the match", "Catches all remaining values", "It's an error", "Matches only 0"] },
        a: 1, e: { ro: "Este pattern-ul „orice altceva”; pus ultimul, face match-ul exhaustiv.", en: "It's the “anything else” pattern; placed last it makes the match exhaustive." } },
      { q: { ro: "Pot variantele unui enum să aibă date diferite?", en: "Can enum variants hold different data?" },
        o: { ro: ["Nu, sunt simple constante", "Da, fiecare variantă poate avea alte tipuri sau câmpuri", "Doar numere", "Doar cu #[derive]"], en: ["No, they're plain constants", "Yes, each variant can carry different types or fields", "Only numbers", "Only with #[derive]"] },
        a: 1, e: { ro: "Ex.: <code>Down { de_secunde: u32 }</code> și <code>Degradat(u8)</code> în același enum.", en: "E.g. <code>Down { de_secunde: u32 }</code> and <code>Degradat(u8)</code> in the same enum." } },
      { q: { ro: "Când e potrivit <code>if let</code>?", en: "When is <code>if let</code> a good fit?" },
        o: { ro: ["Când te interesează un singur pattern", "Când vrei o buclă", "Doar cu numere", "Niciodată, e depreciat"], en: ["When you care about a single pattern", "When you want a loop", "Only with numbers", "Never, it's deprecated"] },
        a: 0, e: { ro: "<code>if let Some(x) = opt { ... }</code> evită un <code>match</code> cu ramura goală <code>_ =&gt; {}</code>.", en: "<code>if let Some(x) = opt { ... }</code> avoids a <code>match</code> with an empty <code>_ =&gt; {}</code> arm." } }
    ]
  });
})();

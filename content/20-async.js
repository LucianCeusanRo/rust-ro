(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 17, icon: "⚡", level: 3,
    title: { ro: "Async/await cu Tokio", en: "Async/await with Tokio" },
    summary: {
      ro: "Programarea asincronă lasă un singur fir să aștepte mii de operații I/O simultan. Înveți <code>async fn</code>, <code>.await</code>, <code>Future</code>, runtime-ul Tokio, <code>tokio::spawn</code>, <code>join!</code>, <code>select!</code>, timeout-uri și canale async. Exemplele sunt verificate cu tokio 1.x.",
      en: "Async programming lets a single thread wait on thousands of I/O operations at once. You learn <code>async fn</code>, <code>.await</code>, <code>Future</code>, the Tokio runtime, <code>tokio::spawn</code>, <code>join!</code>, <code>select!</code>, timeouts and async channels. Examples are checked with tokio 1.x."
    },
    sections: [
      { h: { ro: "async fn, Future și runtime", en: "async fn, Future and the runtime" },
        p: { ro: "Un <code>async fn</code> întoarce un <code>Future</code> — o valoare care <b>nu face nimic</b> până nu e „poll-uită”. <code>.await</code> o rulează și cedează firul cât timp așteaptă. Rust nu are runtime inclus: <code>#[tokio::main]</code> pornește unul. Adaugi Tokio cu <code>cargo add tokio --features full</code>.",
             en: "An <code>async fn</code> returns a <code>Future</code> — a value that <b>does nothing</b> until it's polled. <code>.await</code> drives it and yields the thread while waiting. Rust has no built-in runtime: <code>#[tokio::main]</code> starts one. Add Tokio with <code>cargo add tokio --features full</code>." },
        code: c`
use std::time::Duration;
use tokio::time::sleep;

async fn verifica(host: &str, ms: u64) -> String {
    sleep(Duration::from_millis(ms)).await; // simulează I/O
    format!("{host}: ok în {ms}ms")
}

#[tokio::main]
async fn main() {
    let f = verifica("r1", 20); // încă nu rulează nimic
    println!("future creat");
    println!("{}", f.await);
}`, crate: "tokio" },
      { h: { ro: "Concurență: join! și spawn", en: "Concurrency: join! and spawn" },
        p: { ro: "<code>tokio::join!(a, b)</code> rulează mai multe future-uri <b>concurent</b> în același task: timpul total ≈ cel mai lung, nu suma. <code>tokio::spawn</code> creează un task independent (ca un fir ușor) și întoarce un <code>JoinHandle</code>; future-ul trimis trebuie să fie <code>Send + 'static</code>.",
             en: "<code>tokio::join!(a, b)</code> runs several futures <b>concurrently</b> in the same task: total time ≈ the longest, not the sum. <code>tokio::spawn</code> creates an independent task (like a lightweight thread) and returns a <code>JoinHandle</code>; the future must be <code>Send + 'static</code>." },
        code: c`
use std::time::{Duration, Instant};
use tokio::time::sleep;

async fn verifica(host: &'static str, ms: u64) -> (&'static str, u64) {
    sleep(Duration::from_millis(ms)).await;
    (host, ms)
}

#[tokio::main]
async fn main() {
    let start = Instant::now();
    let (a, b, c) = tokio::join!(verifica("r1", 100), verifica("r2", 100), verifica("r3", 100));
    println!("{:?} {:?} {:?}", a, b, c);
    println!("concurent: {}", start.elapsed() < Duration::from_millis(250));

    let handles: Vec<_> = ["sw1", "sw2"].into_iter().map(|h| tokio::spawn(verifica(h, 10))).collect();
    for h in handles {
        println!("{:?}", h.await.unwrap());
    }
}`, crate: "tokio" },
      { h: { ro: "Timeout și select!", en: "Timeouts and select!" },
        p: { ro: "<code>tokio::time::timeout(dur, fut)</code> întoarce <code>Err(Elapsed)</code> dacă future-ul nu termină la timp. <code>tokio::select!</code> așteaptă mai multe future-uri și continuă cu <b>primul</b> care termină; celelalte sunt anulate (eliberate).",
             en: "<code>tokio::time::timeout(dur, fut)</code> returns <code>Err(Elapsed)</code> if the future doesn't finish in time. <code>tokio::select!</code> waits on several futures and continues with the <b>first</b> one to finish; the others are cancelled (dropped)." },
        code: c`
use std::time::Duration;
use tokio::time::{sleep, timeout};

#[tokio::main]
async fn main() {
    let lent = sleep(Duration::from_millis(500));
    match timeout(Duration::from_millis(50), lent).await {
        Ok(_) => println!("la timp"),
        Err(_) => println!("timeout după 50ms"),
    }

    tokio::select! {
        _ = sleep(Duration::from_millis(10)) => println!("primul: rapid"),
        _ = sleep(Duration::from_millis(300)) => println!("primul: lent"),
    }
}`, crate: "tokio" },
      { h: { ro: "Canale async și când NU folosești async", en: "Async channels and when NOT to use async" },
        p: { ro: "<code>tokio::sync::mpsc</code> e versiunea async a canalului (cu buffer limitat). Nu bloca runtime-ul: <code>std::thread::sleep</code> sau calcule grele într-un task opresc toate celelalte task-uri de pe acel fir — pentru CPU greu folosește <code>tokio::task::spawn_blocking</code> sau fire normale. Async merită pentru I/O mult (servere, clienți de rețea), nu pentru calcule.",
             en: "<code>tokio::sync::mpsc</code> is the async channel (bounded buffer). Don't block the runtime: <code>std::thread::sleep</code> or heavy computation inside a task stalls every other task on that thread — for CPU-heavy work use <code>tokio::task::spawn_blocking</code> or plain threads. Async pays off for lots of I/O (servers, network clients), not for computation." },
        code: c`
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(8);
    for i in 0..3 {
        let tx = tx.clone();
        tokio::spawn(async move {
            tx.send(format!("eveniment {i}")).await.unwrap();
        });
    }
    drop(tx);
    let mut v = Vec::new();
    while let Some(m) = rx.recv().await {
        v.push(m);
    }
    v.sort();
    println!("{:?}", v);

    let suma = tokio::task::spawn_blocking(|| (1..=1_000_000u64).sum::<u64>()).await.unwrap();
    println!("{suma}");
}`, crate: "tokio" }
    ],
    exercises: [
      { title: { ro: "Verificare cu timeout", en: "Check with a timeout" },
        task: { ro: "Pentru fiecare pereche (host, latență ms) rulează <code>verifica</code> cu un timeout de 100 ms, concurent (<code>tokio::spawn</code>). Afișează <code>host: ok</code> sau <code>host: timeout</code>, în ordinea listei. Rezultat așteptat: <code>r1: ok</code>, <code>r2: timeout</code>, <code>r3: ok</code>. Rulează în Rust Playground (are tokio).", en: "For each (host, latency ms) pair run <code>verifica</code> with a 100 ms timeout, concurrently (<code>tokio::spawn</code>). Print <code>host: ok</code> or <code>host: timeout</code>, in list order. Expected: <code>r1: ok</code>, <code>r2: timeout</code>, <code>r3: ok</code>. Runs on the Rust Playground (it has tokio)." },
        hint: { ro: "<code>tokio::spawn(async move { (h, timeout(Duration::from_millis(100), verifica(ms)).await.is_ok()) })</code>, apoi <code>.await</code> pe fiecare handle în ordine.", en: "<code>tokio::spawn(async move { (h, timeout(Duration::from_millis(100), verifica(ms)).await.is_ok()) })</code>, then <code>.await</code> each handle in order." },
        starter: c`
use std::time::Duration;
use tokio::time::{sleep, timeout};

async fn verifica(ms: u64) {
    sleep(Duration::from_millis(ms)).await;
}

#[tokio::main]
async fn main() {
    let tinte = [("r1", 10u64), ("r2", 400), ("r3", 30)];
    for (h, ms) in tinte {
        // TODO: timeout + spawn
        let _ = (timeout(Duration::from_millis(1), verifica(ms)), h);
    }
}`,
        solution: c`
use std::time::Duration;
use tokio::time::{sleep, timeout};

async fn verifica(ms: u64) {
    sleep(Duration::from_millis(ms)).await;
}

#[tokio::main]
async fn main() {
    let tinte = [("r1", 10u64), ("r2", 400), ("r3", 30)];
    let handles: Vec<_> = tinte
        .into_iter()
        .map(|(h, ms)| tokio::spawn(async move { (h, timeout(Duration::from_millis(100), verifica(ms)).await.is_ok()) }))
        .collect();
    for hd in handles {
        let (h, ok) = hd.await.unwrap();
        println!("{h}: {}", if ok { "ok" } else { "timeout" });
    }
}`,
        expect: "r1: ok\nr2: timeout\nr3: ok", crate: "tokio" }
    ]
  });
  QB("l17", [
    ["Ce întoarce un `async fn`? || What does an `async fn` return?", ["Un `Future` care trebuie așteptat cu `.await` || A `Future` that must be awaited with `.await`", "Rezultatul direct || The result directly", "Un fir de execuție || A thread", "Un `JoinHandle` || A `JoinHandle`"], "Corpul rulează abia când future-ul e poll-uit. || The body only runs when the future is polled."],
    ["Ce afișează? || What does it print?", ["future creat\nr1: ok în 20ms", "r1: ok în 20ms\nfuture creat", "future creat", "r1: ok în 20ms"], "Crearea future-ului nu rulează corpul; `.await` îl rulează. || Creating the future doesn't run the body; `.await` does.", { k: "out", crate: "tokio", c: c`
use std::time::Duration;
async fn verifica(host: &str, ms: u64) -> String {
    tokio::time::sleep(Duration::from_millis(ms)).await;
    format!("{host}: ok în {ms}ms")
}
#[tokio::main]
async fn main() {
    let f = verifica("r1", 20);
    println!("future creat");
    println!("{}", f.await);
}` }],
    ["Are Rust un runtime async inclus în biblioteca standard? || Does Rust ship an async runtime in the standard library?", ["Nu; alegi unul, de exemplu Tokio || No; you pick one, e.g. Tokio", "Da, `std::async` || Yes, `std::async`", "Da, pornește automat || Yes, it starts automatically", "Doar pe Linux || Only on Linux"], "Std oferă trait-ul `Future` și sintaxa `async/await`; executorul vine din crate-uri. || std provides the `Future` trait and the `async/await` syntax; the executor comes from crates."],
    ["Ce face `#[tokio::main]`? || What does `#[tokio::main]` do?", ["Transformă `async fn main` într-un `main` normal care pornește runtime-ul Tokio || Turns `async fn main` into a normal `main` that starts the Tokio runtime", "Face programul multi-proces || Makes the program multi-process", "Importă tot Tokio || Imports all of Tokio", "Pornește un server web || Starts a web server"], "E un macro atribut (procedural). || It's an attribute (procedural) macro."],
    ["Ce eroare primești la `.await` într-o funcție care nu e `async`? || What error do you get using `.await` in a non-`async` function?", ["E0728", "E0277", "E0308", "E0425"], "E0728: `await` e permis doar în funcții și blocuri `async`. || E0728: `await` is only allowed inside `async` functions and blocks.", { k: "err", err: "E0728", c: c`
async fn f() -> u8 { 1 }
fn main() {
    let x = f().await;
    println!("{x}");
}` }],
    ["Cât durează aproximativ `tokio::join!` pe trei future-uri de câte 100 ms? || Roughly how long does `tokio::join!` take on three 100 ms futures?", ["~100 ms (rulează concurent) || ~100 ms (they run concurrently)", "~300 ms", "~0 ms", "~33 ms"], "Așteptările se suprapun; timpul total ≈ cel mai lung future. || The waits overlap; total time ≈ the longest future."],
    ["Ce afișează? || What does it print?", ["(\"r1\", 100) (\"r2\", 100) (\"r3\", 100)\nconcurent: true", "(\"r1\", 100) (\"r2\", 100) (\"r3\", 100)\nconcurent: false", "concurent: true", "nu compilează || doesn't compile"], "Cele trei așteptări rulează în paralel, deci totalul e sub 250 ms. || The three waits run concurrently, so the total is under 250 ms.", { k: "out", crate: "tokio", c: c`
use std::time::{Duration, Instant};
async fn verifica(host: &'static str, ms: u64) -> (&'static str, u64) {
    tokio::time::sleep(Duration::from_millis(ms)).await;
    (host, ms)
}
#[tokio::main]
async fn main() {
    let start = Instant::now();
    let (a, b, c) = tokio::join!(verifica("r1", 100), verifica("r2", 100), verifica("r3", 100));
    println!("{:?} {:?} {:?}", a, b, c);
    println!("concurent: {}", start.elapsed() < Duration::from_millis(250));
}` }],
    ["Ce cere `tokio::spawn` de la future-ul primit? || What does `tokio::spawn` require of its future?", ["`Send + 'static` (poate rula pe alt fir al runtime-ului, oricât) || `Send + 'static` (it may run on another runtime thread, for any duration)", "Să fie `Copy` || To be `Copy`", "Să întoarcă `()` || To return `()`", "Nimic || Nothing"], "De aceea folosești `async move` și date deținute. || That's why you use `async move` and owned data."],
    ["Ce întoarce `.await` pe un `JoinHandle` de la `tokio::spawn`? || What does `.await` on a `JoinHandle` from `tokio::spawn` return?", ["`Result<T, JoinError>` || `Result<T, JoinError>`", "`T` direct || `T` directly", "`Option<T>`", "`()`"], "`Err` dacă task-ul a dat panic sau a fost anulat. || `Err` if the task panicked or was cancelled."],
    ["Ce afișează? || What does it print?", ["timeout după 50ms\nprimul: rapid", "la timp\nprimul: rapid", "timeout după 50ms\nprimul: lent", "la timp\nprimul: lent"], "500 ms > 50 ms, deci timeout. `select!` continuă cu ramura de 10 ms. || 500 ms > 50 ms, so it times out. `select!` continues with the 10 ms branch.", { k: "out", crate: "tokio", c: c`
use std::time::Duration;
use tokio::time::{sleep, timeout};
#[tokio::main]
async fn main() {
    match timeout(Duration::from_millis(50), sleep(Duration::from_millis(500))).await {
        Ok(_) => println!("la timp"),
        Err(_) => println!("timeout după 50ms"),
    }
    tokio::select! {
        _ = sleep(Duration::from_millis(10)) => println!("primul: rapid"),
        _ = sleep(Duration::from_millis(300)) => println!("primul: lent"),
    }
}` }],
    ["Ce se întâmplă cu ramurile pierzătoare în `tokio::select!`? || What happens to the losing branches in `tokio::select!`?", ["Future-urile lor sunt eliberate (anulate) || Their futures are dropped (cancelled)", "Continuă în fundal || They continue in the background", "Dau panic || They panic", "Sunt rulate după || They run afterwards"], "Anularea în Rust async = drop. Ai grijă la operațiile care nu sunt sigure la anulare. || Cancellation in async Rust = drop. Watch out for operations that aren't cancellation-safe."],
    ["De ce e rău `std::thread::sleep` într-un task Tokio? || Why is `std::thread::sleep` bad inside a Tokio task?", ["Blochează firul runtime-ului și oprește celelalte task-uri de pe el || It blocks the runtime thread and stalls the other tasks on it", "Nu compilează || It doesn't compile", "E mai precis || It's more precise", "Nu e nicio problemă || It's fine"], "Folosește `tokio::time::sleep(...).await`. || Use `tokio::time::sleep(...).await`."],
    ["Unde rulezi calcule CPU grele într-o aplicație Tokio? || Where do you run CPU-heavy work in a Tokio app?", ["`tokio::task::spawn_blocking` sau fire separate || `tokio::task::spawn_blocking` or separate threads", "Direct în task || Directly in the task", "În `select!` || In `select!`", "În `#[tokio::main]` || In `#[tokio::main]`"], "`spawn_blocking` folosește un pool separat de fire. || `spawn_blocking` uses a separate thread pool."],
    ["Ce afișează? || What does it print?", ["[\"eveniment 0\", \"eveniment 1\", \"eveniment 2\"]\n500000500000", "[]\n0", "[\"eveniment 2\"]\n500000500000", "nu se termină || never ends"], "Suma 1..=1.000.000 = 500000500000. `recv()` întoarce `None` după ce toți `Sender`-ii au fost eliberați. || The sum 1..=1,000,000 = 500000500000. `recv()` returns `None` after every `Sender` is dropped.", { k: "out", crate: "tokio", c: c`
use tokio::sync::mpsc;
#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(8);
    for i in 0..3 {
        let tx = tx.clone();
        tokio::spawn(async move { tx.send(format!("eveniment {i}")).await.unwrap(); });
    }
    drop(tx);
    let mut v = Vec::new();
    while let Some(m) = rx.recv().await { v.push(m); }
    v.sort();
    println!("{:?}", v);
    let s = tokio::task::spawn_blocking(|| (1..=1_000_000u64).sum::<u64>()).await.unwrap();
    println!("{s}");
}` }],
    ["Ce înseamnă că un canal `tokio::sync::mpsc::channel(8)` e „bounded”? || What does it mean that `tokio::sync::mpsc::channel(8)` is “bounded”?", ["Bufferul ține cel mult 8 mesaje; `send().await` așteaptă când e plin (backpressure) || The buffer holds at most 8 messages; `send().await` waits when it's full (backpressure)", "Poate avea doar 8 producători || It can have only 8 producers", "Mesajele au maximum 8 octeți || Messages are at most 8 bytes", "Se închide după 8 mesaje || It closes after 8 messages"], "Backpressure-ul previne creșterea nelimitată a memoriei. || Backpressure prevents unbounded memory growth."],
    ["Async face un calcul CPU mai rapid? || Does async make CPU-bound computation faster?", ["Nu; ajută la multe operații I/O care așteaptă || No; it helps with many I/O operations that wait", "Da, mereu || Yes, always", "Da, de 2 ori || Yes, 2x", "Doar în release || Only in release"], "Pentru paralelism CPU folosești fire sau crate-uri precum `rayon`. || For CPU parallelism use threads or crates like `rayon`."],
    ["Ce face `async move { ... }`? || What does `async move { ... }` do?", ["Creează un future care preia proprietatea variabilelor capturate || Creates a future that takes ownership of its captures", "Mută future-ul pe alt fir || Moves the future to another thread", "Rulează imediat || Runs immediately", "E o eroare de sintaxă || It's a syntax error"], "La fel ca `move` la closure-uri. || Same as `move` for closures."],
    ["Ce eroare dă? (future creat dar neașteptat într-un `main` sync) || What happens? (future created but not awaited in a sync `main`)", ["Compilează cu un avertisment `unused_must_use`; corpul nu rulează niciodată || Compiles with an `unused_must_use` warning; the body never runs", "E0728", "Panic la rulare || Runtime panic", "Corpul rulează în fundal || The body runs in the background"], "Future-urile sunt leneșe și marcate `#[must_use]`. || Futures are lazy and marked `#[must_use]`.", { k: "ok", c: c`
async fn scrie() { println!("nu apare"); }
fn main() {
    let _ = scrie();
}` }],
    ["Ce afișează? || What does it print?", ["r1: ok\nr2: timeout\nr3: ok", "r1: ok\nr2: ok\nr3: ok", "r2: timeout\nr1: ok\nr3: ok", "r1: timeout\nr2: timeout\nr3: timeout"], "400 ms depășește timeout-ul de 100 ms; rezultatele sunt afișate în ordinea handle-urilor. || 400 ms exceeds the 100 ms timeout; results are printed in handle order.", { k: "out", crate: "tokio", c: c`
use std::time::Duration;
use tokio::time::{sleep, timeout};
async fn verifica(ms: u64) { sleep(Duration::from_millis(ms)).await; }
#[tokio::main]
async fn main() {
    let t = [("r1", 10u64), ("r2", 400), ("r3", 30)];
    let hs: Vec<_> = t.into_iter().map(|(h, ms)| tokio::spawn(async move { (h, timeout(Duration::from_millis(100), verifica(ms)).await.is_ok()) })).collect();
    for hd in hs {
        let (h, ok) = hd.await.unwrap();
        println!("{h}: {}", if ok { "ok" } else { "timeout" });
    }
}` }],
    ["Care feature Tokio activează aproape tot (runtime, net, time, macros…)? || Which Tokio feature turns on almost everything (runtime, net, time, macros…)?", ["`full`", "`all`", "`default`", "`std`"], "`cargo add tokio --features full`. Pentru binare mici activezi doar ce îți trebuie. || `cargo add tokio --features full`. For small binaries enable only what you need."],
    ["Ce este un „task” în Tokio? || What is a “task” in Tokio?", ["O unitate de execuție async ușoară, planificată de runtime pe câteva fire || A lightweight async unit of execution, scheduled by the runtime on a few threads", "Un fir de sistem || An OS thread", "Un proces || A process", "Un `Mutex` || A `Mutex`"], "Poți avea sute de mii de task-uri; firele de sistem sunt mult mai scumpe. || You can have hundreds of thousands of tasks; OS threads are far more expensive."]
  ]);
})();

(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 16, icon: "🧵", level: 3,
    title: { ro: "Concurență: fire, canale, Arc<Mutex>", en: "Concurrency: threads, channels, Arc<Mutex>" },
    summary: {
      ro: "„Fearless concurrency”: compilatorul refuză data races. Înveți <code>thread::spawn</code>, <code>join</code>, <code>thread::scope</code>, canale <code>mpsc</code>, <code>Arc&lt;Mutex&lt;T&gt;&gt;</code>, <code>RwLock</code>, tipurile atomice și trait-urile <code>Send</code>/<code>Sync</code>.",
      en: "“Fearless concurrency”: the compiler rejects data races. You learn <code>thread::spawn</code>, <code>join</code>, <code>thread::scope</code>, <code>mpsc</code> channels, <code>Arc&lt;Mutex&lt;T&gt;&gt;</code>, <code>RwLock</code>, atomic types and the <code>Send</code>/<code>Sync</code> traits."
    },
    sections: [
      { h: { ro: "spawn, join și scope", en: "spawn, join and scope" },
        p: { ro: "<code>thread::spawn</code> pornește un fir de sistem și întoarce un <code>JoinHandle</code>; <code>join()</code> așteaptă rezultatul. Ordinea în care rulează firele nu e garantată. <code>thread::scope</code> (Rust 1.63+) permite firelor să <b>împrumute</b> date locale, pentru că toate se termină înainte de finalul scope-ului.",
             en: "<code>thread::spawn</code> starts an OS thread and returns a <code>JoinHandle</code>; <code>join()</code> waits for its result. The order threads run in is not guaranteed. <code>thread::scope</code> (Rust 1.63+) lets threads <b>borrow</b> local data, because they all finish before the scope ends." },
        code: c`
use std::thread;

fn main() {
    let handles: Vec<_> = (1..=3)
        .map(|i| thread::spawn(move || i * 10))
        .collect();
    let rez: Vec<i32> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    println!("{:?}", rez); // join în ordine => rezultate în ordine

    let date = vec![1, 2, 3, 4, 5, 6];
    let (st, dr) = date.split_at(3);
    let (a, b) = thread::scope(|s| {
        let ha = s.spawn(|| st.iter().sum::<i32>());
        let hb = s.spawn(|| dr.iter().sum::<i32>());
        (ha.join().unwrap(), hb.join().unwrap())
    });
    println!("{a} + {b} = {}", a + b);
}` },
      { h: { ro: "Canale mpsc", en: "mpsc channels" },
        p: { ro: "„Nu comunica partajând memorie; partajează memorie comunicând.” <code>mpsc::channel()</code> dă un <code>Sender</code> (clonabil — mai mulți producători) și un <code>Receiver</code> (un singur consumator). Iterarea pe receiver se oprește când toți <code>Sender</code>-ii au fost eliberați.",
             en: "“Don't communicate by sharing memory; share memory by communicating.” <code>mpsc::channel()</code> gives a <code>Sender</code> (clonable — multiple producers) and a <code>Receiver</code> (single consumer). Iterating the receiver stops once every <code>Sender</code> has been dropped." },
        code: c`
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    for id in 0..3 {
        let tx = tx.clone();
        thread::spawn(move || {
            tx.send(format!("worker {id}: ok")).unwrap();
        });
    }
    drop(tx); // altfel bucla de mai jos n-ar mai termina
    let mut mesaje: Vec<String> = rx.iter().collect();
    mesaje.sort();
    println!("{:?}", mesaje);
}` },
      { h: { ro: "Arc<Mutex<T>> și atomice", en: "Arc<Mutex<T>> and atomics" },
        p: { ro: "<code>Arc</code> = <code>Rc</code> cu contor atomic, sigur între fire. <code>Mutex</code> permite acces exclusiv: <code>lock()</code> întoarce un ghid (<i>guard</i>) care deblochează automat la drop. Pentru un simplu contor, <code>AtomicU64</code> e mai ieftin. <code>RwLock</code> permite mai mulți cititori sau un scriitor.",
             en: "<code>Arc</code> = <code>Rc</code> with an atomic counter, safe across threads. <code>Mutex</code> gives exclusive access: <code>lock()</code> returns a <i>guard</i> that unlocks automatically when dropped. For a plain counter, <code>AtomicU64</code> is cheaper. <code>RwLock</code> allows many readers or one writer." },
        code: c`
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let total = Arc::new(Mutex::new(0u64));
    let pachete = Arc::new(AtomicU64::new(0));
    let mut h = Vec::new();
    for _ in 0..4 {
        let total = Arc::clone(&total);
        let pachete = Arc::clone(&pachete);
        h.push(thread::spawn(move || {
            for _ in 0..1000 {
                *total.lock().unwrap() += 1500;
                pachete.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }
    for x in h {
        x.join().unwrap();
    }
    println!("{} octeți, {} pachete", *total.lock().unwrap(), pachete.load(Ordering::Relaxed));
}` },
      { h: { ro: "Send și Sync", en: "Send and Sync" },
        p: { ro: "<code>Send</code>: valoarea poate fi <b>mutată</b> pe alt fir. <code>Sync</code>: <code>&amp;T</code> poate fi <b>partajat</b> între fire. Sunt implementate automat. <code>Rc</code> și <code>RefCell</code> nu sunt <code>Sync</code> (iar <code>Rc</code> nici <code>Send</code>), de aceea compilatorul le refuză în <code>thread::spawn</code>. Atenție: Rust previne data races, dar nu și deadlock-urile.",
             en: "<code>Send</code>: the value can be <b>moved</b> to another thread. <code>Sync</code>: <code>&amp;T</code> can be <b>shared</b> between threads. They're implemented automatically. <code>Rc</code> and <code>RefCell</code> aren't <code>Sync</code> (and <code>Rc</code> isn't <code>Send</code> either), which is why the compiler rejects them in <code>thread::spawn</code>. Note: Rust prevents data races, not deadlocks." },
        code: c`
use std::sync::{Arc, RwLock};
use std::thread;

fn verifica<T: Send + Sync>() {}

fn main() {
    verifica::<Arc<RwLock<Vec<u8>>>>(); // compilează: e Send + Sync
    let cfg = Arc::new(RwLock::new(vec![1u8, 2]));
    let c2 = Arc::clone(&cfg);
    thread::spawn(move || c2.write().unwrap().push(3)).join().unwrap();
    let r1 = cfg.read().unwrap();
    let r2 = cfg.read().unwrap(); // mai mulți cititori simultan
    println!("{:?} {}", *r1, r2.len());
}` }
    ],
    exercises: [
      { title: { ro: "Ping paralel simulat", en: "Simulated parallel ping" },
        task: { ro: "Pornește câte un fir pentru fiecare host din listă; fiecare trimite pe canal <code>(host, host.len() as u32 * 10)</code> (latență simulată). Colectează, sortează și afișează. Rezultat așteptat: <code>[(\"fw\", 20), (\"r1\", 20), (\"switch\", 60)]</code>.", en: "Spawn one thread per host; each sends <code>(host, host.len() as u32 * 10)</code> (simulated latency) on the channel. Collect, sort and print. Expected: <code>[(\"fw\", 20), (\"r1\", 20), (\"switch\", 60)]</code>." },
        hint: { ro: "<code>let tx = tx.clone(); thread::spawn(move || tx.send((h, h.len() as u32 * 10)).unwrap());</code> apoi <code>drop(tx)</code>.", en: "<code>let tx = tx.clone(); thread::spawn(move || tx.send((h, h.len() as u32 * 10)).unwrap());</code> then <code>drop(tx)</code>." },
        starter: c`
use std::sync::mpsc;
use std::thread;

fn main() {
    let hosturi = ["switch", "r1", "fw"];
    let (tx, rx) = mpsc::channel::<(&str, u32)>();
    // TODO: un fir per host
    let _ = (hosturi, thread::current());
    drop(tx);
    let mut v: Vec<(&str, u32)> = rx.iter().collect();
    v.sort();
    println!("{:?}", v);
}`,
        solution: c`
use std::sync::mpsc;
use std::thread;

fn main() {
    let hosturi = ["switch", "r1", "fw"];
    let (tx, rx) = mpsc::channel::<(&str, u32)>();
    for h in hosturi {
        let tx = tx.clone();
        thread::spawn(move || tx.send((h, h.len() as u32 * 10)).unwrap());
    }
    drop(tx);
    let mut v: Vec<(&str, u32)> = rx.iter().collect();
    v.sort();
    println!("{:?}", v);
}`,
        expect: "[(\"fw\", 20), (\"r1\", 20), (\"switch\", 60)]" }
    ]
  });
  QB("l16", [
    ["Ce întoarce `thread::spawn`? || What does `thread::spawn` return?", ["Un `JoinHandle<T>` || A `JoinHandle<T>`", "Rezultatul firului || The thread's result", "Un `Mutex` || A `Mutex`", "Un PID || A PID"], "`handle.join()` întoarce `Result<T, _>`: `Err` dacă firul a dat panic. || `handle.join()` returns `Result<T, _>`: `Err` if the thread panicked."],
    ["Este garantată ordinea de execuție a firelor? || Is the execution order of threads guaranteed?", ["Nu, o decide planificatorul sistemului de operare || No, the OS scheduler decides", "Da, ordinea creării || Yes, creation order", "Da, alfabetic || Yes, alphabetical", "Da, în build-ul debug || Yes, in debug builds"], "Dacă vrei rezultate în ordine, aștepți handle-urile în ordine sau sortezi la final. || For ordered results, join the handles in order or sort at the end."],
    ["Ce afișează? || What does it print?", ["[10, 20, 30]", "[30, 20, 10]", "ordinea poate varia || the order may vary", "[1, 2, 3]"], "Firele pot rula în orice ordine, dar `join` în ordinea handle-urilor dă rezultate în ordine. || Threads may run in any order, but joining in handle order gives ordered results.", { k: "out", c: c`
use std::thread;
fn main() {
    let h: Vec<_> = (1..=3).map(|i| thread::spawn(move || i * 10)).collect();
    let r: Vec<i32> = h.into_iter().map(|h| h.join().unwrap()).collect();
    println!("{:?}", r);
}` }],
    ["Ce permite `thread::scope`? || What does `thread::scope` allow?", ["Fire care împrumută date locale, fără `move` și fără `Arc` || Threads that borrow local data, without `move` or `Arc`", "Fire fără limită de timp || Threads with no time limit", "Fire în alt proces || Threads in another process", "Fire care nu pot da panic || Threads that can't panic"], "Toate firele dintr-un scope sunt așteptate automat la finalul lui. || Every thread in a scope is joined automatically at its end."],
    ["Ce afișează? || What does it print?", ["6 + 15 = 21", "15 + 6 = 21", "21", "nu compilează || doesn't compile"], "`split_at(3)` dă [1,2,3] și [4,5,6]. || `split_at(3)` gives [1,2,3] and [4,5,6].", { k: "out", c: c`
use std::thread;
fn main() {
    let date = vec![1, 2, 3, 4, 5, 6];
    let (st, dr) = date.split_at(3);
    let (a, b) = thread::scope(|s| {
        let ha = s.spawn(|| st.iter().sum::<i32>());
        let hb = s.spawn(|| dr.iter().sum::<i32>());
        (ha.join().unwrap(), hb.join().unwrap())
    });
    println!("{a} + {b} = {}", a + b);
}` }],
    ["Ce înseamnă „mpsc”? || What does “mpsc” stand for?", ["Multiple producer, single consumer", "Multi-process shared cache", "Mutex per shared core", "Message passing secure channel"], "Poți clona `Sender`-ul; `Receiver`-ul e unul singur. || You can clone the `Sender`; there's a single `Receiver`."],
    ["Când se oprește `for m in rx`? || When does `for m in rx` stop?", ["Când toți `Sender`-ii au fost eliberați și canalul e gol || When every `Sender` has been dropped and the channel is empty", "După primul mesaj || After the first message", "Niciodată || Never", "După 1 secundă || After 1 second"], "De aceea apelezi `drop(tx)` pentru `Sender`-ul original. || That's why you `drop(tx)` the original `Sender`."],
    ["Ce afișează? || What does it print?", ["[\"worker 0: ok\", \"worker 1: ok\", \"worker 2: ok\"]", "[\"worker 2: ok\", \"worker 1: ok\", \"worker 0: ok\"]", "[]", "programul nu se termină || the program never ends"], "Mesajele sunt sortate după colectare, deci ordinea e stabilă. || The messages are sorted after collecting, so the order is stable.", { k: "out", c: c`
use std::sync::mpsc;
use std::thread;
fn main() {
    let (tx, rx) = mpsc::channel();
    for id in 0..3 {
        let tx = tx.clone();
        thread::spawn(move || tx.send(format!("worker {id}: ok")).unwrap());
    }
    drop(tx);
    let mut m: Vec<String> = rx.iter().collect();
    m.sort();
    println!("{:?}", m);
}` }],
    ["Ce e `Arc`? || What is `Arc`?", ["Un `Rc` cu contor atomic, sigur între fire || An `Rc` with an atomic counter, thread-safe", "Un mutex || A mutex", "Un canal || A channel", "Un fir de execuție || A thread"], "Arc = Atomically Reference Counted. || Arc = Atomically Reference Counted."],
    ["Ce întoarce `mutex.lock()`? || What does `mutex.lock()` return?", ["`LockResult<MutexGuard<T>>`; guard-ul deblochează la drop || `LockResult<MutexGuard<T>>`; the guard unlocks on drop", "`T` direct || `T` directly", "`bool`", "`()`"], "`Err` apare dacă un fir a dat panic ținând lacătul (mutex „otrăvit”). || `Err` happens if a thread panicked while holding the lock (a “poisoned” mutex)."],
    ["Ce afișează? || What does it print?", ["6000000 octeți, 4000 pachete", "1500 octeți, 1 pachete", "rezultatul variază || it varies", "0 octeți, 0 pachete"], "4 fire × 1000 × 1500 = 6.000.000; `Mutex` și `AtomicU64` garantează că nu se pierde nicio actualizare. || 4 threads × 1000 × 1500 = 6,000,000; `Mutex` and `AtomicU64` guarantee no update is lost.", { k: "out", c: c`
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
fn main() {
    let total = Arc::new(Mutex::new(0u64));
    let pachete = Arc::new(AtomicU64::new(0));
    let mut h = Vec::new();
    for _ in 0..4 {
        let (t, p) = (Arc::clone(&total), Arc::clone(&pachete));
        h.push(thread::spawn(move || {
            for _ in 0..1000 {
                *t.lock().unwrap() += 1500;
                p.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }
    for x in h { x.join().unwrap(); }
    println!("{} octeți, {} pachete", *total.lock().unwrap(), pachete.load(Ordering::Relaxed));
}` }],
    ["Ce înseamnă `Send`? || What does `Send` mean?", ["Valoarea poate fi mutată în siguranță pe alt fir || The value can be safely moved to another thread", "Valoarea poate fi trimisă prin rețea || The value can be sent over the network", "Valoarea e serializabilă || The value is serializable", "Valoarea e `Copy` || The value is `Copy`"], "Aproape toate tipurile sunt `Send`; excepții: `Rc`, pointerii bruti. || Almost every type is `Send`; exceptions: `Rc`, raw pointers."],
    ["Ce înseamnă `Sync`? || What does `Sync` mean?", ["`&T` poate fi partajat în siguranță între fire || `&T` can be safely shared between threads", "Tipul e sincronizat cu un server || The type syncs with a server", "Tipul are un `Mutex` intern || The type has an internal `Mutex`", "Tipul se poate clona || The type can be cloned"], "Formal: `T` e `Sync` dacă `&T` e `Send`. || Formally: `T` is `Sync` if `&T` is `Send`."],
    ["Ce eroare dă? || Which error does it give?", ["E0277", "E0373", "E0382", "E0502"], "`RefCell` nu e `Sync`, deci `Arc<RefCell<_>>` nu e `Send` (E0277). Folosește `Arc<Mutex<_>>`. || `RefCell` isn't `Sync`, so `Arc<RefCell<_>>` isn't `Send` (E0277). Use `Arc<Mutex<_>>`.", { k: "err", err: "E0277", c: c`
use std::cell::RefCell;
use std::sync::Arc;
use std::thread;
fn main() {
    let d = Arc::new(RefCell::new(0));
    let d2 = Arc::clone(&d);
    thread::spawn(move || *d2.borrow_mut() += 1).join().unwrap();
}` }],
    ["Previne Rust deadlock-urile la compilare? || Does Rust prevent deadlocks at compile time?", ["Nu; previne data races, dar deadlock-urile sunt încă posibile || No; it prevents data races, but deadlocks are still possible", "Da, mereu || Yes, always", "Da, dacă folosești `Arc` || Yes, if you use `Arc`", "Doar în release || Only in release"], "Ia lacătele mereu în aceeași ordine și ține-le cât mai puțin. || Always take locks in the same order and hold them as briefly as possible."],
    ["Ce este un data race? || What is a data race?", ["Două fire accesează aceeași memorie simultan, cel puțin unul scrie, fără sincronizare || Two threads access the same memory at once, at least one writes, without synchronization", "Două fire care rulează la fel de repede || Two threads running equally fast", "Orice bug de concurență || Any concurrency bug", "Un deadlock || A deadlock"], "Regula „un `&mut` sau mai multe `&`” plus `Send`/`Sync` le exclude în codul safe. || The “one `&mut` or many `&`” rule plus `Send`/`Sync` rule them out in safe code."],
    ["Când alegi `RwLock` în loc de `Mutex`? || When do you choose `RwLock` over `Mutex`?", ["Când sunt multe citiri și rare scrieri || When there are many reads and few writes", "Mereu, e mai rapid || Always, it's faster", "Când datele sunt `Copy` || When the data is `Copy`", "Niciodată || Never"], "`RwLock` permite mai mulți cititori simultan sau un singur scriitor. || `RwLock` allows many simultaneous readers or one writer."],
    ["Ce afișează? || What does it print?", ["[1, 2, 3] 3", "[1, 2] 2", "deadlock", "panic"], "Firul adaugă 3 cu `write()`, apoi două `read()` simultane sunt permise. || The thread pushes 3 with `write()`, then two simultaneous `read()`s are allowed.", { k: "out", c: c`
use std::sync::{Arc, RwLock};
use std::thread;
fn main() {
    let cfg = Arc::new(RwLock::new(vec![1u8, 2]));
    let c2 = Arc::clone(&cfg);
    thread::spawn(move || c2.write().unwrap().push(3)).join().unwrap();
    let r1 = cfg.read().unwrap();
    let r2 = cfg.read().unwrap();
    println!("{:?} {}", *r1, r2.len());
}` }],
    ["Pentru un simplu contor partajat, ce e mai ieftin decât `Mutex<u64>`? || For a plain shared counter, what's cheaper than `Mutex<u64>`?", ["`AtomicU64` cu `fetch_add` || `AtomicU64` with `fetch_add`", "`Rc<Cell<u64>>`", "`static mut`", "`RefCell<u64>`"], "Operațiile atomice nu blochează firul. || Atomic operations don't block the thread."],
    ["Ce întoarce `h.join()` dacă firul a dat panic? || What does `h.join()` return if the thread panicked?", ["`Err(...)` cu payload-ul panicului || `Err(...)` with the panic payload", "`Ok(())`", "Dă panic și firul principal, mereu || Always panics the main thread too", "`None`"], "Panicul unui fir nu oprește automat întregul proces. || A thread's panic doesn't automatically stop the whole process."],
    ["Ce afișează? || What does it print?", ["true", "false"], "Panicul din fir e prins de `join` ca `Err`. (Mesajul de panic apare pe stderr.) || The thread's panic is caught by `join` as `Err`. (The panic message goes to stderr.)", { k: "out", c: c`
use std::thread;
fn main() {
    let h = thread::spawn(|| { panic!("boom"); });
    println!("{}", h.join().is_err());
}` }],
    ["Ce face `mpsc::sync_channel(0)`? || What does `mpsc::sync_channel(0)` do?", ["Creează un canal fără buffer: `send` așteaptă până când mesajul e primit (rendezvous) || Creates an unbuffered channel: `send` waits until the message is received (rendezvous)", "Creează un canal infinit || Creates an infinite channel", "Nu compilează || Doesn't compile", "Închide canalul imediat || Closes the channel immediately"], "`sync_channel(n)` are un buffer de `n` mesaje; `channel()` e nelimitat. || `sync_channel(n)` has a buffer of `n` messages; `channel()` is unbounded."],
    ["Ce face `Ordering::Relaxed` la o operație atomică? || What does `Ordering::Relaxed` mean on an atomic operation?", ["Garantează doar atomicitatea operației, fără ordonare față de alte accese || Only guarantees the operation is atomic, with no ordering relative to other accesses", "Dezactivează atomicitatea || Disables atomicity", "Face operația mai lentă dar sigură || Makes it slower but safe", "E la fel ca `SeqCst` || Same as `SeqCst`"], "Suficient pentru contoare simple; pentru sincronizare între date folosești `Acquire`/`Release` sau `SeqCst`. || Enough for simple counters; to synchronize other data use `Acquire`/`Release` or `SeqCst`."]
  ]);
})();

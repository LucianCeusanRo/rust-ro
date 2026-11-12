(function () {
  const c = window.RUST_C;
  window.RUST_LESSONS.push({
    id: 18, icon: "🌐", level: 3,
    title: { ro: "Rețelistică cu std::net", en: "Networking with std::net" },
    summary: {
      ro: "Adrese IP tipizate (<code>Ipv4Addr</code>, <code>SocketAddr</code>), server și client TCP (<code>TcpListener</code>, <code>TcpStream</code>), UDP (<code>UdpSocket</code>), timeout-uri și citire pe linii cu <code>BufReader</code>. Exemplele rulează pe <code>127.0.0.1</code>, fără internet.",
      en: "Typed IP addresses (<code>Ipv4Addr</code>, <code>SocketAddr</code>), a TCP server and client (<code>TcpListener</code>, <code>TcpStream</code>), UDP (<code>UdpSocket</code>), timeouts and line reading with <code>BufReader</code>. The examples run on <code>127.0.0.1</code>, no internet needed."
    },
    sections: [
      { h: { ro: "Adrese IP tipizate", en: "Typed IP addresses" },
        p: { ro: "<code>\"10.0.0.1\".parse::&lt;Ipv4Addr&gt;()</code> validează adresa; un șir greșit dă <code>Err</code>, nu o adresă ciudată. <code>Ipv4Addr</code> are metode ca <code>is_private()</code>, <code>is_loopback()</code>, <code>octets()</code>. Poți converti în <code>u32</code> pentru calcule de subrețea.",
             en: "<code>\"10.0.0.1\".parse::&lt;Ipv4Addr&gt;()</code> validates the address; a bad string gives <code>Err</code>, not a weird address. <code>Ipv4Addr</code> has methods like <code>is_private()</code>, <code>is_loopback()</code>, <code>octets()</code>. You can convert to <code>u32</code> for subnet maths." },
        code: c`
use std::net::{Ipv4Addr, SocketAddr};

fn retea(ip: Ipv4Addr, prefix: u32) -> Ipv4Addr {
    let masca = if prefix == 0 { 0 } else { u32::MAX << (32 - prefix) };
    Ipv4Addr::from(u32::from(ip) & masca)
}

fn main() {
    let ip: Ipv4Addr = "192.168.10.77".parse().unwrap();
    println!("{} privat={} rețea={}", ip, ip.is_private(), retea(ip, 24));
    println!("{:?}", "300.1.1.1".parse::<Ipv4Addr>().is_err());
    let s: SocketAddr = "10.0.0.1:443".parse().unwrap();
    println!("{} port {}", s.ip(), s.port());
}` },
      { h: { ro: "Server și client TCP", en: "TCP server and client" },
        p: { ro: "<code>TcpListener::bind(\"127.0.0.1:0\")</code> alege un port liber (portul 0 = „alege sistemul”). <code>accept()</code> blochează până se conectează cineva. <code>TcpStream</code> implementează <code>Read</code> și <code>Write</code>. Aici serverul rulează pe un fir separat și răspunde cu textul primit, cu majuscule.",
             en: "<code>TcpListener::bind(\"127.0.0.1:0\")</code> picks a free port (port 0 = “let the OS choose”). <code>accept()</code> blocks until someone connects. <code>TcpStream</code> implements <code>Read</code> and <code>Write</code>. Here the server runs on a separate thread and echoes the text back in upper case." },
        code: c`
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let adresa = listener.local_addr()?;
    let server = thread::spawn(move || -> std::io::Result<()> {
        let (mut s, _) = listener.accept()?;
        let mut buf = [0u8; 64];
        let n = s.read(&mut buf)?;
        s.write_all(String::from_utf8_lossy(&buf[..n]).to_uppercase().as_bytes())?;
        Ok(())
    });

    let mut client = TcpStream::connect(adresa)?;
    client.write_all(b"ping")?;
    let mut raspuns = String::new();
    client.read_to_string(&mut raspuns)?;
    println!("{raspuns}");
    server.join().unwrap()?;
    Ok(())
}` },
      { h: { ro: "Protocol pe linii și timeout-uri", en: "Line protocols and timeouts" },
        p: { ro: "TCP e un flux de octeți, nu de mesaje: un <code>read</code> poate întoarce o bucată dintr-un mesaj. De aceea protocoalele text folosesc delimitatori (de obicei <code>\\n</code>), citiți cu <code>BufReader::read_line</code> sau <code>lines()</code>. Pune mereu timeout-uri (<code>set_read_timeout</code>, <code>connect_timeout</code>) ca un peer blocat să nu te blocheze.",
             en: "TCP is a byte stream, not a message stream: one <code>read</code> may return part of a message. That's why text protocols use delimiters (usually <code>\\n</code>), read with <code>BufReader::read_line</code> or <code>lines()</code>. Always set timeouts (<code>set_read_timeout</code>, <code>connect_timeout</code>) so a stuck peer doesn't hang you." },
        code: c`
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

fn main() -> std::io::Result<()> {
    let l = TcpListener::bind("127.0.0.1:0")?;
    let a = l.local_addr()?;
    let h = thread::spawn(move || {
        let (s, _) = l.accept().unwrap();
        let mut w = s.try_clone().unwrap();
        for linie in BufReader::new(s).lines() {
            let linie = linie.unwrap();
            let r = match linie.as_str() {
                "PING" => "PONG".to_string(),
                cmd => format!("ERR necunoscut: {cmd}"),
            };
            writeln!(w, "{r}").unwrap();
        }
    });

    let s = TcpStream::connect_timeout(&a, Duration::from_secs(2))?;
    s.set_read_timeout(Some(Duration::from_secs(2)))?;
    let mut w = s.try_clone()?;
    let mut r = BufReader::new(s);
    for cmd in ["PING", "STATUS"] {
        writeln!(w, "{cmd}")?;
        let mut raspuns = String::new();
        r.read_line(&mut raspuns)?;
        println!("{cmd} -> {}", raspuns.trim_end());
    }
    drop(w);
    drop(r);
    h.join().unwrap();
    Ok(())
}` },
      { h: { ro: "UDP", en: "UDP" },
        p: { ro: "UDP trimite datagrame independente, fără conexiune și fără garanția livrării sau a ordinii. <code>send_to</code> / <code>recv_from</code> lucrează cu un mesaj întreg odată. E folosit de DNS, DHCP, syslog, SNMP.",
             en: "UDP sends independent datagrams, connectionless, with no delivery or ordering guarantee. <code>send_to</code> / <code>recv_from</code> work with one whole message at a time. It's used by DNS, DHCP, syslog, SNMP." },
        code: c`
use std::net::UdpSocket;
use std::time::Duration;

fn main() -> std::io::Result<()> {
    let colector = UdpSocket::bind("127.0.0.1:0")?;
    colector.set_read_timeout(Some(Duration::from_secs(2)))?;
    let dispozitiv = UdpSocket::bind("127.0.0.1:0")?;
    dispozitiv.send_to(b"<14>link up eth0", colector.local_addr()?)?;
    let mut buf = [0u8; 512];
    let (n, de_la) = colector.recv_from(&mut buf)?;
    println!("{} octeți: {}", n, String::from_utf8_lossy(&buf[..n]));
    println!("de la dispozitiv: {}", de_la == dispozitiv.local_addr()?);
    Ok(())
}` }
    ],
    exercises: [
      { title: { ro: "Calculator de subrețea", en: "Subnet calculator" },
        task: { ro: "Scrie <code>info(cidr: &amp;str) -&gt; Option&lt;(Ipv4Addr, Ipv4Addr, u32)&gt;</code> care pentru <code>\"192.168.1.130/26\"</code> întoarce adresa de rețea, broadcast și numărul de gazde utilizabile. Rezultat așteptat: <code>192.168.1.128 192.168.1.191 62</code> apoi <code>None</code>.", en: "Write <code>info(cidr: &amp;str) -&gt; Option&lt;(Ipv4Addr, Ipv4Addr, u32)&gt;</code> that for <code>\"192.168.1.130/26\"</code> returns the network address, broadcast and usable host count. Expected: <code>192.168.1.128 192.168.1.191 62</code> then <code>None</code>." },
        hint: { ro: "<code>split_once('/')</code>, apoi masca = <code>u32::MAX &lt;&lt; (32 - p)</code>; broadcast = rețea | !masca; gazde = 2^(32-p) − 2.", en: "<code>split_once('/')</code>, then mask = <code>u32::MAX &lt;&lt; (32 - p)</code>; broadcast = network | !mask; hosts = 2^(32-p) − 2." },
        starter: c`
use std::net::Ipv4Addr;

fn info(cidr: &str) -> Option<(Ipv4Addr, Ipv4Addr, u32)> {
    let _ = cidr;
    None // TODO
}

fn main() {
    if let Some((r, b, g)) = info("192.168.1.130/26") {
        println!("{r} {b} {g}");
    }
    println!("{:?}", info("10.0.0.1/40"));
}`,
        solution: c`
use std::net::Ipv4Addr;

fn info(cidr: &str) -> Option<(Ipv4Addr, Ipv4Addr, u32)> {
    let (ip, p) = cidr.split_once('/')?;
    let ip: Ipv4Addr = ip.parse().ok()?;
    let p: u32 = p.parse().ok()?;
    if !(1..=30).contains(&p) {
        return None;
    }
    let masca = u32::MAX << (32 - p);
    let retea = u32::from(ip) & masca;
    let bcast = retea | !masca;
    Some((Ipv4Addr::from(retea), Ipv4Addr::from(bcast), (1u32 << (32 - p)) - 2))
}

fn main() {
    if let Some((r, b, g)) = info("192.168.1.130/26") {
        println!("{r} {b} {g}");
    }
    println!("{:?}", info("10.0.0.1/40"));
}`,
        expect: "192.168.1.128 192.168.1.191 62\nNone" }
    ]
  });
  QB("l18", [
    ["Ce afișează? || What does it print?", ["192.168.10.77 privat=true rețea=192.168.10.0\ntrue\n10.0.0.1 port 443", "192.168.10.77 privat=false rețea=192.168.10.0\ntrue\n10.0.0.1 port 443", "192.168.10.77 privat=true rețea=192.168.0.0\nfalse\n10.0.0.1 port 443", "192.168.10.77 privat=true rețea=192.168.10.77\ntrue\n10.0.0.1:443 port 443"], "192.168.0.0/16 e privat; /24 păstrează primii 3 octeți; 300 nu încape într-un octet. || 192.168.0.0/16 is private; /24 keeps the first 3 octets; 300 doesn't fit in an octet.", { k: "out", c: c`
use std::net::{Ipv4Addr, SocketAddr};
fn retea(ip: Ipv4Addr, prefix: u32) -> Ipv4Addr {
    let masca = if prefix == 0 { 0 } else { u32::MAX << (32 - prefix) };
    Ipv4Addr::from(u32::from(ip) & masca)
}
fn main() {
    let ip: Ipv4Addr = "192.168.10.77".parse().unwrap();
    println!("{} privat={} rețea={}", ip, ip.is_private(), retea(ip, 24));
    println!("{:?}", "300.1.1.1".parse::<Ipv4Addr>().is_err());
    let s: SocketAddr = "10.0.0.1:443".parse().unwrap();
    println!("{} port {}", s.ip(), s.port());
}` }],
    ["Ce afișează? || What does it print?", ["PING", "ping", "Ping", "nimic || nothing"], "Serverul transformă textul primit în majuscule. || The server upper-cases the received text.", { k: "out", c: c`
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let adresa = listener.local_addr()?;
    let server = thread::spawn(move || -> std::io::Result<()> {
        let (mut s, _) = listener.accept()?;
        let mut buf = [0u8; 64];
        let n = s.read(&mut buf)?;
        s.write_all(String::from_utf8_lossy(&buf[..n]).to_uppercase().as_bytes())?;
        Ok(())
    });
    let mut client = TcpStream::connect(adresa)?;
    client.write_all(b"ping")?;
    let mut raspuns = String::new();
    client.read_to_string(&mut raspuns)?;
    println!("{raspuns}");
    server.join().unwrap()?;
    Ok(())
}` }],
    ["Ce înseamnă portul 0 în `TcpListener::bind(\"127.0.0.1:0\")`? || What does port 0 mean in `TcpListener::bind(\"127.0.0.1:0\")`?", ["Sistemul de operare alege un port liber || The OS picks a free port", "Portul 0 propriu-zis || Literally port 0", "Toate porturile || All ports", "Eroare || An error"], "Afli portul ales cu `local_addr()`. || You find the chosen port with `local_addr()`."],
    ["Ce face `listener.accept()`? || What does `listener.accept()` do?", ["Blochează până la o conexiune nouă și întoarce `(TcpStream, SocketAddr)` || Blocks until a new connection and returns `(TcpStream, SocketAddr)`", "Trimite date || Sends data", "Închide socket-ul || Closes the socket", "Întoarce imediat `None` || Returns `None` immediately"], "Pentru mai mulți clienți: `for s in listener.incoming()` și un fir sau task per client. || For several clients: `for s in listener.incoming()` and a thread or task per client."],
    ["De ce poate un `read()` pe TCP să întoarcă doar o parte dintr-un mesaj? || Why can a TCP `read()` return only part of a message?", ["TCP e un flux de octeți, fără granițe de mesaj || TCP is a byte stream with no message boundaries", "Din cauza unui bug în Rust || Because of a bug in Rust", "Doar în modul debug || Only in debug mode", "Nu poate || It can't"], "Folosește un delimitator (`\\n`) sau un prefix de lungime. || Use a delimiter (`\\n`) or a length prefix."],
    ["Ce afișează? || What does it print?", ["PING -> PONG\nSTATUS -> ERR necunoscut: STATUS", "PING -> PING\nSTATUS -> STATUS", "PING -> PONG", "se blochează || hangs"], "Serverul citește linie cu linie și răspunde la fiecare. || The server reads line by line and replies to each.", { k: "out", c: c`
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;
fn main() -> std::io::Result<()> {
    let l = TcpListener::bind("127.0.0.1:0")?;
    let a = l.local_addr()?;
    let h = thread::spawn(move || {
        let (s, _) = l.accept().unwrap();
        let mut w = s.try_clone().unwrap();
        for linie in BufReader::new(s).lines() {
            let linie = linie.unwrap();
            let r = match linie.as_str() {
                "PING" => "PONG".to_string(),
                cmd => format!("ERR necunoscut: {cmd}"),
            };
            writeln!(w, "{r}").unwrap();
        }
    });
    let s = TcpStream::connect_timeout(&a, Duration::from_secs(2))?;
    s.set_read_timeout(Some(Duration::from_secs(2)))?;
    let mut w = s.try_clone()?;
    let mut r = BufReader::new(s);
    for cmd in ["PING", "STATUS"] {
        writeln!(w, "{cmd}")?;
        let mut raspuns = String::new();
        r.read_line(&mut raspuns)?;
        println!("{cmd} -> {}", raspuns.trim_end());
    }
    drop(w);
    drop(r);
    h.join().unwrap();
    Ok(())
}` }],
    ["Ce face `s.try_clone()` pe un `TcpStream`? || What does `s.try_clone()` do on a `TcpStream`?", ["Creează un al doilea handle către același socket (de ex. unul pentru citire, unul pentru scriere) || Creates a second handle to the same socket (e.g. one for reading, one for writing)", "Deschide o conexiune nouă || Opens a new connection", "Copiază datele primite || Copies the received data", "Închide socket-ul vechi || Closes the old socket"], "Ambele handle-uri folosesc aceeași conexiune. || Both handles share the same connection."],
    ["De ce setezi `set_read_timeout`? || Why set `set_read_timeout`?", ["Ca un `read` să nu blocheze la nesfârșit dacă peer-ul nu răspunde || So a `read` doesn't block forever if the peer stops responding", "Ca să crească viteza || To speed things up", "Pentru criptare || For encryption", "E obligatoriu || It's mandatory"], "La expirare, `read` întoarce o eroare `WouldBlock` sau `TimedOut` (depinde de platformă). || On expiry `read` returns a `WouldBlock` or `TimedOut` error (platform-dependent)."],
    ["Ce afișează? || What does it print?", ["16 octeți: <14>link up eth0\nde la dispozitiv: true", "16 octeți: <14>link up eth0\nde la dispozitiv: false", "512 octeți: <14>link up eth0\nde la dispozitiv: true", "0 octeți: \nde la dispozitiv: true"], "`recv_from` întoarce câți octeți are datagrama și adresa expeditorului. || `recv_from` returns the datagram size and the sender's address.", { k: "out", c: c`
use std::net::UdpSocket;
use std::time::Duration;
fn main() -> std::io::Result<()> {
    let colector = UdpSocket::bind("127.0.0.1:0")?;
    colector.set_read_timeout(Some(Duration::from_secs(2)))?;
    let dispozitiv = UdpSocket::bind("127.0.0.1:0")?;
    dispozitiv.send_to(b"<14>link up eth0", colector.local_addr()?)?;
    let mut buf = [0u8; 512];
    let (n, de_la) = colector.recv_from(&mut buf)?;
    println!("{} octeți: {}", n, String::from_utf8_lossy(&buf[..n]));
    println!("de la dispozitiv: {}", de_la == dispozitiv.local_addr()?);
    Ok(())
}` }],
    ["Ce garantează UDP? || What does UDP guarantee?", ["Nici livrarea, nici ordinea; doar granițele datagramelor || Neither delivery nor order; only datagram boundaries", "Livrarea, dar nu ordinea || Delivery but not order", "Ordinea, dar nu livrarea || Order but not delivery", "Livrarea și ordinea || Delivery and order"], "Fiabilitatea, dacă e necesară, o adaugă aplicația. || Reliability, if needed, is added by the application."],
    ["Pe ce protocol de transport rulează în mod obișnuit DNS (interogări mici)? || Which transport does DNS normally use for small queries?", ["UDP, port 53 || UDP, port 53", "TCP, port 80 || TCP, port 80", "UDP, port 67 || UDP, port 67", "TCP, port 25 || TCP, port 25"], "DNS folosește și TCP 53 pentru răspunsuri mari și transferuri de zonă. || DNS also uses TCP 53 for large responses and zone transfers."],
    ["Ce afișează? || What does it print?", ["10.20.0.0", "10.20.30.0", "10.0.0.0", "10.20.30.40"], "/16 păstrează primii doi octeți. || /16 keeps the first two octets.", { k: "out", c: c`
use std::net::Ipv4Addr;
fn main() {
    let ip = Ipv4Addr::new(10, 20, 30, 40);
    let masca = u32::MAX << (32 - 16);
    println!("{}", Ipv4Addr::from(u32::from(ip) & masca));
}` }],
    ["Ce afișează? || What does it print?", ["true true false", "true false false", "false true true", "true true true"], "127.0.0.1 e loopback; 172.20.x e în 172.16.0.0/12; 8.8.8.8 e public. || 127.0.0.1 is loopback; 172.20.x is in 172.16.0.0/12; 8.8.8.8 is public.", { k: "out", c: c`
use std::net::Ipv4Addr;
fn main() {
    let a = Ipv4Addr::LOCALHOST.is_loopback();
    let b = Ipv4Addr::new(172, 20, 1, 1).is_private();
    let c = Ipv4Addr::new(8, 8, 8, 8).is_private();
    println!("{a} {b} {c}");
}` }],
    ["Ce afișează? || What does it print?", ["[192, 168, 1, 1] 3232235777", "[1, 1, 168, 192] 3232235777", "[192, 168, 1, 1] 16885952", "192.168.1.1 3232235777"], "`octets()` dă octeții în ordinea de rețea; `u32::from` interpretează adresa big-endian. || `octets()` gives network-order bytes; `u32::from` reads the address big-endian.", { k: "out", c: c`
use std::net::Ipv4Addr;
fn main() {
    let ip = Ipv4Addr::new(192, 168, 1, 1);
    println!("{:?} {}", ip.octets(), u32::from(ip));
}` }],
    ["Ce afișează? || What does it print?", ["Ok(::1)", "Err(AddrParseError(Ipv6))", "Ok(0:0:0:0:0:0:0:1)", "Ok(127.0.0.1)"], "`IpAddr` acceptă IPv4 și IPv6; `::1` e loopback-ul IPv6 și se afișează comprimat. || `IpAddr` accepts IPv4 and IPv6; `::1` is IPv6 loopback and prints compressed.", { k: "out", c: c`
use std::net::IpAddr;
fn main() {
    println!("{:?}", "::1".parse::<IpAddr>());
}` }],
    ["Ce afișează? || What does it print?", ["false", "true"], "Fără port, șirul nu e un `SocketAddr` valid. || Without a port the string isn't a valid `SocketAddr`.", { k: "out", c: c`
use std::net::SocketAddr;
fn main() {
    println!("{}", "10.0.0.1".parse::<SocketAddr>().is_ok());
}` }],
    ["Ce afișează? || What does it print?", ["[2001:db8::1]:8080", "2001:db8::1:8080", "2001:db8::1 8080", "[2001:db8::1]"], "Adresele IPv6 cu port se scriu între paranteze drepte. || IPv6 addresses with a port are written in square brackets.", { k: "out", c: c`
use std::net::SocketAddr;
fn main() {
    let s: SocketAddr = "[2001:db8::1]:8080".parse().unwrap();
    println!("{s}");
}` }],
    ["Ce face `TcpStream::connect(\"exemplu.ro:80\")` cu numele de domeniu? || What does `TcpStream::connect(\"exemplu.ro:80\")` do with the domain name?", ["Îl rezolvă prin DNS (trait-ul `ToSocketAddrs`) și încearcă adresele pe rând || Resolves it via DNS (the `ToSocketAddrs` trait) and tries the addresses in turn", "Dă eroare: acceptă doar IP-uri || Errors: only IPs are accepted", "Se conectează la 127.0.0.1 || Connects to 127.0.0.1", "Nu compilează || Doesn't compile"], "Rezolvarea e blocantă; în cod async folosești `tokio::net::lookup_host`. || The lookup blocks; in async code use `tokio::net::lookup_host`."],
    ["Ce face `stream.shutdown(Shutdown::Write)`? || What does `stream.shutdown(Shutdown::Write)` do?", ["Semnalează peer-ului sfârșitul datelor (FIN), dar poți încă citi răspunsul || Signals end of data to the peer (FIN), but you can still read the reply", "Închide complet conexiunea || Fully closes the connection", "Oprește serverul || Stops the server", "Șterge buffer-ul || Clears the buffer"], "Util când serverul citește până la EOF (`read_to_end`). || Useful when the server reads to EOF (`read_to_end`)."],
    ["Ce problemă are un server care face `accept` și tratează clienții pe același fir, pe rând? || What's the problem with a server that `accept`s and handles clients one by one on the same thread?", ["Un client lent îi blochează pe toți ceilalți || One slow client blocks all the others", "Nu compilează || It doesn't compile", "Pierde date || It loses data", "Nu e nicio problemă || There's no problem"], "Soluții: un fir per client, un thread pool sau async (Tokio). || Fixes: a thread per client, a thread pool or async (Tokio)."],
    ["Ce trait implementează `TcpStream` pentru a putea folosi `write_all` și `read_to_string`? || Which traits does `TcpStream` implement to allow `write_all` and `read_to_string`?", ["`Write` și `Read` din `std::io` || `Write` and `Read` from `std::io`", "`Display` și `Debug`", "`Iterator`", "`Send` și `Sync` (doar acestea) || `Send` and `Sync` (only these)"], "Trebuie să aduci trait-urile în scope cu `use std::io::{Read, Write};`. || You must bring the traits into scope with `use std::io::{Read, Write};`."],
    ["Ce eroare dă apelul `write_all` fără `use std::io::Write`? || Which error does calling `write_all` without `use std::io::Write` give?", ["E0599", "E0425", "E0433", "E0277"], "E0599: metoda există, dar trait-ul nu e în scope. Compilatorul sugerează importul. || E0599: the method exists but the trait isn't in scope. The compiler suggests the import.", { k: "err", err: "E0599", c: c`
use std::net::TcpStream;
fn trimite(mut s: TcpStream) {
    s.write_all(b"x").unwrap();
}
fn main() {}` }]
  ]);
})();

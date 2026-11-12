//! port-checker — verifică dacă porturi TCP sunt deschise, doar cu std::net.
//! port-checker — checks whether TCP ports are open, using only std::net.
//!
//! Usage / Utilizare:
//!   cargo run -- <host> <ports> [timeout_ms]
//!   cargo run -- 127.0.0.1 22,80,443
//!   cargo run -- example.com 80,443,8000-8010 800
//!
//! Scanează DOAR echipamente pe care le administrezi sau ai permisiunea să le testezi.
//! Only scan hosts you own or have permission to test.

use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::process::ExitCode;
use std::time::{Duration, Instant};

/// Rezultatul verificării unui port / Result of checking one port.
#[derive(Debug, PartialEq)]
enum Stare {
    Deschis(Duration), // open, with connect time
    Inchis,            // closed / refused
    Timeout,           // filtered or unreachable
}

/// Parsează "22,80,8000-8002" într-o listă de porturi.
/// Parses "22,80,8000-8002" into a list of ports.
fn parse_porturi(spec: &str) -> Result<Vec<u16>, String> {
    let mut porturi = Vec::new();
    for bucata in spec.split(',').map(str::trim).filter(|s| !s.is_empty()) {
        if let Some((a, b)) = bucata.split_once('-') {
            let start = parse_un_port(a)?;
            let end = parse_un_port(b)?;
            if start > end {
                return Err(format!("interval invalid: {bucata}"));
            }
            porturi.extend(start..=end);
        } else {
            porturi.push(parse_un_port(bucata)?);
        }
    }
    if porturi.is_empty() {
        return Err(String::from("nu ai dat niciun port / no ports given"));
    }
    porturi.sort_unstable();
    porturi.dedup();
    Ok(porturi)
}

fn parse_un_port(s: &str) -> Result<u16, String> {
    match s.trim().parse::<u16>() {
        Ok(0) => Err(String::from("portul 0 nu e valid / port 0 is not valid")),
        Ok(p) => Ok(p),
        Err(e) => Err(format!("„{s}”: {e}")),
    }
}

/// Rezolvă host-ul (DNS) la prima adresă / Resolves the host (DNS) to its first address.
fn rezolva(host: &str, port: u16) -> Result<SocketAddr, String> {
    (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("nu pot rezolva {host}: {e}"))?
        .next()
        .ok_or_else(|| format!("nicio adresă pentru {host}"))
}

fn verifica(addr: SocketAddr, timeout: Duration) -> Stare {
    let start = Instant::now();
    match TcpStream::connect_timeout(&addr, timeout) {
        Ok(_) => Stare::Deschis(start.elapsed()),
        Err(e) if e.kind() == std::io::ErrorKind::TimedOut => Stare::Timeout,
        Err(_) => Stare::Inchis,
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!(
            "utilizare / usage: {} <host> <porturi> [timeout_ms]",
            args[0]
        );
        eprintln!("exemplu / example: {} 127.0.0.1 22,80,443", args[0]);
        return ExitCode::from(2);
    }
    let host = &args[1];
    let porturi = match parse_porturi(&args[2]) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("eroare: {e}");
            return ExitCode::from(2);
        }
    };
    let timeout_ms: u64 = args.get(3).and_then(|t| t.parse().ok()).unwrap_or(1000);
    let timeout = Duration::from_millis(timeout_ms);

    println!(
        "host {host}, {} port(uri), timeout {timeout_ms} ms",
        porturi.len()
    );
    println!("{:>6}  {:<8}  TIMP", "PORT", "STARE");
    let mut deschise = 0;
    for port in porturi {
        let addr = match rezolva(host, port) {
            Ok(a) => a,
            Err(e) => {
                eprintln!("eroare: {e}");
                return ExitCode::from(1);
            }
        };
        match verifica(addr, timeout) {
            Stare::Deschis(t) => {
                deschise += 1;
                println!(
                    "{port:>6}  {:<8}  {:.1} ms",
                    "deschis",
                    t.as_secs_f64() * 1000.0
                );
            }
            Stare::Inchis => println!("{port:>6}  {:<8}  -", "închis"),
            Stare::Timeout => println!("{port:>6}  {:<8}  > {timeout_ms} ms", "timeout"),
        }
    }
    println!("{deschise} deschis(e) / open");
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn parseaza_liste_si_intervale() {
        assert_eq!(
            parse_porturi("22, 80,8000-8002,80").unwrap(),
            vec![22, 80, 8000, 8001, 8002]
        );
    }

    #[test]
    fn respinge_input_gresit() {
        assert!(parse_porturi("0").is_err());
        assert!(parse_porturi("http").is_err());
        assert!(parse_porturi("90-80").is_err());
        assert!(parse_porturi("70000").is_err());
        assert!(parse_porturi("").is_err());
    }

    #[test]
    fn detecteaza_port_deschis_si_inchis() {
        // Deschidem noi un port local, deci testul nu depinde de rețea.
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        assert!(matches!(
            verifica(addr, Duration::from_millis(500)),
            Stare::Deschis(_)
        ));
        drop(listener);
        assert_eq!(verifica(addr, Duration::from_millis(500)), Stare::Inchis);
    }
}

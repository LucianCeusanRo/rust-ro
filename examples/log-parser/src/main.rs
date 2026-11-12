//! log-parser — citește linii de log de la echipamente și face un rezumat.
//! log-parser — reads device log lines and prints a summary.
//!
//! Format: <timestamp> <LEVEL> <device> <interface> <message...>
//!   cargo run -- sample.log
//!   cat sample.log | cargo run
//!   cargo run -- sample.log --level ERROR

use std::collections::BTreeMap;
use std::fmt;
use std::io::{self, BufRead, BufReader};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Nivel {
    Info,
    Warn,
    Error,
}

impl Nivel {
    fn din_text(s: &str) -> Option<Nivel> {
        match s.to_ascii_uppercase().as_str() {
            "INFO" => Some(Nivel::Info),
            "WARN" | "WARNING" => Some(Nivel::Warn),
            "ERROR" | "ERR" => Some(Nivel::Error),
            _ => None,
        }
    }
}

impl fmt::Display for Nivel {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let s = match self {
            Nivel::Info => "INFO",
            Nivel::Warn => "WARN",
            Nivel::Error => "ERROR",
        };
        f.pad(s)
    }
}

/// O linie de log parsată. Câmpurile împrumută din linia originală (&str), fără copii.
/// A parsed log line. Fields borrow from the original line (&str), no copies.
#[derive(Debug, PartialEq)]
struct Linie<'a> {
    timp: &'a str,
    nivel: Nivel,
    echipament: &'a str,
    interfata: &'a str,
    mesaj: &'a str,
}

#[derive(Debug, PartialEq)]
enum EroareParse {
    PreaScurta,
    NivelNecunoscut(String),
}

fn parse_linie(linie: &str) -> Result<Linie<'_>, EroareParse> {
    let mut parti = linie.split_whitespace();
    let timp = parti.next().ok_or(EroareParse::PreaScurta)?;
    let nivel_txt = parti.next().ok_or(EroareParse::PreaScurta)?;
    let nivel = Nivel::din_text(nivel_txt)
        .ok_or_else(|| EroareParse::NivelNecunoscut(nivel_txt.to_string()))?;
    let echipament = parti.next().ok_or(EroareParse::PreaScurta)?;
    let interfata = parti.next().ok_or(EroareParse::PreaScurta)?;
    // restul liniei, după interfață / the rest of the line after the interface
    let poz = linie
        .find(interfata)
        .map(|i| i + interfata.len())
        .unwrap_or(linie.len());
    let mesaj = linie[poz..].trim();
    if mesaj.is_empty() {
        return Err(EroareParse::PreaScurta);
    }
    Ok(Linie {
        timp,
        nivel,
        echipament,
        interfata,
        mesaj,
    })
}

#[derive(Default, Debug)]
struct Rezumat {
    total: usize,
    invalide: usize,
    pe_nivel: BTreeMap<Nivel, usize>,
    erori_pe_interfata: BTreeMap<String, usize>,
    ultima_eroare: Option<String>,
}

impl Rezumat {
    fn adauga(&mut self, linie: &str) {
        if linie.trim().is_empty() {
            return;
        }
        self.total += 1;
        match parse_linie(linie) {
            Ok(l) => {
                *self.pe_nivel.entry(l.nivel).or_insert(0) += 1;
                if l.nivel == Nivel::Error {
                    let cheie = format!("{} {}", l.echipament, l.interfata);
                    *self.erori_pe_interfata.entry(cheie).or_insert(0) += 1;
                    self.ultima_eroare = Some(format!(
                        "{} {} {} {}",
                        l.timp, l.echipament, l.interfata, l.mesaj
                    ));
                }
            }
            Err(_) => self.invalide += 1,
        }
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let filtru = args
        .iter()
        .position(|a| a == "--level")
        .and_then(|i| args.get(i + 1))
        .and_then(|n| Nivel::din_text(n));
    let fisier = args
        .iter()
        .find(|a| !a.starts_with("--") && Nivel::din_text(a).is_none());

    let intrare: Box<dyn BufRead> = match fisier {
        Some(cale) => Box::new(BufReader::new(std::fs::File::open(cale)?)),
        None => Box::new(BufReader::new(io::stdin())),
    };

    let mut rezumat = Rezumat::default();
    for linie in intrare.lines() {
        let linie = linie?;
        if let (Some(min), Ok(l)) = (filtru, parse_linie(&linie)) {
            if l.nivel >= min {
                println!(
                    "{:<5} {} {} {}",
                    l.nivel, l.echipament, l.interfata, l.mesaj
                );
            }
        }
        rezumat.adauga(&linie);
    }

    println!("== Rezumat / Summary ==");
    println!("linii: {}, invalide: {}", rezumat.total, rezumat.invalide);
    for (nivel, n) in &rezumat.pe_nivel {
        println!("  {nivel:<5} {n}");
    }
    println!("Erori pe interfață / errors per interface:");
    let mut top: Vec<_> = rezumat.erori_pe_interfata.iter().collect();
    top.sort_by(|a, b| b.1.cmp(a.1).then(a.0.cmp(b.0)));
    for (intf, n) in top {
        println!("  {n:>3}  {intf}");
    }
    if let Some(u) = &rezumat.ultima_eroare {
        println!("ultima eroare / last error: {u}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parseaza_linie_valida() {
        let l = parse_linie("2026-11-12T08:03:40Z ERROR R2 xe-1/0/0 link down").unwrap();
        assert_eq!(l.nivel, Nivel::Error);
        assert_eq!(l.echipament, "R2");
        assert_eq!(l.interfata, "xe-1/0/0");
        assert_eq!(l.mesaj, "link down");
    }

    #[test]
    fn respinge_linii_gresite() {
        assert_eq!(
            parse_linie("doar trei cuvinte"),
            Err(EroareParse::NivelNecunoscut("trei".into()))
        );
        assert_eq!(parse_linie("2026 INFO R1"), Err(EroareParse::PreaScurta));
    }

    #[test]
    fn rezumat_pe_sample() {
        let mut r = Rezumat::default();
        for l in include_str!("../sample.log").lines() {
            r.adauga(l);
        }
        assert_eq!(r.total, 8);
        assert_eq!(r.invalide, 1);
        assert_eq!(r.pe_nivel[&Nivel::Error], 3);
        assert_eq!(r.erori_pe_interfata["R2 xe-1/0/0"], 2);
    }
}

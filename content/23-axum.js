(function () {
  const c = window.RUST_C;
  // mic client HTTP folosit în întrebări ca să verificăm răspunsurile reale ale serverului
  const H = c`
async fn cere(adresa: std::net::SocketAddr, metoda: &str, cale: &str, corp: &str) -> String {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let mut s = tokio::net::TcpStream::connect(adresa).await.unwrap();
    let cerere = format!(
        "{metoda} {cale} HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{corp}",
        corp.len()
    );
    s.write_all(cerere.as_bytes()).await.unwrap();
    let mut r = String::new();
    s.read_to_string(&mut r).await.unwrap();
    let status = r.lines().next().unwrap().to_string();
    let body = r.split("\r\n\r\n").nth(1).unwrap_or("").to_string();
    format!("{} {}", &status[9..12], body)
}

async fn porneste(app: axum::Router) -> std::net::SocketAddr {
    let l = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let a = l.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(l, app).await.unwrap() });
    a
}`;
  window.RUST_LESSONS.push({
    id: 20, icon: "🕸️", level: 4,
    title: { ro: "Web cu axum", en: "Web with axum" },
    summary: {
      ro: "Un API HTTP cu <code>axum</code> 0.8 peste Tokio: rute, handler-e async, extractori (<code>Path</code>, <code>Query</code>, <code>Json</code>, <code>State</code>), coduri de status și erori tipizate. Playground-ul nu are axum, așa că exemplele sunt verificate local cu <code>cargo build</code> și le rulezi pe calculatorul tău.",
      en: "An HTTP API with <code>axum</code> 0.8 on Tokio: routes, async handlers, extractors (<code>Path</code>, <code>Query</code>, <code>Json</code>, <code>State</code>), status codes and typed errors. The Playground doesn't have axum, so the examples are checked locally with <code>cargo build</code> and you run them on your own machine."
    },
    sections: [
      { h: { ro: "Primul server", en: "First server" },
        p: { ro: "Dependențe: <code>cargo add axum tokio --features tokio/full</code>. Un <code>Router</code> leagă căi de handler-e; un handler e o funcție <code>async</code> care întoarce ceva ce implementează <code>IntoResponse</code> (<code>&amp;str</code>, <code>String</code>, <code>Json</code>, tupluri cu status). Pornești cu <code>axum::serve</code> pe un <code>tokio::net::TcpListener</code>.",
             en: "Dependencies: <code>cargo add axum tokio --features tokio/full</code>. A <code>Router</code> maps paths to handlers; a handler is an <code>async</code> function returning something that implements <code>IntoResponse</code> (<code>&amp;str</code>, <code>String</code>, <code>Json</code>, tuples with a status). You start it with <code>axum::serve</code> on a <code>tokio::net::TcpListener</code>." },
        code: c`
use axum::{routing::get, Router};

async fn radacina() -> &'static str {
    "salut din axum"
}

async fn sanatate() -> &'static str {
    "ok"
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(radacina))
        .route("/health", get(sanatate));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("ascult pe http://{}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}`, crate: "axum" },
      { h: { ro: "Extractori: Path, Query, Json", en: "Extractors: Path, Query, Json" },
        p: { ro: "Argumentele handler-ului spun ce extrage axum din cerere. În axum 0.8 parametrii de cale se scriu <code>/{id}</code> (nu <code>/:id</code> ca în versiunile vechi). <code>Query&lt;T&gt;</code> și <code>Json&lt;T&gt;</code> folosesc <code>serde</code>; o valoare invalidă dă automat un răspuns 4xx, fără să ajungă în codul tău. <code>Json</code> consumă corpul, deci trebuie să fie ultimul argument.",
             en: "Handler arguments tell axum what to extract from the request. In axum 0.8 path parameters are written <code>/{id}</code> (not <code>/:id</code> as in older versions). <code>Query&lt;T&gt;</code> and <code>Json&lt;T&gt;</code> use <code>serde</code>; an invalid value automatically yields a 4xx response before reaching your code. <code>Json</code> consumes the body, so it must be the last argument." },
        code: c`
use axum::{extract::{Path, Query}, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Filtru { stare: Option<String> }

#[derive(Deserialize)]
struct Nou { nume: String, ip: String }

#[derive(Serialize)]
struct Dispozitiv { id: u32, nume: String, ip: String }

async fn unul(Path(id): Path<u32>) -> String {
    format!("dispozitiv {id}")
}

async fn lista(Query(f): Query<Filtru>) -> String {
    format!("filtru: {}", f.stare.unwrap_or_else(|| "toate".into()))
}

async fn creeaza(Json(n): Json<Nou>) -> Json<Dispozitiv> {
    Json(Dispozitiv { id: 1, nume: n.nume, ip: n.ip })
}

pub fn app() -> Router {
    Router::new()
        .route("/dispozitive", get(lista).post(creeaza))
        .route("/dispozitive/{id}", get(unul))
        .route("/ping", post(|| async { "pong" }))
}

#[tokio::main]
async fn main() {
    let l = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(l, app()).await.unwrap();
}`, crate: "axum" },
      { h: { ro: "Stare partajată", en: "Shared state" },
        p: { ro: "<code>.with_state(stare)</code> dă tuturor handler-elor acces la o stare comună, extrasă cu <code>State&lt;T&gt;</code>. Starea e clonată pentru fiecare cerere, deci pui datele în <code>Arc</code>; pentru date modificabile folosești <code>Mutex</code> sau <code>RwLock</code> (sau o bază de date).",
             en: "<code>.with_state(state)</code> gives every handler access to shared state, extracted with <code>State&lt;T&gt;</code>. The state is cloned per request, so you wrap data in <code>Arc</code>; for mutable data use a <code>Mutex</code> or <code>RwLock</code> (or a database)." },
        code: c`
use axum::{extract::State, routing::get, Router};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct Stare {
    vizite: Arc<Mutex<u64>>,
}

async fn contor(State(s): State<Stare>) -> String {
    let mut v = s.vizite.lock().unwrap();
    *v += 1;
    format!("vizita nr. {v}")
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(contor)).with_state(Stare::default());
    let l = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(l, app).await.unwrap();
}`, crate: "axum" },
      { h: { ro: "Status și erori", en: "Status codes and errors" },
        p: { ro: "Un handler poate întoarce <code>(StatusCode, corp)</code> sau <code>Result&lt;T, E&gt;</code> unde ambele implementează <code>IntoResponse</code>. Un tip de eroare propriu care implementează <code>IntoResponse</code> transformă erorile în răspunsuri HTTP corecte într-un singur loc, iar în handler-e poți folosi <code>?</code>.",
             en: "A handler can return <code>(StatusCode, body)</code> or <code>Result&lt;T, E&gt;</code> where both implement <code>IntoResponse</code>. Your own error type implementing <code>IntoResponse</code> turns errors into proper HTTP responses in one place, and lets handlers use <code>?</code>." },
        code: c`
use axum::{extract::Path, http::StatusCode, response::{IntoResponse, Response}, routing::get, Router};

enum EroareApi {
    NuExista(u32),
    Invalid(&'static str),
}

impl IntoResponse for EroareApi {
    fn into_response(self) -> Response {
        match self {
            EroareApi::NuExista(id) => (StatusCode::NOT_FOUND, format!("nu există {id}")).into_response(),
            EroareApi::Invalid(m) => (StatusCode::BAD_REQUEST, m).into_response(),
        }
    }
}

async fn vlan(Path(id): Path<u32>) -> Result<String, EroareApi> {
    if !(1..=4094).contains(&id) {
        return Err(EroareApi::Invalid("VLAN 1-4094"));
    }
    if id != 10 {
        return Err(EroareApi::NuExista(id));
    }
    Ok("VLAN 10: birouri".to_string())
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/vlan/{id}", get(vlan));
    let l = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    axum::serve(l, app).await.unwrap();
}`, crate: "axum" }
    ],
    exercises: [
      { title: { ro: "Endpoint JSON (verificat local)", en: "JSON endpoint (checked locally)" },
        task: { ro: "Adaugă ruta <code>GET /stare</code> care întoarce JSON <code>{\"ok\":true,\"versiune\":\"1.0\"}</code>. Programul pornește serverul pe un port liber, face o cerere și afișează <code>200 {\"ok\":true,\"versiune\":\"1.0\"}</code>. Playground-ul nu are axum: rulează local cu <code>cargo run</code> (dependențe: axum 0.8, tokio cu <code>full</code>, serde cu <code>derive</code>).", en: "Add a <code>GET /stare</code> route returning the JSON <code>{\"ok\":true,\"versiune\":\"1.0\"}</code>. The program starts the server on a free port, makes a request and prints <code>200 {\"ok\":true,\"versiune\":\"1.0\"}</code>. The Playground lacks axum: run it locally with <code>cargo run</code> (deps: axum 0.8, tokio with <code>full</code>, serde with <code>derive</code>)." },
        hint: { ro: "<code>#[derive(Serialize)] struct Stare { ok: bool, versiune: &amp;'static str }</code> și un handler care întoarce <code>Json(Stare { .. })</code>.", en: "<code>#[derive(Serialize)] struct Stare { ok: bool, versiune: &amp;'static str }</code> and a handler returning <code>Json(Stare { .. })</code>." },
        starter: c`
use axum::{routing::get, Router};

${H}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(|| async { "TODO: /stare" }));
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/stare", "").await);
}`,
        solution: c`
use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Stare {
    ok: bool,
    versiune: &'static str,
}

async fn stare() -> Json<Stare> {
    Json(Stare { ok: true, versiune: "1.0" })
}

${H}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/stare", get(stare));
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/stare", "").await);
}`,
        expect: "200 {\"ok\":true,\"versiune\":\"1.0\"}", crate: "axum" }
    ]
  });
  const q = (main, extra) => c`
use axum::{extract::{Path, Query, State}, http::StatusCode, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
${extra || ""}
${H}

#[tokio::main]
async fn main() {
${main}
}`;
  QB("l20", [
    ["Ce afișează? || What does it print?", ["200 dispozitiv 7\n404 ", "200 dispozitiv 7\n200 dispozitiv x", "200 dispozitiv 7\n400 ", "200 dispozitiv {id}\n404 "], "`/dispozitive/{id}` potrivește un singur segment; `/dispozitive/7/porturi` nu are rută, deci 404 cu corp gol. || `/dispozitive/{id}` matches one segment; `/dispozitive/7/porturi` has no route, so 404 with an empty body.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/dispozitive/{id}", get(|Path(id): Path<u32>| async move { format!("dispozitiv {id}") }));
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/dispozitive/7", "").await);
    println!("{}", cere(a, "GET", "/dispozitive/7/porturi", "").await);`) }],
    ["Ce cod de status primește `GET /dispozitive/abc` dacă handler-ul extrage `Path<u32>`? || What status does `GET /dispozitive/abc` get if the handler extracts `Path<u32>`?", ["400", "404", "500", "200"], "Extractorul `Path` respinge valoarea care nu se parsează, cu 400 Bad Request. || The `Path` extractor rejects a value that doesn't parse, with 400 Bad Request.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/dispozitive/{id}", get(|Path(id): Path<u32>| async move { format!("{id}") }));
    let a = porneste(app).await;
    let r = cere(a, "GET", "/dispozitive/abc", "").await;
    println!("{}", &r[..3]);`) }],
    ["Ce afișează? || What does it print?", ["200 filtru: up\n200 filtru: toate", "200 filtru: up\n400 ", "200 filtru: Some(\"up\")\n200 filtru: None", "200 filtru: up\n200 filtru: "], "`Option` în structura de query face parametrul opțional. || An `Option` in the query struct makes the parameter optional.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/d", get(|Query(f): Query<Filtru>| async move {
        format!("filtru: {}", f.stare.unwrap_or_else(|| "toate".into()))
    }));
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/d?stare=up", "").await);
    println!("{}", cere(a, "GET", "/d", "").await);`, c`
#[derive(Deserialize)]
struct Filtru { stare: Option<String> }`) }],
    ["Ce afișează? || What does it print?", ["200 {\"id\":1,\"nume\":\"sw1\"}\n422", "200 {\"id\":1,\"nume\":\"sw1\"}\n200", "200 {\"nume\":\"sw1\"}\n400", "201 {\"id\":1,\"nume\":\"sw1\"}\n422"], "JSON-ul fără câmpul obligatoriu `nume` e sintactic corect, dar nu se potrivește tipului: 422 Unprocessable Entity. || JSON missing the required `nume` field is valid syntax but doesn't match the type: 422 Unprocessable Entity.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/d", post(|Json(n): Json<Nou>| async move { Json(Disp { id: 1, nume: n.nume }) }));
    let a = porneste(app).await;
    println!("{}", cere(a, "POST", "/d", r#"{"nume":"sw1"}"#).await);
    println!("{}", &cere(a, "POST", "/d", r#"{"ip":"10.0.0.1"}"#).await[..3]);`, c`
#[derive(Deserialize)]
struct Nou { nume: String }
#[derive(Serialize)]
struct Disp { id: u32, nume: String }`) }],
    ["Ce afișează? || What does it print?", ["400", "422", "415", "500"], "Corpul nu e JSON valid sintactic, deci `Json` răspunde cu 400 Bad Request. || The body isn't syntactically valid JSON, so `Json` responds with 400 Bad Request.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/d", post(|Json(n): Json<Nou>| async move { n.nume }));
    let a = porneste(app).await;
    println!("{}", &cere(a, "POST", "/d", "{nume:").await[..3]);`, c`
#[derive(Deserialize)]
struct Nou { nume: String }`) }],
    ["Ce afișează? || What does it print?", ["200 vizita nr. 1\n200 vizita nr. 2", "200 vizita nr. 1\n200 vizita nr. 1", "200 vizita nr. 0\n200 vizita nr. 1", "500 \n500 "], "Starea e clonată per cerere, dar `Arc` face ca ambele clone să arate spre același contor. || The state is cloned per request, but `Arc` makes both clones point to the same counter.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/", get(contor)).with_state(Stare::default());
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/", "").await);
    println!("{}", cere(a, "GET", "/", "").await);`, c`
use std::sync::{Arc, Mutex};
#[derive(Clone, Default)]
struct Stare { vizite: Arc<Mutex<u64>> }
async fn contor(State(s): State<Stare>) -> String {
    let mut v = s.vizite.lock().unwrap();
    *v += 1;
    format!("vizita nr. {v}")
}`) }],
    ["Ce afișează? || What does it print?", ["201 creat\n405", "200 creat\n404", "201 creat\n404", "200 creat\n405"], "Tuplul `(StatusCode, corp)` setează statusul. Calea există, dar fără `GET`, deci 405 Method Not Allowed. || The `(StatusCode, body)` tuple sets the status. The path exists but has no `GET`, so 405 Method Not Allowed.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/d", post(|| async { (StatusCode::CREATED, "creat") }));
    let a = porneste(app).await;
    println!("{}", cere(a, "POST", "/d", "").await);
    println!("{}", &cere(a, "GET", "/d", "").await[..3]);`) }],
    ["Cum se scrie un parametru de cale în axum 0.8? || How is a path parameter written in axum 0.8?", ["`/dispozitive/{id}`", "`/dispozitive/:id`", "`/dispozitive/<id>`", "`/dispozitive/$id`"], "Sintaxa `/:id` era în axum 0.7 și mai vechi; 0.8 a trecut la `{id}` (și `{*rest}` pentru wildcard). || The `/:id` syntax was axum 0.7 and older; 0.8 moved to `{id}` (and `{*rest}` for wildcards)."],
    ["Pe ce runtime async e construit axum? || Which async runtime is axum built on?", ["Tokio (cu hyper pentru HTTP) || Tokio (with hyper for HTTP)", "async-std", "Niciunul, e sincron || None, it's synchronous", "Node.js"], "axum face parte din ecosistemul Tokio și folosește middleware `tower`. || axum is part of the Tokio ecosystem and uses `tower` middleware."],
    ["De ce trebuie `Json<T>` să fie ultimul argument al handler-ului? || Why must `Json<T>` be the handler's last argument?", ["Consumă corpul cererii, care poate fi citit o singură dată || It consumes the request body, which can be read only once", "Din motive de stil || For style reasons", "Ca să fie mai rapid || To be faster", "Nu trebuie || It doesn't have to"], "Extractorii care consumă corpul implementează `FromRequest`; ceilalți `FromRequestParts`. || Body-consuming extractors implement `FromRequest`; the others `FromRequestParts`."],
    ["Ce trait trebuie să implementeze tipul întors de un handler? || Which trait must a handler's return type implement?", ["`IntoResponse`", "`Display`", "`Serialize`", "`Future`"], "`&str`, `String`, `Json<T>`, `StatusCode`, tupluri și `Result` îl implementează deja. || `&str`, `String`, `Json<T>`, `StatusCode`, tuples and `Result` already implement it."],
    ["De ce pui starea comună într-un `Arc`? || Why wrap shared state in an `Arc`?", ["Starea e clonată pentru fiecare cerere; `Arc` face clonarea ieftină și partajează aceleași date || State is cloned per request; `Arc` makes cloning cheap and shares the same data", "Ca să fie serializată || So it can be serialized", "Axum cere `Rc` || axum requires `Rc`", "Pentru criptare || For encryption"], "Handler-ele rulează pe mai multe fire, deci `Rc` nu merge. || Handlers run on several threads, so `Rc` won't work."],
    ["Ce face `.with_state(s)` pe un `Router`? || What does `.with_state(s)` do on a `Router`?", ["Oferă starea `s` handler-elor care o extrag cu `State<T>` || Provides state `s` to handlers that extract it with `State<T>`", "Salvează starea pe disc || Saves the state to disk", "Pornește serverul || Starts the server", "Adaugă un cookie || Adds a cookie"], "Tipul stării e verificat la compilare. || The state type is checked at compile time."],
    ["Pentru ce folosești `tower_http::cors::CorsLayer`? || What do you use `tower_http::cors::CorsLayer` for?", ["Ca să permiți cereri din browser de pe alte origini (CORS) || To allow browser requests from other origins (CORS)", "Ca să comprimi răspunsurile || To compress responses", "Pentru autentificare || For authentication", "Pentru rutare || For routing"], "Se adaugă cu `.layer(...)` pe router. || It's added with `.layer(...)` on the router."],
    ["Ce face `axum::serve(listener, app)`? || What does `axum::serve(listener, app)` do?", ["Acceptă conexiuni pe listener și servește cereri HTTP cu router-ul, până la oprire || Accepts connections on the listener and serves HTTP with the router until stopped", "Compilează aplicația || Compiles the app", "Trimite o singură cerere || Sends one request", "Creează un fișier de configurare || Creates a config file"], "Pentru oprire curată există `.with_graceful_shutdown(semnal)`. || For a clean stop there's `.with_graceful_shutdown(signal)`."],
    ["De ce leagă un server în container la `0.0.0.0` și nu la `127.0.0.1`? || Why does a server in a container bind to `0.0.0.0` rather than `127.0.0.1`?", ["`127.0.0.1` acceptă doar conexiuni locale; `0.0.0.0` ascultă pe toate interfețele || `127.0.0.1` only accepts local connections; `0.0.0.0` listens on all interfaces", "E mai rapid || It's faster", "Nu contează || It doesn't matter", "`127.0.0.1` nu e valid în Linux || `127.0.0.1` isn't valid on Linux"], "Expune doar ce e necesar; în spatele unui reverse proxy, localhost poate fi suficient. || Expose only what's needed; behind a reverse proxy, localhost may be enough."],
    ["Ce cod de status semnalează că o resursă nu există? || Which status code signals that a resource doesn't exist?", ["404 Not Found", "400 Bad Request", "401 Unauthorized", "503 Service Unavailable"], "400 = cerere greșită, 401 = lipsește autentificarea, 503 = serviciu indisponibil. || 400 = bad request, 401 = missing authentication, 503 = service unavailable."],
    ["Ce afișează? || What does it print?", ["404 nu există 20\n400 VLAN 1-4094\n200 VLAN 10: birouri", "404 nu există 20\n404 nu există 5000\n200 VLAN 10: birouri", "500 nu există 20\n400 VLAN 1-4094\n200 VLAN 10: birouri", "200 nu există 20\n200 VLAN 1-4094\n200 VLAN 10: birouri"], "Tipul de eroare propriu alege statusul în `into_response`. || The custom error type picks the status in `into_response`.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/vlan/{id}", get(vlan));
    let a = porneste(app).await;
    for id in [20, 5000, 10] {
        println!("{}", cere(a, "GET", &format!("/vlan/{id}"), "").await);
    }`, c`
use axum::response::{IntoResponse, Response};
enum EroareApi { NuExista(u32), Invalid(&'static str) }
impl IntoResponse for EroareApi {
    fn into_response(self) -> Response {
        match self {
            EroareApi::NuExista(id) => (StatusCode::NOT_FOUND, format!("nu există {id}")).into_response(),
            EroareApi::Invalid(m) => (StatusCode::BAD_REQUEST, m).into_response(),
        }
    }
}
async fn vlan(Path(id): Path<u32>) -> Result<String, EroareApi> {
    if !(1..=4094).contains(&id) { return Err(EroareApi::Invalid("VLAN 1-4094")); }
    if id != 10 { return Err(EroareApi::NuExista(id)); }
    Ok("VLAN 10: birouri".to_string())
}`) }],
    ["Ce afișează? || What does it print?", ["200 [\"eth0\",\"eth1\"]", "200 eth0, eth1", "200 [eth0, eth1]", "200 {\"0\":\"eth0\",\"1\":\"eth1\"}"], "`Json(Vec<&str>)` serializează un array JSON compact. || `Json(Vec<&str>)` serializes a compact JSON array.", { k: "out", crate: "axum", c: q(c`
    let app = Router::new().route("/if", get(|| async { Json(vec!["eth0", "eth1"]) }));
    let a = porneste(app).await;
    println!("{}", cere(a, "GET", "/if", "").await);`) }],
    ["Ce face `Router::nest(\"/api\", alt_router)`? || What does `Router::nest(\"/api\", other)` do?", ["Montează rutele lui `alt_router` sub prefixul `/api` || Mounts `other`'s routes under the `/api` prefix", "Copiază router-ul || Copies the router", "Pornește un al doilea server || Starts a second server", "Șterge rutele vechi || Deletes old routes"], "Util pentru a organiza API-ul pe module. || Useful to organise the API by module."],
    ["Ce eroare dă un handler care primește un argument ce nu e extractor (de ex. `fn h(x: Vec<u8>)` fără să implementeze `FromRequest`)? || What happens when a handler takes an argument that isn't an extractor?", ["Eroare de compilare: funcția nu implementează `Handler` || A compile error: the function doesn't implement `Handler`", "Panic la rulare || A runtime panic", "Argumentul e gol || The argument is empty", "Răspuns 500 || A 500 response"], "Axum verifică tipurile handler-elor la compilare; `#[axum::debug_handler]` dă mesaje mai clare. || axum checks handler types at compile time; `#[axum::debug_handler]` gives clearer messages."]
  ]);
})();

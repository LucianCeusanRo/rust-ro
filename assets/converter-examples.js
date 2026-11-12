/* Built-in examples for the converter page. tests/converter.test.mjs converts each one,
 * checks the expected Rust snippets are present and compiles the result with rustc. */
(function (root) {
  const ex = [
    { id: "py-basics", lang: "python", title: { ro: "Python: funcții, liste, for", en: "Python: functions, lists, for" },
      expect: ["fn add(a: i64, b: i64) -> i64", "vec![", "for n in &nums", "println!"],
      src: `def add(a: int, b: int) -> int:
    return a + b

nums = [3, 5, 8]
total = 0
for n in nums:
    total += n
if total > 10:
    print(f"total={total}", add(2, 3))
else:
    print("small")
for i in range(3):
    print("step", i)
` },
    { id: "py-dict", lang: "python", title: { ro: "Python: dict → HashMap", en: "Python: dict → HashMap" },
      expect: ["use std::collections::HashMap;", "HashMap::new()", ".entry(", "split_whitespace()"],
      src: `def count_words(text: str) -> dict[str, int]:
    counts = {}
    for word in text.split():
        w = word.lower()
        if w in counts:
            counts[w] += 1
        else:
            counts[w] = 1
    return counts

result = count_words("link down LINK up link")
print(result)
` },
    { id: "py-class", lang: "python", title: { ro: "Python: class → struct + impl", en: "Python: class → struct + impl" },
      expect: ["struct Interface", "impl Interface", "fn new(name: &str, speed: i64) -> Self", "fn shutdown(&mut self)", "fn describe(&self) -> String"],
      src: `class Interface:
    def __init__(self, name: str, speed: int):
        self.name = name
        self.speed = speed
        self.up = True

    def describe(self) -> str:
        state = "up" if self.up else "down"
        return f"{self.name} {self.speed} Mbps [{state}]"

    def shutdown(self):
        self.up = False

eth = Interface("ge-0/0/1", 1000)
eth.shutdown()
print(eth.describe())
` },
    { id: "py-errors", lang: "python", title: { ro: "Python: raise / None → Result / Option", en: "Python: raise / None → Result / Option" },
      expect: ["-> Result<i64, String>", "return Err(", "-> Option<i64>", "Some(20)", "map_err"],
      src: `from typing import Optional

def parse_port(text: str) -> int:
    port = int(text)
    if port < 1 or port > 65535:
        raise ValueError(f"invalid port {port}")
    return port

def find_vlan(name: str) -> Optional[int]:
    if name == "voice":
        return 20
    return None

print(parse_port("443"))
print(find_vlan("voice"))
print(find_vlan("cameras"))
` },
    { id: "java-basics", lang: "java", title: { ro: "Java: metode statice, ArrayList, for", en: "Java: static methods, ArrayList, for" },
      expect: ["fn sum(nums: &[i32]) -> i32", "Vec::new()", "for i in 1..=5", "sum(&nums)", "fn main()"],
      src: `import java.util.*;

public class Main {
    static int sum(List<Integer> nums) {
        int total = 0;
        for (int n : nums) {
            total += n;
        }
        return total;
    }

    public static void main(String[] args) {
        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            nums.add(i);
        }
        System.out.println("Sum: " + sum(nums));
    }
}
` },
    { id: "java-class", lang: "java", title: { ro: "Java: clasă + HashMap", en: "Java: class + HashMap" },
      expect: ["struct Inventory", "stock: HashMap<String, i32>", "fn add(&mut self, item: &str, qty: i32)", "self.stock.insert(", "Inventory::new(\"Luci\")"],
      src: `import java.util.HashMap;
import java.util.Map;

class Inventory {
    private Map<String, Integer> stock = new HashMap<>();
    private String owner;

    public Inventory(String owner) {
        this.owner = owner;
    }

    public void add(String item, int qty) {
        stock.put(item, stock.getOrDefault(item, 0) + qty);
    }

    public int count(String item) {
        return stock.getOrDefault(item, 0);
    }
}

public class Main {
    public static void main(String[] args) {
        Inventory inv = new Inventory("Luci");
        inv.add("SFP", 4);
        inv.add("SFP", 2);
        System.out.println("SFP: " + inv.count("SFP"));
    }
}
` },
    { id: "java-errors", lang: "java", title: { ro: "Java: excepții / null → Result / Option", en: "Java: exceptions / null → Result / Option" },
      expect: ["fn parse_port(s: &str) -> Result<i32, String>", "return Err(format!(", "-> Option<String>", "return None;", "h.is_none()"],
      src: `public class Main {
    static int parsePort(String s) {
        int port = Integer.parseInt(s.trim());
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("invalid port " + port);
        }
        return port;
    }

    static String findHost(String ip) {
        if (ip.equals("10.0.0.1")) {
            return "gw";
        }
        return null;
    }

    public static void main(String[] args) {
        System.out.println(parsePort("443"));
        String h = findHost("10.0.0.9");
        if (h == null) {
            System.out.println("unknown host");
        }
    }
}
` }
  ];
  if (typeof module === "object" && module.exports) module.exports = ex;
  else root.RUST_CONVERTER_EXAMPLES = ex;
})(typeof self !== "undefined" ? self : this);

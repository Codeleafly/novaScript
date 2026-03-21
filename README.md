# NovaScript (v6.1.1)
**Zero Configuration, Infinite Connectivity!**

NovaScript is an English-like, developer-ergonomic programming language built natively for script simplicity without sacrificing structural capability. Moving securely onto the `v6.1.1` engine, NovaScript incorporates a **Decentralized Global Import Engine**, optional chaining (`?.`), deeply unified data collection functions, and a comprehensive Native Standard Library—rendering the requirement of a `package.json` utterly redundant.

## ✨ Core Features

- **Decentralized Dependencies module**: Directly `import { library } from "npm:axios"` or `"github:user/repo"`. Everything caches once explicitly globally within `~/.nova_libs/`.
- **Global Tool Pipelines**: Expose binaries using `nova install -g npm:your-tool`.
- **Exhaustive Native APIs**: Fully stocked built-in layers including `Sys`, `Math`, `FS`, `HTTP`, `Date`, `Regex`, `Base64`, `Console`, and `Net`.
- **Syntactic Sugar & Fluid APIs**: Unlimited method chaining (`a().b().c()`), seamless optional chaining (`x?.y()`), nullish coalescing (`a ?? b`), and default logical aliases (`and`, `or`, `not`, `is`, `isnt`).
- **Data Primitives**: Powerful String and Array inline methods (`.map`, `.filter`, `.reduce`), natively bridging JavaScript object concepts gracefully.
- **First-class Functions**: Anonymous functions natively supported as expressions or callbacks (`fn(x) { return x * 2 }`), alongside Arrow functions.
- **Async Execution**: `async`/`await` support out of the box handling deeply threaded Node logic.

---

## 🌟 Feature Examples Showcase

### 1. Node.js Core Modules (`node:`)
Direct mapping to native Node.js backend internals freely. Every core module is supported natively!
```novascript
import { readdirSync } from "node:fs"
import { randomUUID, randomBytes } from "node:crypto"
import { platform, cpus, freemem } from "node:os"
import { execSync } from "node:child_process"
import { join } from "node:path"
import { EventEmitter } from "node:events"

# Example 1: OS Statistics
print("Running on:", platform(), "| Cores:", cpus().length)

# Example 2: Hardware Memory
print("Free Machine Memory:", freemem())

# Example 3: Cryptography
print("Secure UUID:", randomUUID())
print("Random Bytes:", randomBytes(4).toString("hex"))

# Example 4: Direct Node.js FileSystem bypass
let files = readdirSync(".")
print("Root Directory Files:", files)

# Example 5: Spawning native host processes
let sysDetails = execSync("node -v").toString().trim()
print("Host Node Version:", sysDetails)

# Example 6: Path resolutions
let fullPath = join(process.cwd(), "docs", "modules.md")
print("Resolved Core Path:", fullPath)

# Example 7: Utilizing Node Event Emitters natively
let bus = new EventEmitter()
bus.on("auth", fn(user) { print("Authenticated User:", user) })
bus.emit("auth", "Admin")
```

### 2. NPM Imports (`npm:`)
Instantly use any NPM package without a `package.json` or `node_modules` folder. NovaScript caches it globally on the first run.
```novascript
# Imports Chalk and Axios instantly
import { chalk } from "npm:chalk@5.2.0"
import { axios } from "npm:axios"

let res = await axios.get("https://api.github.com")
print(chalk.green("GitHub API Status: " + res.status))
```

### 3. GitHub Imports (`github:`)
Load and execute NovaScript utilities directly from remote raw GitHub repositories!
```novascript
# Directly fetch a module from a public repo
import { mathHelper } from "github:user/nova-utils/src/math.nv"

print("Remote execution:", mathHelper.add(5, 5))
```

### 4. URL Imports (`https://`)
Execute code seamlessly passing across strict remote web servers (similar to Deno).
```novascript
# Importing a JSON mapping or a library directly from a URL
import { data } from "https://raw.githubusercontent.com/user/project/main/config.json"
print("Fetched Config:", data.port)
```

### 5. Local 'Lib' Modules & Exports (`./`)
You can use the modern `export` keyword, or dynamically bind strictly to the `exports` object!
```novascript
# --- mathLib.nv ---
fn multiply(a, b) { 
    return a * b 
}
exports.multiply = multiply # Dynamic exporting!
exports.libName = "MathLibrary"

# --- main.nv ---
import { multiply, libName } from "./mathLib.nv"
print("Using " + libName + ":", multiply(10, 2))
```

### 6. Built-in Functions & Advanced APIs
NovaScript hides massive internal libraries out of the box without needing external requests.
```novascript
# Interactive Input & URLs
let name = input("Enter your username: ")
openUrl("https://github.com/nova-script")

# FileSystem, JSON, and File Watching (Hot Reload)
let data = { user = name, active = true }
FS.write("./user.json", JSON.stringify(data))

watchFile("./user.json", fn() {
    print("User config was updated live!")
})

# Math & OS Info
print("Square Root of 144:", Math.sqrt(144))
print("Operating System:", Sys.platform)

# Regex & String parsing
let sanitized = Regex.replace("[0-9]", "No3va5", "", "g")
print("Sanitized:", sanitized) # "Nova"
```

---

## 📚 Official Documentation
For exhaustive syntax boundaries and structural paradigms, traverse the complete multi-layered knowledge base inside the `docs/` directory:

1. [**Basics & Syntax Rules (`docs/syntax.md`)**](docs/syntax.md)
   - Variables (`let`, `const`) and Data Types
   - English Logical Aliases (`is`, `isnt`, `and`, `or`)
   - Control Flows (`if`, `switch`, `while`, `for`, `try/catch`)
2. [**Functions & Scope (`docs/functions_and_scope.md`)**](docs/functions_and_scope.md)
   - Defining and invoking routines
   - Closures and lexical boundary propagation
   - Concurrency loops (`async`/`await`)
3. [**Data Structures (`docs/data_structures.md`)**](docs/data_structures.md)
   - Advanced Array manipulation methods
   - Internal String prototypes
   - Objects and optional chaining logic
4. [**Standard Library (`docs/standard_library.md`)**](docs/standard_library.md)
   - Complete reference to `Math`, `Sys`, `FS`, `HTTP` webservers, utilities
5. [**Modules & Imports (`docs/modules.md`)**](docs/modules.md)
   - Decentralized package resolution (`npm:`, `github:`, `https:`)
   - Exports binding techniques
6. [**Advanced Tips & Tricks (`docs/advanced_tricks.md`)**](docs/advanced_tricks.md)
   - ANSI styling, regex bridging, string-key objects, parser booting

---

## 🚀 Quick Start & CLI

### Installation / REPL Start
```bash
# Starts the live multi-line interactive interpreter
nova
```

### Running Scripts
```bash
# Executes standard code interpretation against a target script
nova run script.nv
# Also natively falls back mapping to alias targets directly
nova script.nv
```

### Manage Global Cache
```bash
# Explicitly prefetches dependencies
nova get npm:chalk

# Generates executable system paths globally linking NPM packages
nova install -g npm:express 

# Wipe global library configuration cache maps
nova clean 
```

### Interactive Editor Mode
Once dynamically booted inside REPL:
```text
.help      → Show REPL commands
.editor    → Enables multi-line raw string ingestion
.reset     → Clears environment state and variables natively
.clear     → Clear the screen
.exit      → Exit the REPL
```
NovaScript handles open block strings gracefully. Example:
```novascript
nova ❯ for i from 1 to 3 {
  ...   print("Auto-continue block step:", i)
  ... }
```

## Status & License
NovaScript operates dynamically atop modern V8 JavaScript boundaries. Code artifacts natively cross-compile internal abstractions into zero-dep binary strings securely. 
See `LICENSE` inside the repository structure for deeper permission usage templates.

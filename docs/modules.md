# Modules & Global Imports

NovaScript explicitly abandons the centralized `node_modules` constraint. Instead, it features a **Decentralized Global Import Engine** allowing zero-configuration integration. Modules are resolved out of a global `~/.nova_libs/` cache.

## Exporting Values

To share data natively, prefix declarations with the `export` keyword.

```novascript
# utils.nv

export let appVersion = "v6.1.1-dev"

export fn formatData(data) {
    return JSON.stringify(data)
}
```

Alternatively, for dynamic or programmatic exposing, you can bind directly to the internal `exports` object (CommonJS style):

```novascript
# mathLib.nv
fn customLogic() { return 42 }

exports.logic = customLogic
exports.version = "1.0.0"
```

## Importing Modules

Use the `import` (or `include`) keywords followed by block braces. Multiple comma-separated aliases are available.

### 1. Local Files
Relative scopes inside your project hierarchy map natively.

```novascript
import { appVersion, formatData } from "./utils.nv"

print("Formatting v:", appVersion)
```

### 2. Node.js Native Core Modules (`node:`)
Direct mapping to legacy backend Node.js runtimes. Every built-in Node.js module is fully available natively!

```novascript
import { readdirSync, readFileSync } from "node:fs"
import { randomUUID, createHash } from "node:crypto"
import { platform, uptime } from "node:os"
import { execSync } from "node:child_process"
import { join, extname } from "node:path"
import { EventEmitter } from "node:events"
import { inspect } from "node:util"

# 1. OS Info
print("Node OS Platform:", platform(), "Uptime:", uptime())

# 2. Cryptography
print("Secure Token:", randomUUID())
print("SHA256:", createHash("sha256").update("Nova").digest("hex"))

# 3. Direct FS Access
print("Current Dir Files:", readdirSync("."))

# 4. Native Child Processes
let pwd = execSync("echo %cd%").toString().trim()
print("Current Working Dir string:", pwd)

# 5. Native Path Methods
print("Resolved join:", join("a", "b", "c.txt"))

# 6. Event Emitters 
let comms = new EventEmitter()
comms.on("message", fn(data) { print("Msg:", data) })
comms.emit("message", "System Booting!")

# 7. Core Formatting
print("Inspected Struct:", inspect({ deep = { active = true } }))
```

### 3. NPM Packages (`npm:`)
Instantly resolves and fetches dependencies. If an `npm:` namespace dictates a package that has not yet been fetched, NovaScript stops, securely downloads it to the global cache, and seamlessly proceeds execution.

```novascript
import { chalk } from "npm:chalk@5.2.0"
import { axios } from "npm:axios"

Console.error(chalk.red("This operates with ZERO package.json definitions."))
```

### 4. GitHub Repositories (`github:`)
Load components directly from open-source repositories via jsDelivr wrappers.
```novascript
import { utility } from "github:user/repo@v1.0.0/src/util.nv"
```

### 5. Raw HTTPS URLs (`https:`)
Straight Deno-like web dependency resolution.
```novascript
import { data } from "https://raw.githubusercontent.com/user/json/main/file.json"
```

## Global Command Line Tools

You can permanently cache and map utility aliases to your OS paths utilizing `nova install -g`.

```bash
# Globally registers Boxen.
# An executable shim `.cmd` or `.sh` is added to `~/.nova/bin`.
nova install -g npm:boxen
```

To wipe these global traces and redownload clean iterations:
```bash
nova clean
```

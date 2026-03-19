# NovaScript (v5.5.5) - Production Grade!

NovaScript is an English-like programming language with a hybrid syntax that balances readability and performance. Now updated to v5.5.5, it is specifically designed to be highly logical, natively cross-platform, and perfectly suitable for production.

## Core Features (v5.5.5)

- **Async/Await:** Powerful asynchronous programming model for non-blocking operations.
- **Error Handling:** Robust `try`, `catch`, `finally`, and `throw` statements.
- **Advanced Flow Control:** `switch`, `case`, `default`, `break`, and `continue`.
- **Hybrid Syntax:** Uses `{}` for blocks, `()` for expressions and function calls.
- **English Keywords:** `is` (==), `isnt` (!=), `and`, `or`, `not`, `let`, `fn`, `if`, `else`, `while`, `for`, `from`, `to`, `return`, `include`.
- **Expanded Operators:** Arithmetical (`**`, `%`), Logical (`&&`, `||`, `!`), Bitwise (`&`, `|`, `^`, `<<`, `>>`), and Assignment (`+=`, `-=`).
- **Massive Standard Library:** Built-in `Math`, `Sys`, `FS`, `HTTP`, `JSON`, `String`, `Array`, `Regex`, `Date`, `Base64`, and `Console`!
- **Friendly Errors:** Clear error messages natively trace exact file names seamlessly across module trees.

## 📚 Documentation
Check the `docs/` folder for comprehensive documentation on usage:
- [Basics & Syntax](docs/basics.md)
- [Standard Library Guide](docs/standard-library.md)

## Syntax Examples

### Variables
```novascript
let x = 10
const pi = 3.14
```

### Functions
```novascript
fn greet(name) {
    print("Hello", name)
}

fn add(a, b) {
    return a + b
}
```

### Control Flow
```novascript
if (age is 18) {
    print("Welcome!")
} else {
    print("Access denied.")
}

switch status {
    case "success" { print("Done!") }
    case "error"   { print("Failed!") }
    default        { print("Pending...") }
}

while (count < 5) {
    print(count)
    if (count == 2) { continue }
    if (count == 4) { break }
    count = count + 1
}

for i from 1 to 10 {
    print(i)
}
```

### Async & Error Handling
```novascript
async fn fetchData() {
    print("Fetching...")
    return "Data"
}

try {
    let result = await fetchData()
    print("Result:", result)
    throw "Oops!"
} catch err {
    print("Caught:", err)
} finally {
    print("Finished.")
}
```

### Standard Library Usage
```novascript
let root = Math.sqrt(16)
print("Root:", root)

let content = File.read("test.txt")
print("Content:", content)

print("Platform:", Sys.platform)
```

## 🚀 Running NovaScript

### CLI Commands
```bash
nova                  # Start the interactive REPL
nova run script.nv    # Run a NovaScript file
nova script.nv        # Shorthand run (backward compatible)
nova version          # Print current version
nova help             # Print help
```

### Interactive REPL Commands
Once inside the REPL:
```
.help      → Show REPL commands
.editor    → Multi-line editor mode (type .run to execute)
.clear     → Clear the screen
.reset     → Reset all declared variables
.exit      → Exit the REPL
```

### Multi-Line Auto-Continuation
The REPL automatically detects unclosed blocks and continues:
```
nova ❯ fn double(n) {
  ...   return n * 2
  ... }
  ⟵ [Function]
```

## 📚 Documentation
- [Basics & Syntax](docs/basics.md)
- [Standard Library](docs/standard-library.md)
- [REPL Usage Guide](docs/repl.md)

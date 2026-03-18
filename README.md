# NovaScript v4

NovaScript is an English-like programming language with a hybrid syntax that balances readability and performance.

## Core Features (v4)

- **Hybrid Syntax:** Uses `{}` for blocks, `()` for expressions and function calls.
- **English Keywords:** `is` (==), `isnt` (!=), `and`, `or`, `not`, `let`, `fn`, `if`, `else`, `while`, `for`, `from`, `to`, `return`, `include`.
- **Standard Library:** Built-in `Math`, `Sys`, and `File` modules.
- **Data Structures:** Native support for Objects `{ key = value }` and Arrays `[1, 2, 3]`.
- **Friendly Errors:** Clear error messages with line numbers and code snippets.

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

while (count < 5) {
    print(count)
    count = count + 1
}

for (i from 1 to 10) {
    print(i)
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

## Running NovaScript

To run a script:
```bash
nova script.nv
```

To enter interactive mode (REPL):
```bash
nova
```

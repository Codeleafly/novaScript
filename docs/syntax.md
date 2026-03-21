# NovaScript Syntax Guide

NovaScript is designed with an English-like syntax that prioritize developer ergonomics, readability, and immediate hybrid flexibility. It is capable of advanced lexing sequences natively.

## Variables and Types

NovaScript natively adopts block-scoped and globally scoped configurations.

### `let` and `const` (Block Scoped)
- `let`: Creates a mutable block-scoped variable.
- `const`: Creates an immutable block-scoped constant.

```novascript
let name = "Alice"
name = "Bob"
const pi = 3.14159
```

### `global` (Global Scoped)
For advanced project architectures, explicitly declare true global variables capable of being accessed deeply within nested closures:

```novascript
global counter = 0

fn deepUpdate() {
   global counter = counter + 1 # Modifies the root variable
}
```

### Supported Data Types
1. **Numbers**: Integers and floats (`42`, `3.14`).
2. **Strings**: Both double (`"..."`) and single (`'...'`) quotes are supported seamlessly! Escape sequences like `\n` (newline), `\t` (tab), and `\x1b`, `\e` (ANSI colors) are fully functional natively.
3. **Booleans**: `true` and `false`.
4. **Null**: Explicitly empty values using `null`.
5. **Arrays**: Ordered element grouping (`[1, 2, "three"]`).
6. **Objects**: Dictionary structures with flexible keying. 
    ```novascript
    let obj = {
        standardProp = "value",
        "complex-key": "value"
    }
    print(obj["complex-key"]) # Bracket notation available natively!
    ```

## Type Casting
Global casting utilities are injected directly into the runtime context:
- `num(value)`: Converts strings/etc. into a pure Number.
- `str(value)`: Converts literals and constructs strictly to native Strings.

## Operators

NovaScript provides both standard C-style operators and English aliases for cleaner code.

### Standard Math & Assignments
- `+`, `-`, `*`, `/`, `%` (Remainder)
- `**` (Exponentiation)
- `=`, `+=`, `-=`

### Logical Operators (English Aliases)
- `and` equates to `&&` : Logical AND
- `or` equates to `||` : Logical OR
- `not` equates to `!` : Logical NOT

### Comparison Operators
- `is` equates to `==` : Equality
- `isnt` equates to `!=` : Inequality
- `>`, `<`, `>=`, `<=`

### Advanced Safety Operators
- **Optional Chaining (`?.`)**: Deep object traversal omitting panic on `undefined`/`null` properties. Also works with generic method calls: `nullObj?.method()` suppresses errors directly!
  ```novascript
  let data = null
  print(data?.missingProperty) 
  ```
- **Nullish Coalescing (`??`)**: Return the fallback right-hand operand when left evaluates exactly to `null`.
  ```novascript
  let effectiveName = name ?? "Guest"
  ```

## Control Flow

### `if`/`else`
```novascript
let temp = 30
if (temp > 25) {
    print("Hot")
} else {
    print("Normal")
}
```

### `switch`
```novascript
switch status {
    case "success" { print("Operation completed.") }
    case "failed" { print("Operation failed.") }
    default { print("Unknown status.") }
}
```

### Loops

**1. Range-Based For Loop** (Syntactic Sugar for quick ranges):
```novascript
for i from 1 to 5 {
    print("Iter:", i)
}
```

**2. Standard C-style For Loop**: Fully supported for complex arithmetic traversals!
```novascript
for (let i = 0; i < len; i = i + 1) {
    print("Index access:", arr[i])
}
```

**3. While Loop**:
```novascript
let count = 0
while (count < 5) {
    count = count + 1
    if (count == 3) { break }
}
```

## Exception Handling
Robust block encapsulation to salvage failing sub-architectures.
```novascript
try {
    throw "Fatal failure!"
} catch err {
    print("Recovered:", err)
} finally {
    print("Block executed safely.")
}
```

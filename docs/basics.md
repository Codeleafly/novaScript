# NovaScript v5.5.5 Basics

NovaScript is a dynamically-typed, interpreted language heavily inspired by JavaScript/TypeScript but built with a cleaner, minimalistic aesthetic.

## Variables & Scopes
NovaScript supports multi-level scoping:
- **Block Scope**: `let` and `const` are confined to the block `{}` they are defined in.
- **Global Scope**: Use the `global` keyword for variables accessible everywhere.
- **Function Scope**: Parameters and variables inside `fn` are private to that function.

```javascript
let x = 10         // Block/Local
const y = 20       // Constant
global name = "Nova" // Accessible everywhere
```

## Data Types
NovaScript supports standard literals:
- **Numbers**: `10`, `3.14`
- **Strings**: `"Hello"`, `"Nova"` (Escape sequences like `\n`, `\t`, `\` are supported)
- **Booleans**: `true`, `false`
- **Null**: `null`
- **Arrays**: `[1, 2, "three", true]`
- **Objects**: `{ key: "value", age: 25 }`

## Operators
NovaScript v5.5.5 features a complete set of operators:
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`, `**` (Power)
- **Comparison**: `==` (`is`), `!=` (`isnt`), `<`, `>`, `<=`, `>=`
- **Logical**: `&&` (`and`), `||` (`or`), `!` (`not`)
- **Assignment**: `=`, `+=`, `-=`
- **Bitwise**: `&`, `|`, `^`, `<<`, `>>`

*Example:*
```javascript
if (x is 10 and not false) {
    print("Match!")
}
let power = 2 ** 3 # 8
let count = 0
count += 5 # 5
```

## Control Flow
### If / Else
```javascript
if (score > 90) {
    print("A")
} else {
    print("B")
}
```

### Switch / Case
```javascript
switch status {
    case "success" { print("Success!") }
    case "error"   { print("Error!") }
    default        { print("Unknown!") }
}
```

### Loops (While, For, Break, Continue)
```javascript
let i = 0
while i < 5 {
    if i == 2 { continue }
    print(i)
    i = i + 1
}

for count from 1 to 10 {
    if count == 8 { break }
    print(count)
}
```

## Functions & Async
Define functions using the `fn` keyword. Use `async`/`await` for non-blocking operations.
```javascript
async fn fetchData() {
    return "Data"
}

let data = await fetchData()
```

## Error Handling
```javascript
try {
    throw "Fatal Error"
} catch err {
    print("Caught:", err)
} finally {
    print("Cleanup")
}
```

## Modules
NovaScript v5.5.0 has a modular file architecture via `include()`.
```javascript
// mathLib.nv
let api = "Math"
fn square(x) { return x * x }
exports.api = api
exports.square = square

// main.nv
let lib = include("mathLib.nv")
print(lib.square(5))
```

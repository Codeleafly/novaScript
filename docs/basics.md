# NovaScript v5.5.0 Basics

NovaScript is a dynamically-typed, interpreted language heavily inspired by JavaScript/TypeScript but built with a cleaner, minimalistic aesthetic.

## Variables
You can declare variables using `let` and `const`.
```javascript
let x = 10
const y = 20
x = x + y
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
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `==`, `!=`, `<`, `>`
- **Logical**: `and`, `or`, `not`
- **Hybrid English Aliases**: `is` (for `==`), `isnt` (for `!=`)

*Example:*
```javascript
if (x is 10 and not false) {
    print("Match!")
}
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

### While Loop
```javascript
let i = 0
while (i < 5) {
    print(i)
    i = i + 1
}
```

### For Loop (Range Based)
```javascript
for count from 1 to 10 {
    print(count)
}
```

## Functions
Define functions using the `fn` keyword.
```javascript
fn compute(a, b) {
    return a * b + 10
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

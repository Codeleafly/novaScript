# Functions and Scope

NovaScript handles functional abstraction efficiently, leveraging first-class functional concepts akin to modern JavaScript infrastructures.

## Standard Function Definitions

The `fn` keyword triggers functional encapsulation supporting closures securely. By default, an undefined return resolves natively to `null`.

```novascript
fn greet(name) {
    let person = name ?? "User"
    return "Greetings, " + person
}

print(greet("Nova"))
```

## Anonymous Functions (v6.1.1+)
NovaScript allows `fn` to be used as an expression without an identifier, perfect for clean callback definitions and assigning functions to variables or object properties.

```novascript
let operate = fn(a, b) {
    return a + b
}

let result = doMath(fn(x, y) {
    return x * y
})
```

## Arrow Functions (v6.0.0+)
NovaScript v6 aggressively supports Arrow Functions natively bridging seamless lambda flows, notably inside array iterations and callbacks. 
Curly blocks are optional for single-statement logical paths!

```novascript
# Single argument, inline return
let square = x => x * x

# Multiple arguments, inline return
let add = (a, b) => a + b

# Multi-line logic using curly braces
let checkVal = (val) => {
    if (val > 10) { return true }
    return false
}

print("4 squared is", square(4))
```

## Recursion
Self-invoking references recursively loop fluidly mapping into V8 execution contexts:

```novascript
fn factorial(n) {
    if (n is 0) { return 1 }
    return n * factorial(n - 1)
}
```

## Scoping Rules & Closures

### Environment Hoisting
Scopes are bounded by explicitly invoked block definitions `{ ... }`.

1. **Global Boundary**: Variables defined at the top-most level of a script using `let` are natively constrained sequentially, but `global` identifiers penetrate EVERYTHING.
2. **Local Boundary**: `let` definitions created within deep nesting loops/conditionals drop instantly out of memory after runtime block exit!

### Closures
Functions actively "remember" variables out of enclosing architectural environments implicitly safely.

```novascript
fn makeCounter() {
    let count = 0
    return fn() {
        count = count + 1
        return count
    }
}
let step = makeCounter()
print(step()) # 1
print(step()) # 2
```

## Concurrency (Async/Await)

The `async` keyword constructs an asynchronous boundary, yielding threads natively avoiding I/O blocking scenarios. Used exclusively alongside `await`.

```novascript
async fn fetchData() {
    print("Initiating connection...")
    return "Stream data"
}

async fn run() {
    let result = await fetchData()
    print("Received:", result)
}
run()
```

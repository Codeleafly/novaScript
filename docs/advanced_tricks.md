# Advanced Tips & Tricks in NovaScript

This document highlights undocumented edge cases, optimizations, and deep execution tricks for leveraging NovaScript's core architecture gracefully.

## 1. Direct Regex Integration over Native Strings
You have deep internal pattern injection utilities directly within the utility library!

```novascript
let logs = "ERROR-201, ERROR-404, OK-200"
let target = Regex.match("ERROR-[0-9]{3}", logs, "g")
print(target) # Array of pure error tokens
```

## 2. Bootstrapping Parsers with Array Mutation
NovaScript native logic supports recursive descent parsing efficiently. Arrays are passed automatically *by reference*, making queue handling extremely quick:

```novascript
let queue = ["command1", "command2"]
while (queue.length > 0) {
    let cmd = Array.pop(queue) # Pops destructively natively
}
```

## 3. Dynamic Console Aesthetics 
Instead of plain strings, embed ANSI escapes natively for premium CI/CD outputs. Node's `chalk` module seamlessly interpolates these, but escaping them manually is faster within standalone scripts. 

```novascript
let green = "\e[32m"
let reset = "\e[0m"
print(green + "Deployment Verified Successfully!" + reset)
```

## 4. The Global "parseJson" Alias Wrapper
While `JSON.parse(str)` is robust, global utility scopes explicitly bridge `parseJson()` straight inside internal context.
```novascript
let struct = parseJson('{"valid": true}')
```

## 5. String-keyed Object Initialization
Normally assigning `recordKey = value` establishes records. But if your key features reserved characters (spaces, dashes):
```novascript
let advancedDataset = {
    "X-Forwarded-For": "10.0.0.1",
    "Content-Type": "application/json",
    port = 8080
}

# Remember to utilize brackets avoiding parser drops!
print(advancedDataset["X-Forwarded-For"])
```

## 6. Functional Inheritance Wrappers (OOP Trick)
NovaScript relies natively on Functional closures instead of native Class directives.
Capture structures mimicking instantiated Class states powerfully using exported dictionary Maps containing closure references!

```novascript
fn createDrone(name) {
   global battery = 100
   
   return {
       name = name,
       fly = () => {
           global battery = battery - 10
           print(name, "flying! Battery:", battery)
       }
   }
}

let drone1 = createDrone("Eagle")
drone1.fly()
```

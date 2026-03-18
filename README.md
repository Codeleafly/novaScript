# NovaScript v2.0 - English-like Programming Language

NovaScript is an interpreted language built on TypeScript, designed to be as readable as plain English.

## Features (New in v2.0)
- **Modern REPL:** Stable, colorful, and crash-resistant with the `➜` prompt.
- **Global Command:** Use `nova` to run files or start the REPL.
- **Interactive Input:** Use `call input "prompt"` to get user input.
- **Module System:** Import libraries using `import "file.nv"`.
- **Complex Types:** Full support for Strings, Integers (via `toInteger`), and Floats (via `toNumber`).
- **Enhanced Print:** Variadic printing with or without commas.

## Examples
Check the `examples/` directory for verified scripts:
- `hello_world.ns`: Basic output.
- `loop_example.ns`: While and Repeat loops.
- `functions_example.ns`: Defining and calling functions.
- `collections_example.ns`: Using Arrays and Objects.
- `input_test.nv`: Interactive user input and type conversions.
- `calculator.ns`: A full interactive calculator program.
- `library_test.nv` & `mylib.nv`: Demonstrating the module import system.

## Quick Start
1. **Install:** `npm install && npm link`
2. **Run:** `nova examples/hello_world.ns`
3. **REPL:** Just type `nova`

## Syntax Example
```novascript
let name be call input "What is your name? "
print "Hello" name "!"

repeat i from 1 to 3
  print "Counting:" i
end
```

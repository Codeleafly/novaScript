# NovaScript REPL Guide (v5.5.5)

The NovaScript REPL is a production-grade interactive shell for exploring and testing the language in real time.

## Starting the REPL
```bash
nova          # open REPL
nova repl     # explicit REPL command
```

| Command | Description |
|---------|-------------|
| `.help` | Show this command reference |
| `.editor` | Enter multi-line editor mode (type `.run` to execute, `.cancel` to abort) |
| `.clear` | Clear the terminal screen |
| `.reset` | Reset the environment (clears all declared variables) |
| `.exit` | Exit the REPL |
| `exit` | Shorthand to exit the REPL |

## Multi-Line Mode

### Auto-Continuation
If you type an **unclosed block** (e.g. `fn add(a, b) {`), the REPL will automatically show a `...` prompt and wait for you to finish the block:
```
nova ❯ fn greet(name) {
  ...   print("Hello", name)
  ...  }
  ⟵ [Function]
```

### Editor Mode
Use `.editor` to write multiple lines freely before executing:
```
nova ❯ .editor

  ── Editor Mode ──────────────────────────────────────
  Enter multiple lines of code.
  Type .run to execute, .cancel to abort.

  ✏  let x = 10
  ✏  let y = 20
  ✏  print(x + y)
  ✏  .run

── Running ──────────────────────────────
30
─────────────────────────────────────────
```

## Nova CLI Flags
| Command | Description |
|---------|-------------|
| `nova` | Start the interactive REPL |
| `nova repl` | Explicitly start the REPL |
| `nova run <file.nv>` | Run a NovaScript file |
| `nova <file.nv>` | Shorthand run (supports .nv, .ns, .nova) |
| `nova version` | Print the NovaScript version |
| `nova help` | Print full CLI help |
| `nova -v`, `-V` | Alias for `nova version` |
| `nova -h`, `-H` | Alias for `nova help` |

## Expression Results
Any expression that returns a non-null value will be shown with a `⟵` arrow:
```
nova ❯ 2 + 2
  ⟵ 4

nova ❯ Math.sqrt(144)
  ⟵ 12
```

## Persistent State
All variables declared in the REPL persist across lines until you type `.reset`.

## Exit
Type `.exit`, `exit`, or press `Ctrl+C`.

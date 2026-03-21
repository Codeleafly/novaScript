# Standard Library & Built-ins

NovaScript ships with an exhaustive suite of native modules and globally injected helper functions requiring **zero** imports.

## 🌟 Injected Global Helpers

These functions are available natively in every NovaScript scope immediately:

- **`print(...args)`**: Standard output to the console.
- **`input(prompt)`**: Blocks execution and requests interactive user CLI input.
- **`time()`**: Returns the current UNIX timestamp in milliseconds (alias for `Date.now()`).
- **`openUrl(url)`**: Triggers the host Operating System to open the URL in the default browser natively!
- **`parseJson(jsonString)`**: Natively resolves JSON text into standard NovaScript Records.
- **`fetchText(url)`**: A synchronized shortcut mapping to `HTTP.get(url).data` for fetching raw string responses quickly. 
- **`watchFile(filePath, callback)`**: Powerful native binding to the OS File Watcher! Executes biological Hot-Reload paradigms entirely inside NovaScript:
  ```novascript
  watchFile("./config.json", fn() {
      print("Config was modified! Reloading state...")
  })
  ```

### Type Casting & Aliases
- **`num(val)`**: Converts variables completely into Numbers (`0` fallback).
  - Aliases: `toInteger(val)`, `toNumber(val)`.
- **`str(val)`**: Converts variables securely into Strings.
  - Alias: `toString(val)`.
- **`bool(val)`**: Enforces strict truthiness Boolean casting.

---

## Modulated Namespaces enabling robust backend interactions directly globally accessible without imports.

---

## 🧭 System (`Sys`)
Provides an interface into the operating system running the script.

- **`Sys.platform`**: `string` - The OS platform identifier (e.g., `"win32"`, `"darwin"`, `"linux"`).
- **`Sys.arch`**: `string` - The CPU architecture.
- **`Sys.version`**: `string` - Returns the underlying NovaScript engine version.
- **`Sys.env(key)`**: Fetches an operating system environment variable. Returns `null` if omitted.
- **`Sys.uptime()`**: `number` - Returns the system uptime in seconds.
- **`Sys.hostname()`**: `string` - Returns the machine's hostname.
- **`Sys.totalmem()`** / **`Sys.freemem()`**: `number` - Memory statistics in bytes.
- **`Sys.exec(command)`**: Synchronously executes a shell command and returns the stdout string output. Captures `stderr` output smoothly on panic.
- **`Sys.exit(code)`**: Instantly forces the application to terminate with given `code`.
- **`Sys.time()`**: Emits epoch milliseconds (`Date.now()` logic equivalent).

---

## 📁 File System (`FS`)
Used to interact safely with the filesystem.

- **`FS.read(path)`**: Reads a file as UTF-8 string. Returns `null` if the file does not exist.
- **`FS.write(path, data)`**: Writes the `data` chunk into `path`, overwriting content. Returns `true`.
- **`FS.append(path, data)`**: Appends data to an existing file.
- **`FS.copy(src, dest, recursive?)`**: Copies file or directories. `recursive` defaults to `true`.
- **`FS.move(src, dest)`**: Wrapper around renaming/moving.
- **`FS.rename(oldPath, newPath)`**: Renames a file or folder.
- **`FS.delete(path, recursive?)`**: Deletes the specified path. `recursive` defaults to `true` (acts like `rm -rf`).
- **`FS.exists(path)`**: `boolean` - Strict existence check.
- **`FS.mkdir(path)`**: Creates a directory recursively.
- **`FS.rmdir(path)`**: Deletes a directory recursively.
- **`FS.isFile(path)`** / **`FS.isDir(path)`**: Returns `boolean` verifying the entity statistics.
- **`FS.list(path)`**: Returns an array of children string filenames.
- **`FS.search(pattern, startDir?, recursive?)`**: Executes a tree-walk matching file substrings against the `pattern`. Returns an Array.

---

## 🧮 Math (`Math`)
- **Constants**: `Math.pi`, `Math.e`, `Math.inf`, `Math.nan`.
- **Functions**: `Math.sqrt(val)`, `Math.abs(val)`, `Math.random()`, `Math.sin(val)`, `Math.cos(val)`, `Math.tan(val)`.
- **Rounding Tools**: `Math.floor(x)`, `Math.ceil(x)`, `Math.round(x)`, `Math.trunc(x)`.
- **Operations**: `Math.pow(base, exp)`, `Math.min(a, b, ...)`, `Math.max(a, b, ...)`, `Math.log(x)`, `Math.log10(x)`, `Math.sign(x)`.

---

## 🌐 Networking (`HTTP`)
Native bindings for HTTPS/HTTP handling.

- **`HTTP.get(url, headers?)`**: Dispatches a GET request. Returns `{ data, status }` object.
- **`HTTP.post(url, body, headers?)`**: Dispatches a POST request with the given string `body`.
- **`HTTP.createServer()`**: Returns an HTTP Server object.
    - `server.get(path, handlerFn)`: Assigns a function to `/path` when GET is received.
    - `server.post(path, handlerFn)`: Assigns a function to `/path` when POST is received.
    - `server.listen(port)`: Unbinds into listening state.
    - **Handler Function Format**: `fn(req, res)` where `req.body` possesses payload, and `res.send(data, headers?)` replies to the client.

```novascript
let server = HTTP.createServer()
server.get("/ping", fn(req, res) {
    res.send("pong")
})
server.listen(8080)
```

---

## 🧩 Utilities
- **`Date`**:
    - `Date.now()`, `Date.parse(dateStr)`, `Date.toISO(ms?)`, `Date.toUTC(ms?)`, `Date.diff(ms1, ms2)`.
    - `Date.format(ms?, pattern?)`: Applies template strings like `"YYYY-MM-DD HH:mm:ss"`.
- **`Regex`**:
    - `Regex.test(pattern, str, flags?)`: Checks match validity boolean.
    - `Regex.match(pattern, str, flags?)`: Returns array of substring captures or `null`.
    - `Regex.replace(pattern, str, replaceConfig, flags?)`: Executes regex replacement.
- **`Base64`**:
    - `Base64.encode(str)` and `Base64.decode(b64Hash)`.
- **`Console`**:
    - `Console.clear()`, `Console.error(msg)`, `Console.warn(msg)`. Prints beautifully utilizing colored output natively.
- **`Path`**:
    - `Path.join(...)`, `Path.resolve(...)`, `Path.basename(p)`, `Path.dirname(p)`, `Path.extname(p)`.
- **`JSON`**:
    - `JSON.stringify(object)`: Translates dynamic NovaScript structures to JSON standard.
    - `JSON.parse(string)`: Restores objects securely. Retains parsing isolation.
- **`Net`**:
    - `Net.ping(host)`: Verifies if remote TCP host exists.

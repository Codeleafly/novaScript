# NovaScript v5.5.0 Standard Library

NovaScript 5.5.0 brings a production-grade standard library to enable full-scale application development, including complex logical parsing, server handling, and data manipulation.

## Core Utilities
- `print(...args)`: Prints arguments to the console.
- `input(prompt)`: Prompts the user synchronously for input.
- `time()`: Returns current Unix timestamp in ms.

## Type Conversions
- `num(val)`: Casts value to a number.
- `str(val)`: Casts value to a string.
- `bool(val)`: Casts value to a boolean.

## `String` Module
The global `String` object offers powerful text manipulation functions:
- `String.split(str, sep)`: Splits a string into an array.
- `String.replace(str, target, replacement)`: Replaces first occurrence of `target`.
- `String.replaceAll(str, target, replacement)`: Replaces all occurrences.
- `String.upper(str)` / `String.lower(str)`: Casing transformations.
- `String.trim(str)`: Removes whitespace from both ends.
- `String.includes(str, search)`: Returns `true` if search string is found.
- `String.slice(str, start, [end])`: Returns a portion of the string.
- `String.indexOf(str, search)`: Returns starting index of search, or -1.

## `Array` Module
- `Array.push(arr, item)`: Adds an item and returns the new length.
- `Array.pop(arr)`: Removes and returns the last item.
- `Array.join(arr, sep)`: Joins elements into a string using `sep`.
- `Array.slice(arr, start, [end])`: Returns a sub-array.
- `Array.reverse(arr)`: Reverses the array in place and returns it.
- `Array.includes(arr, val)` / `Array.indexOf(arr, val)`.

## `Regex` Module
- `Regex.test(pattern, str, [flags])`: Returns boolean if pattern matches.
- `Regex.match(pattern, str, [flags])`: Returns array of matches or `null`.
- `Regex.replace(pattern, str, replacement, [flags])`: Replaces matched pattern with replacement.

### `JSON` Module
- `JSON.stringify(val)`: Converts a NovaScript value to a JSON string.
- `JSON.parse(str)`: Parses a JSON string back into a NovaScript object/array/value (recursive).

## `Date` Module
- `Date.now()`: Current timestamp in ms.
- `Date.parse(dateStr)`: Parses date string to ms.
- `Date.toISO([ms])`: Returns ISO-8601 string.
- `Date.toUTC([ms])`: Returns UTC string.

## `Math` Module
Expanded to include full trigonometric and logarithmic functions:
- `Math.sqrt(n)`: Returns the square root of n.
- `Math.abs(n)`: Returns the absolute value of n.
- `Math.floor(n)`: Rounds n down to the nearest integer.
- `Math.ceil(n)`: Rounds n up to the nearest integer.
- `Math.round(n)`: Rounds n to the nearest integer.
- `Math.log(n)`: Natural logarithm.
- `Math.random()`: Returns a random number between 0 and 1.
- `Math.sin(n)`, `Math.cos(n)`, `Math.tan(n)`: Trigonometric functions (radians).
- `Math.pi`: The mathematical constant π.
- `Math.e`: The mathematical constant e.

## `Base64` Module
- `Base64.encode(str)` / `Base64.decode(str)`.

## `Sys` Module
Access operating system details and execute commands:
- `Sys.platform`, `Sys.arch`, `Sys.version`, `Sys.uptime()`, `Sys.hostname()`, `Sys.totalmem()`, `Sys.freemem()`
- `Sys.env(key)`: Retrieves environment variables.
- `Sys.exec(command)`: Executes a shell command synchronously.
- `Sys.exit(code)`: Exits the process.

## `FS` Module (FileSystem)
Cross-platform file manipulation:
- Read/Write: `FS.read`, `FS.write`, `FS.append`
- Operations: `FS.copy`, `FS.move`, `FS.rename`, `FS.delete`
- Directories: `FS.mkdir`, `FS.rmdir`, `FS.list`, `FS.search`
- Checks: `FS.exists`, `FS.isFile`, `FS.isDir`

## `HTTP` Module
Native cross-platform networking:
- `HTTP.get(url)` / `HTTP.post(url, body)`
- `HTTP.createServer()`: Build Web Servers in Nova!

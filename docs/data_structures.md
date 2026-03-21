# Data Structures in NovaScript

NovaScript has deeply integrated primitives for Collections, particularly Arrays and Objects (Records). It also provides powerful utility extensions on Strings.

## Array Methods

Arrays are indexed dynamically typed ordered groupings of elements (`let arr = [1, "two", null]`).

- **`arr.push(element)`**: Adds `element` to the end of the array, returning the new length.
- **`arr.pop()`**: Removes the last element from an array and returns that element. If empty, returns `null`.
- **`arr.join(separator)`**: Combines all array elements into a string separated by `separator` (defaults to `","`).
- **`arr.slice(start, end?)`**: Returns a shallow copy of a portion of an array into a new array.
- **`arr.reverse()`**: Reverses an array in place.
- **`arr.includes(searchElement)`**: Returns `true` if the array contains `searchElement`, else `false`.
- **`arr.indexOf(searchElement)`**: Returns the first index at which the element can be found in the array, or `-1`.

### High-Order Array Methods
NovaScript supports inline callback execution via closures or arrow functions.
- **`arr.forEach((el, index) => ...)`**: Executes callback for each array element.
- **`arr.map((el) => ...)`**: Creates a new array populated with the results of calling the function on every element.
- **`arr.filter((el) => ...)`**: Creates a shallow copy containing only elements passing the test.
- **`arr.find((el) => ...)`**: Returns the first element that satisfies the provided test, or `null`.
- **`arr.reduce((acc, el) => ..., initialValue?)`**: Executives a reducer callback resolving to a single output value.

## String Methods

Strings natively inherit JS-style prototyping mechanisms internally:

- **`str.split(separator)`**: Splits string into an array.
- **`str.replace(target, replacement)`**: Replaces first occurance.
- **`str.replaceAll(target, replacement)`**: Replaces all occurances.
- **`str.upper()`**: Returns uppercase string.
- **`str.lower()`**: Returns lowercase string.
- **`str.trim()`**: Removes whitespace from both extremities.
- **`str.includes(substring)`**: Verifies substring inclusion (`boolean`).
- **`str.slice(start, end?)`**: Slices bounds of a string securely. 
- **`str.indexOf(substring)`**: Index tracking.
- **`str.startsWith(substring)`** / **`str.endsWith(substring)`**: Anchor binding logic.
- **`str.padStart(length, padStr)`** / **`str.padEnd(length, padStr)`**: Dynamic padding mechanics.
- **`str.repeat(count)`**: Concatenates a string recursively `count` times.
- **`str.charAt(index)`**: Yields exact active character block.

## Objects (Records)

Objects map dictionary entities. Keys can be identifiers or strings. Assignment can use `=` (Nova-style) or `:` (Standard JSON-style).

```novascript
# Standard Object Literal (Nova-style)
let config = {
    port = 8080,
    active = true
}
print(config.port) 

# Deeply nested with standard Javascript/JSON colons & quotes
let userMap = {
    "user-id": "N-199",
    "access-token": "abc.123",
    role: "admin"
}

# Bracket Notation is 100% available natively resolving dynamic strings!
let keyTarget = "access-token"
print(userMap[keyTarget])
```

## Advanced Chaining & Optional Access (v6.1.1+)
Starting with v6.1.1, NovaScript supports completely unrestricted method and property chaining, letting you mix arrays, objects, and function calls gracefully.

```novascript
let payload = {
    data: fn() {
        return [
            { id: 1, getMeta: fn() { return "Meta1" } }
        ]
    }
}

# Unlimited method chaining and indexing works recursively
print(payload.data()[0].getMeta())

# Safely chain using optional operator
print(payload?.missing?.method?()) # returns null safely instead of exploding
```


## JSON Casting
- `parseJson(jsonString)` is injected as a global utility resolving native JavaScript JSON strings immediately to NovaScript Record definitions without requiring `import`s!
- Overwhelmingly simplifies configurations immediately fetched across `HTTP.get()`.

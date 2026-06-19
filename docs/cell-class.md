# Cell Class

Lets authors apply a CSS class to a block cell `div` by placing a `[classname]` code snippet as the first element of that cell. The snippet is consumed during decoration and does not appear in the rendered page.

This is a separate system from the span-tags `[[double-bracket]]` syntax. Single brackets authored as **inline code** (backtick) target the parent cell div; double brackets authored as plain text target inline text spans within a paragraph or heading.

---

## 1. Authoring

### 1.1 Syntax

In a DA document, type the class name in single square brackets and apply **inline code** formatting (backtick). Place it as the very first line of the cell — before any other content:

```
`[color-primary]`
Symptoms are typically first seen in the first week of treatment.
```

The `` `[color-primary]` `` line is removed during decoration. The rendered result is:

```html
<div class="color-primary">
  <p>Symptoms are typically first seen in the first week of treatment.</p>
</div>
```

### 1.2 Position requirement

The code snippet must be the **first element** in the cell. A code snippet elsewhere in the cell is not matched and the cell is left unchanged.

✅ First line of the cell — matched and removed:
```
`[color-primary]`
Cell content follows here.
```

❌ Not the first element — ignored:
```
Cell content starts here.
`[color-primary]`
```

### 1.3 Class name rules

Only letters, digits, hyphens, and underscores are accepted. Invalid names are silently ignored and the cell is left unchanged.

```
✅ `[color-primary]`
✅ `[hide-mobile]`
✅ `[stats_callout]`
❌ `[color primary]`    — space not allowed
❌ `[color@primary]`   — special character not allowed
❌ `[]`                — empty name not matched
```

---

## 2. Developer

### 2.1 Where the code lives

`decorateCellClass(block)` is exported from `scripts/utils.js`.

### 2.2 How it works

The function iterates every cell `div` (each direct child of each row) inside the block. For each cell it checks whether:

1. The first element child is a `<p>`
2. That `<p>` contains exactly one child element, and it is a `<code>`
3. The `<code>` text content matches `/^\[([a-zA-Z0-9_-]+)\]$/`

When all three conditions are met, the matched class name is added to the cell `div` and the `<p>` is removed. Cells that do not match are left completely unchanged.

### 2.3 How to use it in a block

Import from `scripts/utils.js` and call it as the first line of `decorate(block)`, before any other DOM manipulation:

```javascript
import { decorateCellClass } from '../../scripts/utils.js';

export default function decorate(block) {
  decorateCellClass(block);

  // existing decoration logic follows unchanged...
}
```

Reference implementation: `blocks/columns/columns.js`.

### 2.4 Compatibility

`decorateCellClass` works with any block that uses the standard EDS cell structure:

```
.block
  └── div  (row)
        └── div  (cell)  ← class is added here
              ├── p > code  ← consumed and removed
              └── ...remaining cell content unchanged
```

It makes no assumptions about the number of rows or columns, and is safe to call on blocks with no matching cells.

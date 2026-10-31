const fs = require('fs');
const acorn = require('acorn');

const src = fs.readFileSync('archive/original/script.js', 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2020, sourceType: 'script', ranges: true, loc: true, locations: true });

const firstStmtStart = ast.body[0].range[0];
const header = src.slice(0, firstStmtStart); // includes leading comments and newlines

// Read current 01-dom-refs.js
const firstFile = 'js/01-dom-refs.js';
let content = fs.readFileSync(firstFile, 'utf8');

// Prepend header if not already present
if (!content.startsWith(header.trimStart())) {
  content = header + content;
  fs.writeFileSync(firstFile, content, 'utf8');
  console.log('Prepended header to', firstFile);
} else {
  console.log('Header already present');
}

// Also ensure last file (11-init.js) includes any trailing comments after last statement
const lastStmtEnd = ast.body[ast.body.length - 1].range[1];
const trailing = src.slice(lastStmtEnd);
const lastFile = 'js/11-init.js';
let lastContent = fs.readFileSync(lastFile, 'utf8');
if (trailing.trim() && !lastContent.endsWith(trailing)) {
  lastContent = lastContent + trailing;
  fs.writeFileSync(lastFile, lastContent, 'utf8');
  console.log('Appended trailing to', lastFile);
}

console.log('Fixed header/trailing');
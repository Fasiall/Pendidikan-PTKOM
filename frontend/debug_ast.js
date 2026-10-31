const fs = require('fs');
const acorn = require('acorn');
const src = fs.readFileSync('archive/original/script.js', 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2020, sourceType: 'script', ranges: true, loc: true });
console.log('Body length:', ast.body.length);
ast.body.forEach((node, i) => {
  console.log(i, node.type, node.loc ? node.loc.start.line : 'no loc');
});
const fs = require('fs');
const acorn = require('acorn');

const src = fs.readFileSync('archive/original/script.js', 'utf8');

// Parse with comments and locations
const comments = [];
const ast = acorn.parse(src, {
  ecmaVersion: 2020,
  sourceType: 'script',
  onComment: comments,
  ranges: true,
  loc: true,
  locations: true
});

const lines = src.split('\n');
const sectionLines = [];
lines.forEach((line, idx) => {
  if (line.includes('/* ===============') && line.includes(')')) {
    sectionLines.push({line: idx+1, text: line.trim()});
  }
});
console.log('Section comments at lines:');
sectionLines.forEach(s => console.log(s.line, s.text));

const groupNames = [
  '01-dom-refs',
  '02-state',
  '03-api-helpers',
  '04-navigation',
  '05-decorations',
  '06a-quiz-render',
  '06b-quiz-answer',
  '07-animations',
  '08-results',
  '09a-auth',
  '09b-dashboard',
  '10a-admin-materials',
  '10b-admin-questions',
  '11-init'
];

const sectionStartLines = sectionLines.map(s => s.line);
sectionStartLines.push(lines.length + 1);

const lineToGroup = new Array(lines.length + 2).fill(0);
for (let g = 0; g < sectionStartLines.length - 1; g++) {
  const start = sectionStartLines[g];
  const end = sectionStartLines[g+1];
  for (let l = start; l < end; l++) {
    lineToGroup[l] = g;
  }
}

// Top-level statements
const statements = ast.body.map(node => ({
  node,
  startLine: node.loc.start.line,
  endLine: node.loc.end.line,
  start: node.range[0],
  end: node.range[1]
}));

statements.forEach(st => {
  st.group = lineToGroup[st.startLine] || 0;
});

const groupStatements = {};
statements.forEach(st => {
  if (!groupStatements[st.group]) groupStatements[st.group] = [];
  groupStatements[st.group].push(st);
});

const splitCounts = {
  0: 1, // dom
  1: 1, // state
  2: 1, // api
  3: 1, // nav
  4: 1, // decor
  5: 2, // quiz -> 06a, 06b
  6: 1, // anim
  7: 1, // results
  8: 2, // auth/dashboard -> 09a, 09b
  9: 2, // admin -> 10a, 10b
  10: 1 // init
};

const outputDir = 'js';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

let fileIndex = 0;
for (let g = 0; g <= 10; g++) {
  const stmts = groupStatements[g] || [];
  const count = splitCounts[g] || 1;
  if (count === 1) {
    const code = stmts.map(s => src.slice(s.start, s.end)).join('\n');
    const fname = `${outputDir}/${groupNames[fileIndex]}.js`;
    fs.writeFileSync(fname, code, 'utf8');
    console.log(`Wrote ${fname} (${stmts.length} stmts)`);
    fileIndex++;
  } else {
    const totalLines = stmts.reduce((sum, s) => sum + (s.endLine - s.startLine + 1), 0);
    const target = totalLines / count;
    let parts = [];
    let current = [];
    let currentLines = 0;
    stmts.forEach(s => {
      const lines = s.endLine - s.startLine + 1;
      if (current.length > 0 && currentLines + lines > target && parts.length < count - 1) {
        parts.push(current);
        current = [];
        currentLines = 0;
      }
      current.push(s);
      currentLines += lines;
    });
    parts.push(current);
    parts.forEach((part, pi) => {
      const code = part.map(s => src.slice(s.start, s.end)).join('\n');
      const fname = `${outputDir}/${groupNames[fileIndex]}.js`;
      fs.writeFileSync(fname, code, 'utf8');
      console.log(`Wrote ${fname} (${part.length} stmts)`);
      fileIndex++;
    });
  }
}
console.log('Done');
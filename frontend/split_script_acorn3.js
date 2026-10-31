const fs = require('fs');
const acorn = require('acorn');

const src = fs.readFileSync('archive/original/script.js', 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2020, sourceType: 'script', ranges: true, loc: true, locations: true });

const lines = src.split('\n');
const sectionLines = [];
lines.forEach((line, idx) => {
  if (line.includes('/* ===============') && line.includes(')')) {
    sectionLines.push({line: idx+1, text: line.trim()});
  }
});

// Find character positions of section comments
const sectionPositions = [];
let pos = 0;
lines.forEach((line, idx) => {
  if (line.includes('/* ===============') && line.includes(')')) {
    sectionPositions.push(pos);
  }
  pos += line.length + 1;
});

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
  0: 1, 1: 1, 2: 1, 3: 1, 4: 1,
  5: 2, 6: 1, 7: 1, 8: 2, 9: 2, 10: 1
};

const outputDir = 'js';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

let fileIndex = 0;
for (let g = 0; g <= 10; g++) {
  const stmts = groupStatements[g] || [];
  const count = splitCounts[g] || 1;

  // Determine the start position for this group
  // Group 0 starts at 0 (includes first section comment)
  // Other groups start at their section comment position
  const groupStartPos = (g === 0) ? 0 : sectionPositions[g];

  if (count === 1) {
    const start = groupStartPos;
    const end = stmts[stmts.length - 1].end;
    const code = src.slice(start, end);
    const fname = `${outputDir}/${groupNames[fileIndex]}.js`;
    fs.writeFileSync(fname, code, 'utf8');
    console.log(`Wrote ${fname} (${stmts.length} stmts) range ${start}-${end}`);
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
      const start = (g === 0 && pi === 0) ? 0 : (pi === 0 ? groupStartPos : part[0].start);
      const end = part[part.length - 1].end;
      const code = src.slice(start, end);
      const fname = `${outputDir}/${groupNames[fileIndex]}.js`;
      fs.writeFileSync(fname, code, 'utf8');
      console.log(`Wrote ${fname} (${part.length} stmts) range ${start}-${end}`);
      fileIndex++;
    });
  }
}
console.log('Done');
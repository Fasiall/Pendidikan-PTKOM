const fs = require('fs');
const path = require('path');

const frontend = 'D:/Website/Pendidikan-PTKOM/frontend';

// Load order for script.js modules
const scriptModules = [
  'js/01-dom-refs.js',
  'js/02-state.js',
  'js/03-api-helpers.js',
  'js/04-navigation.js',
  'js/05-decorations.js',
  'js/06a-quiz-render.js',
  'js/06b-quiz-answer.js',
  'js/07-animations.js',
  'js/08-results.js',
  'js/09a-auth.js',
  'js/09b-dashboard.js',
  'js/10a-admin-materials.js',
  'js/10b-admin-questions.js',
  'js/11-init.js'
];

// Update manifest.json
const manifest = {
  version: '2.0',
  description: 'JavaScript load order. Phase B re-split with acorn at statement boundaries.',
  loadOrder: scriptModules,
  originalFile: 'script.js',
  entryPoint: 'js/11-init.js'
};
fs.writeFileSync(path.join(frontend, 'js', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('Updated js/manifest.json');

function replaceScriptTags(htmlFile, modules, extraBefore = [], extraAfter = [], version = 12) {
  let html = fs.readFileSync(path.join(frontend, htmlFile), 'utf8');
  const scriptTags = modules.map(m => `  <script src="${m}?v=${version}"></script>`).join('\n');
  const beforeTags = extraBefore.map(m => `  <script src="${m}?v=${version}"></script>`).join('\n');
  const afterTags = extraAfter.map(m => `  <script src="${m}?v=${version}"></script>`).join('\n');
  const allTags = [beforeTags, scriptTags, afterTags].filter(Boolean).join('\n');

  // Find the script.js tag(s) and replace block
  // We'll replace from first occurrence of '<script src="script.js' to the last '</script>' before next non-script? Simpler: replace the whole block of script tags that include script.js.
  // Use regex to replace from first <script src="script.js...> up to the next </script> that ends the block? But there may be multiple script tags.
  // In index.html and login.html, there is a single <script src="script.js...> line.
  // We'll replace that line with allTags.
  const regex = /<script src="script\.js[^"]*"><\/script>/;
  if (regex.test(html)) {
    html = html.replace(regex, allTags);
  } else {
    // maybe there are multiple lines? fallback: replace any script.js occurrence
    html = html.replace(/<script src="script\.js[^>]*><\/script>/g, allTags);
  }
  fs.writeFileSync(path.join(frontend, htmlFile), html, 'utf8');
  console.log(`Updated ${htmlFile}`);
}

replaceScriptTags('index.html', scriptModules, [], ['home.js'], 12);
replaceScriptTags('login.html', scriptModules, [], [], 12);

// For materi.html and materi-detail.html: they load materi.js (and now materi-data.js before)
function replaceMateriScripts(htmlFile, version = 2) {
  let html = fs.readFileSync(path.join(frontend, htmlFile), 'utf8');
  // Replace <script src="materi.js...> with materi-data.js then materi.js
  const newTags = `  <script src="js/materi-data.js?v=${version}"></script>\n  <script src="materi.js?v=${version}"></script>`;
  html = html.replace(/<script src="materi\.js[^>]*><\/script>/, newTags);
  fs.writeFileSync(path.join(frontend, htmlFile), html, 'utf8');
  console.log(`Updated ${htmlFile}`);
}

replaceMateriScripts('materi.html', 2);
replaceMateriScripts('materi-detail.html', 2);

console.log('All HTML updated');
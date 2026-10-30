console.log('__dirname:', __dirname);
const path = require('path');
const ROOT = path.dirname(__dirname);
console.log('ROOT:', ROOT);
console.log('frontendDir:', path.join(ROOT, '..', 'frontend'));

const path = require('path'); const ROOT = __dirname.replace(/[\/]+src$/, ''); console.log('ROOT:', ROOT); console.log('frontendDir:', path.join(ROOT, '..', 'frontend'));

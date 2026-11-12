const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, 'backend');

if (!require('fs').existsSync(BACKEND_DIR)) {
  require('fs').mkdirSync(BACKEND_DIR, { recursive: true });
  console.log('Created backend directory');
}

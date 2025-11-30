const path = require('path');

const rootDir= path.dirname(require.main.filename);
module.exports = rootDir;
// require.main.filename - it will give the path of the main file which is executed first.
// path.dirname() - it will give the directory name of the file.

var path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  },
  node: {
    // dns: 'mock',
    fs: 'empty',
    // path: true,
    // url: false
  }
};

const path = require('path');


module.exports = {
  devtool: false, //'eval-source-map',
  experiments: {
    outputModule: true,
  },
  entry: './cfrm/static/libs.mjs',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'cfrm/static'),
    filename: 'libs-pack.mjs',
    library: {
      type: 'module',
      //export: 'default',
    },
  },
};



/* OF:

export default {
    // same stuff here

}
*/

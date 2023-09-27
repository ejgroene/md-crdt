const path = require('path');
//const HtmlWebpackPlugin = require("html-webpack-plugin");
const {ModuleFederationPlugin} = require("webpack").container;
//const {ContainerPlugin} = require("webpack").container;
//const ExternalTemplateRemotesPlugin = require("external-remotes-plugin");



module.exports = {

  devtool: false, //'eval-source-map',
  experiments: {
    outputModule: true,
  },
  entry: {
    libs: './cfrm/static/libs.mjs',
  },
  mode: 'development',

  plugins: [
    new ModuleFederationPlugin({
      name: "libs",  // must match entry name
      //library: {
      //  type: 'module',
      //},
      exposes: ["./cfrm/static/libs.mjs"]
    }),
    //new HtmlWebpackPlugin({
    //  template: 'generated-by-HtmlWebpackPlugin',
    //}),
  ],

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

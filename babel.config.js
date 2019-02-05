module.exports = {
  presets: [["@babel/env", { targets: { node: true } }], "@babel/typescript"],
  plugins: ["@babel/plugin-proposal-object-rest-spread"],
};

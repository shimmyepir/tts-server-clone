module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ["airbnb-base"],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    quotes: [2, "double", { avoidEscape: true }],
    "no-underscore-dangle": "off",
    curly: "off",
    "nonblock-statement-body-position": "off",
    "consistent-return": "off",
    "operator-linebreak": "off",
    "no-console": "off",
    "no-param-reassign": "off",
    indent: "off",
    "comma-dangle": [
      "error",
      {
        arrays: "only-multiline",
        objects: "only-multiline",
      },
    ],
  },
};

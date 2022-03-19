module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ["airbnb-base", "plugin:cypress/recommended"],
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
    "no-plusplus": "off",
    "object-curly-newline": "off",
    camelcase: "off",
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

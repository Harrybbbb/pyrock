module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended"],
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
  },
};

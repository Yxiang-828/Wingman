module.exports = {
  presets: [
    // Transform modern JavaScript to work in Node.js
    [
      "@babel/preset-env",
      {
        targets: { node: "current" },
        modules: "auto", // Let Babel decide module format
      },
    ],

    // Transform React JSX syntax
    [
      "@babel/preset-react",
      {
        runtime: "automatic", // Use new JSX transform
      },
    ],

    // Transform TypeScript syntax
    "@babel/preset-typescript",
  ],

  // Transform dynamic imports and other modern features
  plugins: ["@babel/plugin-transform-runtime"],

  // Different configs for different environments
  env: {
    test: {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        ["@babel/preset-react", { runtime: "automatic" }],
        "@babel/preset-typescript",
      ],
    },
  },
};

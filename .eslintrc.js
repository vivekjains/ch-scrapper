module.exports = {
    extends: ["airbnb-base"],
    parser: "@babel/eslint-parser",
    parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
            forOf: true,
        },
    },

    env: {
        node: true,
        es6: true,
    },
    rules: {
        "import/no-cycle": ["warn"],
        "prefer-destructuring": ["off"],
        "object-curly-newline": ["off"],
        "no-nested-ternary": ["off"],
        "default-case": ["off"],
        "no-continue": ["off"],
        camelcase: ["off"],
        "prefer-template": ["off"],
        "no-await-in-loop": ["off"],
        radix: ["off"],
        "no-console": ["off"],
        "no-bitwise": ["off"],
        "operator-linebreak": ["off"],
        "lines-between-class-members": ["off"],
        "no-restricted-syntax": ["error", "ForStatement"],
        "no-param-reassign": ["error", { props: false }],
        "class-methods-use-this": ["error", { exceptMethods: ["registerRoutes"] }],
        quotes: ["error", "double"],
        indent: ["error", 4, { SwitchCase: 1 }],
        "max-len": ["warn", { ignoreStrings: true, code: 220 }],
    },
};

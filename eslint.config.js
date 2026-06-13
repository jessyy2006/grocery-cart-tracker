import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Design-system guardrails — keep product UI on the tokens (see DESIGN.md).
  // Scoped to pages + top-level components; excludes ui/ primitives and the
  // receipt-export files (finance/, trip/) which legitimately need literals.
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/rounded-\\[/]",
          message:
            "Use a radius token (rounded-control / rounded-card / rounded-sheet), not an arbitrary rounded-[Npx]. See DESIGN.md.",
        },
        {
          selector: "TemplateElement[value.cooked=/rounded-\\[/]",
          message:
            "Use a radius token (rounded-control / rounded-card / rounded-sheet), not an arbitrary rounded-[Npx]. See DESIGN.md.",
        },
        {
          selector: "Literal[value=/(text|bg|border|ring)-red-/]",
          message: "Use the `destructive` token, not a raw red-* color. See DESIGN.md.",
        },
        {
          selector: "TemplateElement[value.cooked=/(text|bg|border|ring)-red-/]",
          message: "Use the `destructive` token, not a raw red-* color. See DESIGN.md.",
        },
      ],
    },
  },
);

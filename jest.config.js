const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const base = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/e2e/",
  ],
  clearMocks: true,
};

const esmDeNodeModules = [
  "@heroui",
  "react-aria",
  "react-stately",
  "@react-aria",
  "@react-stately",
  "@react-types",
  "@internationalized",
  "@swc/helpers",
  "lucide-react",
].join("|");

module.exports = async () => {
  const unidade = await createJestConfig({
    ...base,
    displayName: "unit",
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/unit/**/*.test.{ts,tsx}"],
  })();

  const integracao = await createJestConfig({
    ...base,
    displayName: "integration",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    testMatch: ["<rootDir>/tests/integration/**/*.test.{ts,tsx}"],
  })();

  return {
    projects: [
      unidade,
      {
        ...integracao,
        transformIgnorePatterns: [
          `/node_modules/(?!.pnpm)(?!(${esmDeNodeModules})/)`,
          "^.+\\.module\\.(css|sass|scss)$",
        ],
        moduleNameMapper: {
          ...integracao.moduleNameMapper,
          "^@heroui/react$":
            "<rootDir>/node_modules/@heroui/react/dist/index.js",
        },
      },
    ],
  };
};

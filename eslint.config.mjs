import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      '.codex/**',
      '.codex-plugin/**',
      'dist/**',
      'node_modules/**',
    ],
  },
  {
    name: 'partita/effect-boundaries',
    files: ['bin/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:test',
              message: 'Use @effect/vitest for Effect-aware tests.',
            },
            {
              name: 'vitest',
              message: 'Use @effect/vitest for Effect-aware tests.',
            },
            {
              name: '@effect/cli',
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
          ],
          patterns: [
            {
              group: ['@effect/cli/*'],
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
            {
              group: ['repos/effect/**', '**/repos/effect/**'],
              message: 'repos/effect is read-only reference material; import installed packages instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[object.name="Context"][property.name="Tag"]',
          message: 'Use Context.Service for Effect v4 beta service definitions.',
        },
        {
          selector: 'MemberExpression[object.name="Effect"][property.name=/^(asVoid|catchAllCause|ignore|serviceOption)$/]',
          message: 'This Effect member is banned by the harness guardrails; use the Effect-native safer pattern.',
        },
      ],
    },
  },
)

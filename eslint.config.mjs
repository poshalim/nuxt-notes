import withNuxt from './.nuxt/eslint.config.mjs'

const publicApiOnly = {
  group: ['~/shared/*/*', '~/entities/*/*', '~/features/*/*', '~/widgets/*/*'],
  message: 'Import other slices through their public API (index.ts).',
}

/** FSD: a layer may import only from layers below it. */
function layerRule(files, forbidden) {
  const patterns = [publicApiOnly]
  if (forbidden.length) {
    patterns.push({
      group: forbidden.map(layer => `~/${layer}/**`),
      message: `This layer must not depend on: ${forbidden.join(', ')}.`,
    })
  }
  return { files, rules: { 'no-restricted-imports': ['error', { patterns }] } }
}

export default withNuxt(
  layerRule(['app/**'], []),
  layerRule(['app/shared/**'], ['entities', 'features', 'widgets']),
  layerRule(['app/entities/**'], ['features', 'widgets']),
  layerRule(['app/features/**'], ['features', 'widgets']),
  layerRule(['app/widgets/**'], ['widgets']),
)

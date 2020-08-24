const test = require('tape')

const loadSvelteConfig = require('svelte-universal-component-compiler/loadSvelteConfig')

test('loads Svelte config files from CWD', async (t) => {
  const config = await loadSvelteConfig()

  t.equal(config.config.dev, true)
  t.equal(config.config.customElement, false)
  t.equal(config.preprocessConfig, undefined)
})

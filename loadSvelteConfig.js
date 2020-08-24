/**
 * Load up Svelte config file from the provided directory, or process.env.CWD if not specified.
 *
 * @package: Svelte universal component compiler
 * @since:   2020-08-24
 */

const path = require('path')

module.exports = function loadSvelteConfig (fromDir) {
  if (!fromDir) fromDir = process.cwd()

  let config, preprocessConfig
  try {
    config = require(path.resolve(fromDir, 'svelte.config'))
    preprocessConfig = config.preprocess
    /* eslint dot-notation: 0 */
    delete config['preprocess']
  } catch (e) {
    return {}
  }
  return { config, preprocessConfig }
}

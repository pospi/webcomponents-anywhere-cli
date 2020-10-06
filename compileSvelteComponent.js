/**
 * Compiles Svelte components to generate standard WebComponents.
 *
 * @see https://github.com/sveltejs/rollup-plugin-svelte/blob/master/index.js for comparison
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-09-20
 */

const fs = require('fs')
const readFile = fs.promises.readFile
const { compile, preprocess } = require('svelte/compiler')
const mappedFileExt = require('./mappedFileExt')

const bindCompileSvelteComponent = (config, preprocessConfig, errorContext) => async (path) => {
  const thisFileOpts = { filename: path }
  const cssId = mappedFileExt(path, 'css')

  // load the input file
  let fileData
  try {
    fileData = (await readFile(path)).toString()
  } catch (err) {
    err.message = `Error reading ${path}: ${err.message}`
    throw err
  }

  // compile the component
  let compiled
  try {
    const processed = await preprocess(fileData, preprocessConfig, thisFileOpts)
    errorContext.addCompilerWarnings(path, processed.warnings)

    compiled = compile(
      processed.toString(),
      Object.assign({}, config, thisFileOpts, { generate: 'dom', customElement: true, tag: null }),
    )
    errorContext.addCompilerWarnings(path, compiled.warnings)
  } catch (err) {
    err.message = `Error compiling ${path}: ${err.message}`
    throw err
  }

  if (compiled.css.code) {
    // add CSS sourcemap
    const sourcemapComment = `/*# sourceMappingURL=${compiled.css.map.toUrl()} */`
    compiled.css.code += `\n${sourcemapComment}`

    // add import of CSS into JS component
    compiled.js.code = `import ${JSON.stringify(cssId)}\n\n` + compiled.js.code
  }

  return compiled
}

module.exports = bindCompileSvelteComponent

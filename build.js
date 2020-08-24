#!/usr/bin/env node
/**
 * Build script to turn Svelte components into compiled, ready-to-go, runtime-specific
 * components that can be dropped in to native web, React & Angular projects (and
 * potentially others in future) without requiring any bundler / loader configuration.
 *
 * @see https://github.com/sveltejs/rollup-plugin-svelte/blob/master/index.js for comparison
 *
 * @package: svelte-universal-component-compiler
 * @since:   2019-12-16
 */

const path = require('path')
const fs = require('fs')
const mkdir = fs.promises.mkdir
const globby = require('globby')
const { compile, preprocess } = require('svelte/compiler')

const createErrorContext = require('./errorContext')
const loadSvelteConfig = require('./loadSvelteConfig')

// :TODO: make config path, build dir and match expression configurable

const { config, preprocessConfig } = loadSvelteConfig(/* :TODO: pass as option */)

const MATCH_PATHS = 'src/views/util/bind-context-agent/*.svelte'
const BUILD_BASEDIR = path.resolve(process.cwd(), 'build/')

const main = async () => {
  const threads = []
  const { addError, addCompilerWarnings, outputErrors } = createErrorContext()

  // iterate over all Svelte components
  for await (const path of globby.stream(MATCH_PATHS)) {
    threads.push(new Promise((resolve, reject) => {
      fs.readFile(path, async (err, file) => {
        if (err) {
          addError(`Error reading ${path}`, err)
          return resolve() // always return success, log errors non-fatally & separately
        }

        const thisFileOpts = { filename: path }
        const cssId = getFileId(path, 'css')

        // compile the component
        let compiled

        try {
          const processed = await preprocess(file.toString(), preprocessConfig, thisFileOpts)
          addCompilerWarnings(path, processed.warnings)

          compiled = compile(
            processed.toString(),
            Object.assign({}, config, thisFileOpts, { generate: 'dom', customElement: true, tag: null }),
          )
          addCompilerWarnings(path, compiled.warnings)
        } catch (err) {
          addError('', err)
          return resolve()
        }

        if (compiled.css.code) {
          // add CSS sourcemap
          const sourcemapComment = `/*# sourceMappingURL=${compiled.css.map.toUrl()} */`
          compiled.css.code += `\n${sourcemapComment}`

          // add import of CSS into JS component
          compiled.js.code = `import ${JSON.stringify(cssId)}\n\n` + compiled.js.code
        }

        // write assets to disk
        try {
          await writeComponentFiles(path, compiled)
        } catch (err) {
          addError(`Error writing ${path}`, err)
        }

        // mark component as completed
        resolve()
      })
    }))
  }

  Promise.all(threads)
    .then(outputErrors)
    .catch((e) => {
      addError('Unhandled file processing error', e)
      outputErrors()
    })
}

async function writeComponentFiles (filePath, compiled) {
  const dest = path.resolve(BUILD_BASEDIR, filePath)

  await mkdir(path.dirname(dest), { recursive: true })

  if (compiled.css.code) {
    await writeFilePromise(getFileId(dest, 'css'), compiled.css.code)
  }
  if (compiled.js.code) {
    await writeFilePromise(getFileId(dest, 'js'), compiled.js.code)
  }

  // :TODO: write JS sourcemap; write CSS sourcemap separately
}

function getFileId (path, newExt) {
  return path.replace(/\.svelte$/, `.${newExt}`)
}

function writeFilePromise (filePath, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, (err, res) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

main()

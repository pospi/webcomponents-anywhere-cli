#!/usr/bin/env node
/**
 * Build script to turn WebComponents into compiled, ready-to-go, runtime-specific
 * components that can be dropped in to native web, React & Angular projects (and
 * potentially others in future) without requiring any bundler / loader configuration.
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2019-12-16
 */

const path = require('path')
const globby = require('globby')

const createErrorContext = require('./errorContext')
const mappedFileExt = require('./mappedFileExt')
const copySourcePkgFiles = require('./copySourcePkgFiles')
const loadSvelteConfig = require('./loadSvelteConfig')
const bindCompileSvelteComponent = require('./compileSvelteComponent')
const writeSvelteComponentFiles = require('./writeSvelteComponentFiles')

const CWD = process.cwd()
const DEFAULT_OPTS = {
  outputDir: path.resolve(CWD, 'build/'),
  inputBaseDir: CWD,
  svelteConfigDir: CWD,
}

const argv = require('yargs')
  .usage('Usage: $0 path1, path2, ...pathN [options]')
  .default(DEFAULT_OPTS)
  .option('outputDir', {
    type: 'string',
    description: 'Path to write build files to. A separate subdirectory tree will be generated for each output target.',
  })
  .option('inputBaseDir', {
    type: 'string',
    description: 'Base directory to resolve input files against. Used to determine output paths relative to $outputDir.',
  })
  .option('svelteConfigDir', {
    type: 'string',
    description: 'Path to load Svelte config options from, if different from current working directory',
  })
  .demandCommand(1)
  .demandOption([])
  .argv

const { config, preprocessConfig } = loadSvelteConfig(argv.svelteConfigDir)

const MATCH_PATHS = argv._
const BUILD_BASEDIR = argv.outputDir
const INPUT_BASEDIR = path.resolve(CWD, argv.inputBaseDir)

const main = async () => {
  const threads = []

  const errorContext = createErrorContext()
  const compileSvelteComponent = bindCompileSvelteComponent(config, preprocessConfig, errorContext)
  const { addError, outputErrors } = errorContext

  // iterate over all component packages under the source dir, excluding node_modules
  const globs = MATCH_PATHS.map(
    p => [
      path.resolve(CWD, p) + '/**/package.json',
      '!' + path.resolve(CWD, p) + '/**/node_modules',
    ],
  ).flat()

  for await (const pkgPath of globby.stream(globs)) {
    const modulePath = path.dirname(pkgPath)
    const destPath = modulePath.replace(new RegExp('^' + INPUT_BASEDIR), BUILD_BASEDIR)

    threads.push((async () => {
      const pkg = require(pkgPath)

      // switch on input module type
      if (!pkg.main || pkg.main.match(/\.js$/) || pkg.main.match(/\.mjs$/)) {
        //
        // PURE JS COMPONENT MODULE - COPY
        //
        try {
          await copySourcePkgFiles(modulePath, destPath)
        } catch (err) {
          addError(`Error bundling WebComponent module in ${pkgPath}`, err)
        }
      } else if (pkg.main.match(/\.svelte$/)) {
        //
        // SVELTE COMPONENT MODULE - COPY & COMPILE
        //
        const entrypointPath = path.resolve(modulePath, pkg.main)
        try {
          await copySourcePkgFiles(modulePath, destPath)
        } catch (err) {
          addError(`Error pre-bundling Svelte module in ${pkgPath}`, err)
        }

        try {
          const compiled = await compileSvelteComponent(entrypointPath)
          writeSvelteComponentFiles(path.resolve(destPath, mappedFileExt(pkg.main, 'js')), compiled)
        } catch (err) {
          addError(`Error compiling Svelte component in ${pkgPath}`, err)
        }
      } else {
        //
        // UNKNOWN MODULE TYPE - IGNORE
        //
        addError(`Ignoring package ${pkg.name}: found in match paths, but unknown contents in ${pkg.main}`)
      }
    })())
  }

  Promise.all(threads)
    .then(outputErrors)
    .catch((e) => {
      addError('Unhandled file processing error', e)
      outputErrors()
    })
}

main()

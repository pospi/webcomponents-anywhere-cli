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
const loadTemplates = require('./loadTemplates')
const processTemplates = require('./processTemplates')

const CWD = process.cwd()
const DEFAULT_OPTS = {
  outputDir: path.resolve(CWD, 'build/'),
  inputBaseDir: CWD,
  svelteConfigDir: CWD,
  templatesDir: null,
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
  .option('templatesDir', {
    type: 'string',
    description: 'Path to load bundler template files from. This can be used to override the output of the compiler- see README for more details.',
  })
  .demandCommand(1)
  .demandOption([])
  .argv

const { config, preprocessConfig } = loadSvelteConfig(argv.svelteConfigDir)

const MATCH_PATHS = argv._
const BUILD_BASEDIR = argv.outputDir
const INPUT_BASEDIR = path.resolve(CWD, argv.inputBaseDir)
const TEMPLATES_DIR = argv.templatesDir ? path.resolve(CWD, argv.templatesDir) : __dirname

const main = async () => {
  const threads = []

  const errorContext = createErrorContext()
  const compileSvelteComponent = bindCompileSvelteComponent(config, preprocessConfig, errorContext)
  const { addError, outputErrors } = errorContext

  // load up templates for rendering component variants
  const templates = await loadTemplates(TEMPLATES_DIR)
  const wcTemplates = templates.wc
  /* eslint dot-notation: 0 */
  delete templates['wc']

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
          return
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
          return
        }

        try {
          const compiled = await compileSvelteComponent(entrypointPath)
          writeSvelteComponentFiles(path.resolve(destPath, mappedFileExt(pkg.main, 'js')), compiled)
        } catch (err) {
          addError(`Error compiling Svelte component in ${pkgPath}`, err)
          return
        }
      } else {
        //
        // UNKNOWN MODULE TYPE - IGNORE
        //
        addError(`Ignoring package ${pkg.name}: found in match paths, but unknown contents in ${pkg.main}`)
        return
      }

      // Module is now compiled in build folder & ready to wrap / bundle.

      //
      // ALL MODULE TYPES - FINALISE WEBCOMPONENT MODULE
      //
      try {
        await processTemplates(destPath, { wc: wcTemplates }, { pkg })
      } catch (err) {
        addError(`Error generating templates for ${pkgPath}`, err)
      }

      //
      // ALL MODULE TYPES - GENERATE PER-FRAMEWORK WRAPPERS
      //
      try {
        const componentPkgPath = path.resolve(destPath, 'package.json')
        const componentPkg = require(componentPkgPath) // :NOTE: use final generated package file
        await processTemplates(destPath, templates, { pkg, componentPkg })
      } catch (err) {
        addError(`Error generating templates for ${pkgPath}`, err)
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

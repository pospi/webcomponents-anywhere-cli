/**
 * Loads up EJS template files under a set of source directories.
 * Only *.ejs files are processed.
 *
 * The returned structure is a mapping of template IDs (the directory name
 * component following `template-`*) to mappings of output file paths
 * and EJS compiler functions.
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-10-06
 */

const path = require('path')
const fs = require('fs')
const readFile = fs.promises.readFile
const globby = require('globby')
const compile = require('ejs').compile

async function loadTemplates (templatesDir) {
  const templatesResult = {}

  const globs = path.resolve(templatesDir, 'template-*/**/*.ejs')
  const firstPathRegex = new RegExp(`^/[^${path.sep}]+`)

  const ejsOpts = {
    root: templatesDir, // allow access to imports of other templates or helpers easily via parent folder
    async: true,
  }

  for await (const templateFile of globby.stream(globs)) {
    // template ID is keyed to the suffix of the `template-` folder
    const templateBasePath = templateFile.replace(templatesDir, '')
    const templateId = templateBasePath.match(firstPathRegex)[0].replace(/^\/template-/, '')
    const templateFilename = templateBasePath.replace(firstPathRegex, '').replace('/', '').replace(/\.ejs$/, '')

    const templateData = (await readFile(templateFile)).toString()

    templatesResult[templateId] || (templatesResult[templateId] = {})
    templatesResult[templateId][templateFilename] = compile(templateData, ejsOpts)
  }

  return templatesResult
}

module.exports = loadTemplates

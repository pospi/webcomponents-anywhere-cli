/**
 * Processes a set of EJS template render functions against some data.
 *
 * Data should include at least `pkg` (holding the source package file's contents),
 * and for custom framework module types also `componentPkg` (holding the package
 * file's contents for the final compiled WebComponent generated by this tool)
 * and `componentType` (corresponding to the toplevel key in input templates parameter).
 *
 * @see loadTemplates.js
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-10-06
 */

const path = require('path')
const fs = require('fs')
const writeFile = fs.promises.writeFile
const ensureDirectory = require('./ensureDirectory')

async function processTemplates (destPath, templates, data) {
  for (const [componentType, tpls] of Object.entries(templates)) {
    for (const [templateFile, t] of Object.entries(tpls)) {
      const destFilePath = path.resolve(destPath, (componentType !== 'wc' ? path.join(componentType, templateFile) : templateFile))
      await ensureDirectory(path.dirname(destFilePath))
      await writeFile(destFilePath, await t(Object.assign({ componentType }, data)))
      // :SHONK: fix indentation on JSON files generated by templates
      if (destFilePath.match(/\.json$/)) {
        await writeFile(destFilePath, JSON.stringify(require(destFilePath), null, 2))
      }
    }
  }
}

module.exports = processTemplates

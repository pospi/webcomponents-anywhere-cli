/**
 * Copy source files from a nodejs module package directory to
 * a destination path, ready for publishing.
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-09-27
 */

const path = require('path')
const fs = require('fs')
const copyFile = fs.promises.copyFile
const packlist = require('npm-packlist')
const ensureDirectory = require('./ensureDirectory')

async function copySourcePgkFiles (packageDir, destBaseDir) {
  const files = await packlist({ path: packageDir })

  return Promise.all(files.map(async f => {
    const sPath = path.resolve(packageDir, f)
    const dPath = path.resolve(destBaseDir, f)
    await ensureDirectory(path.dirname(dPath))
    return copyFile(sPath, dPath)
  }))
}

module.exports = copySourcePgkFiles

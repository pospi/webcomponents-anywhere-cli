/**
 * Writes Svelte compiler output to disk, generating standard WebComponent source files.
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-09-27
 */

const path = require('path')
const fs = require('fs')
const mkdir = fs.promises.mkdir
const mappedFileExt = require('./mappedFileExt')

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

const writeSvelteComponentFiles = async (destPath, compiled) => {
  await mkdir(path.dirname(destPath), { recursive: true })

  if (compiled.css.code) {
    await writeFilePromise(mappedFileExt(destPath, 'css'), compiled.css.code)
  }
  if (compiled.js.code) {
    await writeFilePromise(mappedFileExt(destPath, 'js'), compiled.js.code)
  }

  // :TODO: write JS sourcemap; write CSS sourcemap separately
}

module.exports = writeSvelteComponentFiles

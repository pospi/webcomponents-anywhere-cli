/**
 * Helper to map file exts
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-09-27
 */

const path = require('path')

const mappedFileExt = (path, newExt) => {
  return path.replace(/\.\w+$/, `.${newExt}`)
}

module.exports = mappedFileExt

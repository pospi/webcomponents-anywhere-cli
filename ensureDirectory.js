/**
 * Ensure a directory exists on the filesystem
 *
 * @package: WebComponents Anywhere CLI
 * @since:   2020-09-27
 */

const fs = require('fs')
const mkdir = fs.promises.mkdir

module.exports = async (destPath) => mkdir(destPath, { recursive: true })

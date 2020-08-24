/**
 * Error handling utilities
 *
 * @package: Svelte universal component compiler
 * @since:   2020-08-24
 */

function createErrorContext () {
  let errors = []

  function addError (messagePrefix, err) {
    if (messagePrefix) {
      err.message = `${messagePrefix}: ${err.message}`
    }
    errors.push(err)
  }

  function addCompilerWarnings (path, warnings) {
    if (warnings && warnings.length) {
      warnings.forEach(w => {
        w.message = `Warning: ${w.message}`
      })
      errors = errors.concat(warnings)
    }
  }

  function outputErrors () {
    if (errors.length) {
      console.log('Finished with errors.')
      console.error('')
      errors.forEach(renderError)
    } else {
      console.log('Compiled successfully.')
    }
  }

  return {
    addError,
    addCompilerWarnings,
    outputErrors,
  }
}

const RESET = '\x1b[0m'
const BRIGHT = '\x1b[1m'
const DIM = '\x1b[2m'

const BG_RED = '\x1b[41m'

const FG_WHITE = '\x1b[37m'
const FG_YELLOW = '\x1b[33m'

const STYL_LBL = `${BRIGHT}${BG_RED}${FG_WHITE}`
const STYL_PATH = `${DIM}${FG_WHITE}`
const STYL_MSG = `${FG_WHITE}`
const STYL_FRAME = `${FG_YELLOW}`

function renderError (error) {
  const stack = error.stack
  const filename = error.filename
  const message = error.message
  const frame = error.frame
  const line = error.start ? error.start.line : ''
  let kind

  if (error.kind) {
    kind = error.kind
  } else if (typeof stack === 'string') {
    const m = stack.match(/^([a-zA-Z0-9_$]+): /)
    if (m) {
      kind = m[1]
    }
  }

  console.error(`${STYL_LBL}${kind || 'Error'}${RESET}: ${STYL_PATH}${filename}${line ? `:${line}` : ''}${RESET}`)
  console.error(`\t${STYL_MSG}${message}${RESET}`)
  if (frame) {
    console.error(`${STYL_FRAME}${frame}${RESET}`)
  } else {
    console.error(`${STYL_FRAME}${stack}${RESET}`)
  }
  console.error()
}

module.exports = createErrorContext

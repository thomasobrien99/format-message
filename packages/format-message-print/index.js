// @flow
'use strict'

/*::
import type {
  AST,
  Plural,
  Styled,
  SubMessages
} from '../format-message-parse'
type Placeholder = any // https://github.com/facebook/flow/issues/4050
*/

const SYNTAX_PLURAL = /[{}#]+/g
const SYNTAX_STYLE = /[{}\s]+/
const SYNTAX_COMMON = /[{}]+/g
const ESC = '\''
const DBL_ESC = '\'\''
const ARG_NUM = '#'

/**
 * Print
 *
 * Turns this:
 *  [ "You have ", [ "numBananas", "plural", 0, {
 *       "=0": [ "no bananas" ],
 *      "one": [ "a banana" ],
 *    "other": [ [ '#' ], " bananas" ]
 *  } ], " for sale." ]
 *
 * into this:
 *  `You have { numBananas, plural,
 *       =0 {no bananas}
 *      one {a banana}
 *    other {# bananas}
 *  } for sale`
 **/
module.exports = function print (ast/*: AST */)/*: string */ {
  return printMessage(ast, null)
}

function printMessage (ast/*: AST */, parentType/*: ?string */) {
  return ast.map(function (element) {
    if (typeof element === 'string') return printText(element, parentType)
    return printPlaceholder(element, parentType)
  }).join('')
}

function printText (text/*: string */, parentType/*: ?string */) {
  const special = (parentType === 'plural') ? SYNTAX_PLURAL : SYNTAX_COMMON
  return text
    .replace(/'/g, DBL_ESC) // double apostrophe
    .replace(special, '\'$&\'') // escape syntax
}

function printPlaceholder (placeholder/*: Placeholder */, parentType/*: ?string */) {
  if (placeholder[0] === ARG_NUM) return ARG_NUM
  if (typeof placeholder[2] === 'number') return printPlural(placeholder)
  return printStyled(placeholder)
}

function printStyled (placeholder/*: Styled */) {
  const key = placeholder[0]
  const type = placeholder[1]
  const style = placeholder[2]
  const styleStr = typeof style === 'object'
    ? ',' + printChildren(style, type) + '\n'
    : (style ? ', ' + printStyle(style) + ' ' : ' ')
  return '{ ' + key + (type ? ', ' + type : '') + styleStr + '}'
}

function printStyle (style/*: string */) {
  if (!SYNTAX_STYLE.test(style)) return style.replace(/'/g, DBL_ESC)
  return ESC + style.replace(/'/g, DBL_ESC) + ESC
}

function printPlural (plural/*: Plural */) {
  const key = plural[0]
  const type = plural[1]
  const offset = plural[2]
  const children = plural[3]
  return '{ ' + key + ', ' + type + ',' +
    (offset ? ' offset:' + offset : '') +
    printChildren(children, type) +
  '\n}'
}

function printChildren (children/*: SubMessages */, parentType/*: ?string */) {
  const keys = Object.keys(children)
  const padLength = keys.reduce(function (max, key) { return Math.max(max, key.length) }, 0)
  return keys.map(function (key) {
    return '\n  ' + leftSpacePad(key, padLength) +
      ' {' + printMessage(children[key], parentType) + '}'
  }).join('')
}

function leftSpacePad (string/*: string */, count/*: number */) {
  let padding = ''
  for (let i = string.length; i < count; ++i) {
    padding += ' '
  }
  return padding + string
}

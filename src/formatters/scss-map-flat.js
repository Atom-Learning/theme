/**
 *
 * @param {string} val
 * @returns {string}
 */
const resolveValue = (val) => {
  if (val.includes(',')) {
    val = `(${val})`
  }
  if (val.includes('rem')) {
    val = `${parseFloat(val.replace('rem', '')) * 16}px`
  }
  return val
}

/**
 *
 * @param {{
 *    allProperties: {
 *      type: string
 *      category: string
 *      item: string
 *    }[]
 * }} dictionary
 * @returns {object}
 */
const formatter = (dictionary) => {
  // group properties by category and type
  const properties = dictionary.allProperties.reduce((obj, curr, i) => {
    const { type, category, item } = curr.attributes
    const group = `${category}-${type}`

    // the ratio values include a slash (`/`) which is deprecated in the sass version we
    // use. As it's legacy and we are going to remove it (and not use the tokens in places
    // where sass is used), we decided that is not worth the hassle to try to make it
    // work with sass, so here we omit sass output for the ratios
    if (type === 'ratio') {
      return obj
    }


    return {
      ...obj,
      [group]: { ...obj[group], [item]: curr.value }
    }
  }, {})

  /**
   * $category-type: (
   *   key: val,
   *   key: val
   * )
   */
  return Object.entries(properties)
    .map(([key, val]) => {
      return `
$${key}: (${Object.entries(val).map(
        ([key, val]) => `
  ${key}: ${resolveValue(val)}`
      )}
);`
    })
    .join('')
}

module.exports = formatter

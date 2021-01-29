const formatter = (dictionary) => {
  // group properties by category and type
  const properties = dictionary.allProperties.reduce((obj, curr, i) => {
    const { type, category, item } = curr.attributes
    const group = `${category}-${type}`
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
  ${key}: ${val}`
      )}
);`
    })
    .join('')
}

module.exports = formatter

export function isJWE(token) {
  const parts = token.split('.')
  if (parts.length !== 5) return false

  try {
    const headerJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))
    const header = JSON.parse(headerJson)

    const isAlg = typeof header.alg === 'string'
    const isEnc = typeof header.enc === 'string'

    return isAlg && isEnc
  } catch (e) {
    return false
  }
}

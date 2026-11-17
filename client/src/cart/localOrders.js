// Orders placed from this browser (guest tracking without an account)
const KEY = 'bgz-orders-v1'
export function getLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
export function saveLocalOrder(o) {
  try {
    const list = getLocalOrders().filter((x) => x.token !== o.token)
    list.unshift({ token: o.token, number: o.number, at: o.at || new Date().toISOString() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)))
  } catch {
    /* private mode */
  }
}

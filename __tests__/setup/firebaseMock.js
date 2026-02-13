// Mock Firebase SDK for tests
// These will be jest.fn() when loaded in tests

// firebase/database mocks
export const ref = () => ({ path: '/mock/path' })
export const query = () => ({})
export const orderByChild = () => ({})
export const equalTo = () => ({})
export const onValue = () => () => {}
export const onChildAdded = () => () => {}
export const onChildChanged = () => () => {}
export const onChildRemoved = () => () => {}
export const get = () => Promise.resolve({ val: () => ({}), key: 'test-key' })
export const set = () => Promise.resolve()
export const update = () => Promise.resolve()
export const remove = () => Promise.resolve()
export const push = () => ({ key: 'mock-key' })
export const off = () => {}

// firebase/auth mocks
export const signInAnonymously = () =>
  Promise.resolve({
    user: { uid: 'test-uid', isAnonymous: true },
  })
export const onAuthStateChanged = (auth, callback) => {
  callback({ uid: 'test-uid', isAnonymous: true })
  return () => {}
}
export const signOut = () => Promise.resolve()

// firebase/app mocks
export const initializeApp = () => ({})
export const getApp = () => ({})
export const getApps = () => []

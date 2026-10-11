export const getAuth = () => { const a = { currentUser: null }; return a; };
export const signInWithEmailAndPassword = async () => ({});
export const sendPasswordResetEmail = async () => {};
export const signOut = async () => {};
export const onAuthStateChanged = (auth, cb) => {
  const u = window.__FAKE_USER__ || null;
  auth.currentUser = u;
  setTimeout(() => cb(u), 0);
  return () => {};
};

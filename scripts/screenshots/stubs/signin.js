const GoogleSignin = {
  configure() {}, hasPlayServices: async () => false, getCurrentUser: () => null, hasPreviousSignIn: () => false,
  signInSilently: async () => ({ type: 'noSavedCredentialFound' }), signIn: async () => ({ type: 'cancelled' }),
  getTokens: async () => { throw new Error('web'); }, signOut: async () => {}, clearCachedAccessToken: async () => {},
};
module.exports = { GoogleSignin };

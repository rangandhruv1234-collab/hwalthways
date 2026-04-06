// firebase-init.js — HEALTHWAYS Firebase initialisation
// Load AFTER the Firebase compat CDN scripts, BEFORE any page script that uses db.
(function () {
  var config = {
    apiKey:            'AIzaSyAeC_ufgZMrkF4ik29NpcTo8rhI5WNdlvA',
    authDomain:        'healthways-f56f6.firebaseapp.com',
    projectId:         'healthways-f56f6',
    storageBucket:     'healthways-f56f6.firebasestorage.app',
    messagingSenderId: '773802633271',
    appId:             '1:773802633271:web:bfa200c954d1f0ede077b2',
  };
  try {
    var appName = 'healthways-admin-app';
    var app;
    try {
      app = firebase.app(appName);
      console.log('Firebase named app already exists:', appName);
    } catch (innerErr) {
      app = null;
    }

    if (!app) {
      app = firebase.initializeApp(config, appName);
      console.log('Firebase named app initialized:', appName);
    }

    if (!app || !app.options || !app.options.apiKey) {
      throw new Error('Firebase app initialized without valid config.');
    }

    window.db = firebase.firestore(app);

    // Auth compat SDK may not be loaded on every page — guard it
    try {
      window.auth = firebase.auth(app);

      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(err) {
        console.error('Failed to set Firebase auth persistence:', err);
      });

      auth.onAuthStateChanged(function(user) {
        if (!user) {
          auth.signInAnonymously().catch(function(err) {
            console.error('Anonymous Firebase sign-in failed:', err);
          });
        }
      });
    } catch(authErr) {
      console.warn('Firebase Auth not available on this page (auth compat SDK not loaded):', authErr.message);
      window.auth = null;
    }
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    window.firebaseInitError = err && err.message ? err.message : String(err);
  }
})();

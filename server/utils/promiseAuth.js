const { auth } = require('../connection/firebase');

// issues: https://github.com/firebase/firebase-js-sdk/issues/1881

module.exports = {
  createUserWithEmailAndPassword(email, password) {
    return new Promise((resolve, reject) => {
      auth
        .createUserWithEmailAndPassword(email, password)
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  },
  signInWithEmailAndPassword(email, password) {
    return new Promise((resolve, reject) => {
      auth
        .signInWithEmailAndPassword(email, password)
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  },
  sendPasswordResetEmail(email) {
    return new Promise((resolve, reject) => {
      auth
        .sendPasswordResetEmail(email)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  },
};

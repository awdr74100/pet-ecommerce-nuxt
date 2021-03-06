import admin from 'firebase-admin';

const firebaseAdminConfig = {
  credential: admin.credential.cert({
    type: process.env.FIREBASE_ADMIN_TYPE,
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: process.env.FIREBASE_ADMIN_AUTH_URL,
    token_uri: process.env.FIREBASE_ADMIN_TOKEN_URL,
    auth_provider_x509_cert_url:
      process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
  }),
  databaseURL: process.env.FIREBASE_ADMIN_DATABASEURL,
  storageBucket: process.env.FIREBASE_ADMIN_STORAGEBUCKET,
};

if (!admin.apps.length) admin.initializeApp(firebaseAdminConfig);
else admin.app();

export const auth = admin.auth();
export const db = admin.database();
export const bucket = admin.storage().bucket();

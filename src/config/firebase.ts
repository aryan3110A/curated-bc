import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

import { env } from "./env";

const hasFirebaseCredentials =
  Boolean(env.FIREBASE_PROJECT_ID) &&
  Boolean(env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(env.FIREBASE_PRIVATE_KEY) &&
  Boolean(env.FIREBASE_STORAGE_BUCKET);

export const getFirebaseBucket = () => {
  if (!hasFirebaseCredentials) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      }),
      storageBucket: env.FIREBASE_STORAGE_BUCKET
    });
  }

  return getStorage().bucket(env.FIREBASE_STORAGE_BUCKET);
};

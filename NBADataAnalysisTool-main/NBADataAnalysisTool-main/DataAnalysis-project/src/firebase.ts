import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3P3TQHHk9HQTHS7RRT-VKXJ_feKNZhsY",
  authDomain: "linelogic-761ac.firebaseapp.com",
  projectId: "linelogic-761ac",
  storageBucket: "linelogic-761ac.firebasestorage.app",
  messagingSenderId: "1048426532909",
  appId: "1:1048426532909:web:9f4d0938790614489228a4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

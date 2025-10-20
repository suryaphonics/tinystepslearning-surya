// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC36FEvGLkhS0Gd7pgh7iLNuRt5no4iL78",
  authDomain: "tinystepslearning-surya9.firebaseapp.com",
  projectId: "tinystepslearning-surya9",
  storageBucket: "tinystepslearning-surya9.firebasestorage.app",
  messagingSenderId: "195320639033",
  appId: "1:195320639033:web:39846f54424ee8807e27e8",
  measurementId: "G-0BRLZ3CS03"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


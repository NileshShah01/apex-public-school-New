// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCe44RwdP6C3MuxgzoZ320IUjRzZy37ShY",
  authDomain: "apex-public-school-portal.firebaseapp.com",
  projectId: "apex-public-school-portal",
  storageBucket: "apex-public-school-portal.firebasestorage.app",
  messagingSenderId: "808587286874",
  appId: "1:808587286874:web:0a59a9d2c23d24be55fb63"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

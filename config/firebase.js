const { initializeApp } = require('firebase/app');
const { getStorage } = require('firebase/storage');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2ixLObtsDE7b9Ct2WNSuflnB1tRiNvOo",
  authDomain: "titan-talk.firebaseapp.com",
  projectId: "titan-talk",
  storageBucket: "titan-talk.firebasestorage.app",
  messagingSenderId: "392492725133",
  appId: "1:392492725133:web:ed17ed4a189c7a74f443c4",
  measurementId: "G-L5W9563DGE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

module.exports = { storage };

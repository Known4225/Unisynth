// Import the functions you need from the SDKs you need
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {getDatabase, set, push, get, update, remove, ref, child, onValue, onChildAdded} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import {getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCTUW-320nUnx97BoTByPcIrotvQf-s1zc",
    authDomain: "piano-f632e.firebaseapp.com",
    projectId: "piano-f632e",
    storageBucket: "piano-f632e.appspot.com",
    messagingSenderId: "101806393542",
    appId: "1:101806393542:web:428d2e2cd3607b8be22fc7",
    measurementId: "G-JEC599KMS2"
};

// global object
let firebase = {};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
firebase.database = getDatabase();
// const analytics = getAnalytics(app);

firebase.auth = getAuth(app);
firebase.signInWithPopup = signInWithPopup;
firebase.GoogleAuthProvider = GoogleAuthProvider;
firebase.set = set;
firebase.push = push;
firebase.ref = ref;
firebase.get = get;

window.firebase = firebase;

/* functions */

// var uid = 0;

function test() {
    console.log("test");
    return 0;
}

// onAuthStateChanged(firebase.auth, (user) => {
//     if (user) {
//         // User is signed in, see docs for a list of available properties
//         // https://firebase.google.com/docs/reference/js/auth.user
//         uid = user.uid;
//         console.log("user id: " + uid);
//         // console.log(firebase.auth);
//         document.getElementById("authenticate").style.display = "none";
//         document.getElementById("inputForm").style.display = "block";
//         streamData();
//     } else {
//         // User is signed out
//         console.log("user signed out");
//         document.getElementById("authenticate").style.display = "block";
//         document.getElementById("inputForm").style.display = "none";
//     }
// });


// update every time something is added or removed
const updateTable = ref(firebase.database, "Piano/");

onValue(updateTable, (snapshot) => {
    streamData();
}, (errorObject) => {
    console.log('The read failed: ' + errorObject.name);
}); 

// onChildAdded(updateTable, (snapshot) => {
//     console.log("arduino!");
// })
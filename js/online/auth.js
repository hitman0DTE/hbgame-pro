// js/online/auth.js (Auth & Config)
const firebaseConfig = {
    apiKey: "AIzaSyBUqHpWGjezBuMPV76T9FZQz2ChcSEr5Ao",
    authDomain: "hit-and-blow-online.firebaseapp.com",
    projectId: "hit-and-blow-online",
    storageBucket: "hit-and-blow-online.firebasestorage.app",
    messagingSenderId: "817002043792",
    appId: "1:817002043792:web:fcdd4ea0973faba1763b15"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

window.addEventListener('beforeunload', () => {
    if (typeof roomId !== 'undefined' && roomId && typeof myRole !== 'undefined' && myRole) {
        db.ref(`rooms/${roomId}/${myRole}`).remove();
        if (myRole === 'p1') db.ref(`waiting_room`).transaction(val => val === roomId ? null : val);
    }
});

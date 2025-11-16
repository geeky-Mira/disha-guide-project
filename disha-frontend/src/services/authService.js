import { auth } from "../firebaseConfig";
import API from "./api"; // Import the API helper
import { saveUserProfile } from "./userService";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut 
} from "firebase/auth";

// Google Sign-In
export async function googleSignIn() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await saveUserProfile(result.user.uid, { email: result.user.email });
    return result.user; // Firebase user object
  } catch (err) {
    console.error("Google Sign-In failed:", err);
    throw err;
  }
}

// Email/Password Sign-Up
export async function emailSignUp(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserProfile(result.user.uid, { email });
    return result.user;
  } catch (err) {
    console.error("Email Sign-Up failed:", err);
    throw err;
  }
}

// Email/Password Sign-In
export async function emailSignIn(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (err) {
    console.error("Email Sign-In failed:", err);
    throw err;
  }
}

// Check if email exists for password reset
export async function checkEmailExists(email) {
  try {
    const response = await API.post("/auth/check-email", { email });
    return response.data.exists;
  } catch (err) {
    console.error("Email check failed:", err);
    // Default to true to fall back to Firebase's default behavior on error
    return true; 
  }
}

// Password Reset
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.error("Password reset failed:", err);
    throw err;
  }
}

// Sign out
export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout failed:", err);
    throw err;
  }
}

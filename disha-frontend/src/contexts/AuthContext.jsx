// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { fetchUserProfile, saveUserProfile } from "../services/userService";
import { addCareerToCompass as apiAddCareer, removeCareerFromCompass as apiRemoveCareer } from "../services/careerService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUserData = useCallback(async (uid) => {
    if (!uid) {
      setUserData(null);
      return;
    }
    try {
      const data = await fetchUserProfile(uid);
      setUserData(data || {});
    } catch (err) {
      console.error("❌ Error refreshing user data:", err);
      setError(err.message || "Failed to load user data");
      setUserData({});
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if (u) {
        await refreshUserData(u.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshUserData]);

  const updateProfile = useCallback(async (profileUpdates) => {
    if (!user) throw new Error("User not authenticated");
    
    const currentProfile = userData?.profile || {};
    const updatedProfileForAPI = { ...currentProfile, ...profileUpdates };

    setUserData(prevData => ({
      ...prevData,
      profile: { ...prevData.profile, ...profileUpdates },
    }));

    try {
      await saveUserProfile(user.uid, updatedProfileForAPI);
    } catch (err) {
      console.error("❌ Failed to save profile:", err);
      await refreshUserData(user.uid); // Revert on failure
      throw err;
    }
  }, [user, userData, refreshUserData]);

  const addCareer = useCallback(async (career) => {
    if (!user) throw new Error("User not authenticated");

    const newPath = {
      ...career,
      progress: 0,
      skills_status: (career.pathway || []).reduce((acc, skill) => {
        acc[skill] = { status: "pending", score: null };
        return acc;
      }, {}),
    };

    setUserData(prevData => ({
      ...prevData,
      compass: { ...prevData.compass, saved_paths: [...(prevData.compass?.saved_paths || []), newPath] },
    }));

    try {
      await apiAddCareer(career);
    } catch (err) {
      console.error("❌ Failed to add career:", err);
      await refreshUserData(user.uid); // Revert
      throw err;
    }
  }, [user, refreshUserData]);

  const removeCareer = useCallback(async (careerName) => {
    if (!user) throw new Error("User not authenticated");

    setUserData(prevData => ({
      ...prevData,
      compass: {
        ...prevData.compass,
        saved_paths: (prevData.compass?.saved_paths || []).filter(p => p.career_name !== careerName),
      },
    }));

    try {
      await apiRemoveCareer(careerName);
    } catch (err) {
      console.error("❌ Failed to remove career:", err);
      await refreshUserData(user.uid); // Revert
      throw err;
    }
  }, [user, refreshUserData]);

  const value = useMemo(() => ({
    user,
    userData,
    profile: userData?.profile || {},
    recommendations: userData?.compass?.recommendations || [],
    savedPaths: userData?.compass?.saved_paths || [],
    loading,
    error,
    refreshUserData: () => user ? refreshUserData(user.uid) : Promise.resolve(),
    updateProfile,
    addCareer,
    removeCareer,
  }), [user, userData, loading, error, refreshUserData, updateProfile, addCareer, removeCareer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Create a new hook for convenience that mirrors the old useUserProfile
export function useUserProfile() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUserProfile must be used within an AuthProvider");
  }
  return context;
}

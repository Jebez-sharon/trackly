// Holds who's logged in, globally, so any component can read it
// without passing props down through every level.

import { createContext, useContext, useState} from "react";
import client from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }){
    // Reads from localStorage on first load so a page refresh
  // doesn't log the user out.
    const[user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const [organization, setOrganization] = useState(() => {
        const stored = localStorage.getItem('organization');
        return stored ? JSON.parse(stored) : null;
    });

  // Calls the backend, stores the token and user info, and updates
  // state so the whole app knows someone is logged in.
    async function login(email, password){
        const response = await client.post('/auth/login', {email, password});
        const { access_token, user, organizations } = response.data;

        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);

        // Uses the first organization for now — an org switcher for
    // users belonging to several orgs comes later.
        if (organizations.length > 0){
            const org = organizations[0].organization;
            const role = organizations[0].role;
            const orgWithRole  = { ...org, role};
            localStorage.setItem('organization', JSON.stringify(orgWithRole));
            setOrganization(orgWithRole)
        } else {
            localStorage.removeItem('organization');
            setOrganization(null);
        }
    }    

    function logout(){
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        setUser(null);
        setOrganization(null);
    }

    return (
        <AuthContext.Provider value={{ user, organization, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook so components call useAuth() instead of importing
// useContext and AuthContext separately every time.
export function useAuth() {
    return useContext(AuthContext)
}
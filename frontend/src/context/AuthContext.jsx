import { useMemo, useState } from 'react'
import { AuthContext } from './auth-context';
import api, {TOKEN_KEY, USER_KEY, ORGS_KEY, ACTIVE_ORG_KEY, clearSession} from '../lib/api';

function readJson(key){
    try{
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }catch{
        // Private windows, cleared storage and corrupt JSON must never
    // crash the app on first paint.
        return null;
    }
}

export function AuthProvider({children}){
    const[user, setUser] = useState(() => 
        localStorage.getItem(TOKEN_KEY) ? readJson(USER_KEY) : null
    );

    const[organizations, setOrganizations] = useState(() => readJson(ORGS_KEY) || []);

    const [activeOrgId, setActiveOrgId] = useState(() => readJson(ACTIVE_ORG_KEY));

    async function login(email, password) {
        const{data} = await api.post('/api/auth/login',{email, password});

        const firstOrgId = data.organizations[0]?.id ?? null;
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(USER_KEY,JSON.stringify(data.user));
        localStorage.setItem(ORGS_KEY, JSON.stringify(data.organizations));
        localStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(firstOrgId));

        setUser(data.user);
        setOrganizations(data.organizations);
        setActiveOrgId(firstOrgId)
        return data;   
    }

    function logout(){
        // this clears the browser only. The backend has no
    // token revocation yet, so the JWT stays valid until it expires.
        clearSession();
        setUser(null);
        setOrganizations([]);
        setActiveOrgId(null);
    }

    function switchOrg(orgId){
        localStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(orgId));
        setActiveOrgId(orgId);
    }

    const value = useMemo(() =>{
        const activeOrg = organizations.find((o) => o.id === activeOrgId) || null;
        return {
            user,
            organizations,
            activeOrg,
            activeOrgId,
            isAdmin: activeOrg?.role === 'admin',
            isAuthenticated:Boolean(user),
            login,
            logout,
            switchOrg,
        };
    },[user, organizations, activeOrgId]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

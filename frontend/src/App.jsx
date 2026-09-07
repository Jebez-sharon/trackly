import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";

function RequireAuth({children}){
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children :<Navigate to="/login" replace/>;
}

function RedirectIfAuthed({children}){
  const{isAuthenticated} = useAuth();
  return isAuthenticated ? <Navigate to="/board" replace /> : children;
}

// Temporary. Replaced by the real app shell in Chunk 15.
function BoardPlaceholder(){
  const {user, activeOrg, organizations, isAdmin, logout} = useAuth();
  return(
    <div className="min-h-screen p-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Signed in
        </h1>
        <dl className="mt-6 rounded-lg border border-line bg-surface divide-y divide-line">           {[
            ['User',user?.username],
            ['Email',user?.email],
            ['Active organization',activeOrg?.name],
            ['Role here',activeOrg?.role],
            ['Admin',String(isAdmin)],
            ['Organizations', organizations.length],
          ].map(([label, value])=>(
            <div className="flex justify-between px4 py-2.5" key={label}>
              <dt className="text-[13px] text-ink-soft">{label}</dt>
              <dd className="text-[13px] font-medium text-ink">{String(value)}</dd>
            </div>
          ))}
        </dl>
        <button className="mt-6 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong" onClick={logout}>
          Sign out</button>
      </div>
    </div>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to='/board' replace/>}/>
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>}/>
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>}/>
          <Route path="/board" element={<RequireAuth><BoardPlaceholder /></RequireAuth>}/>            <Route path="*" element={<NotFound/>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
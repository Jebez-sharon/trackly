import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import AppLayout from "./components/layout/AppLayout";
import Board from "./pages/Board";
import Team from "./pages/Team";

function RequireAuth({children}){
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children :<Navigate to="/login" replace/>;
}

function RedirectIfAuthed({children}){
  const{isAuthenticated} = useAuth();
  return isAuthenticated ? <Navigate to="/board" replace /> : children;
}

// Temporary. Replaced by the real app shell in Chunk 15.


export default function App(){
  return(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to='/board' replace/>}/>
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>}/>
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>}/>
          <Route element={<RequireAuth><AppLayout/></RequireAuth>}>
            <Route path="/board" element={<Board/>}/>
          <Route path="/team" element={<Team/>}/>
          </Route>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
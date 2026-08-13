import {Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from "./pages/Register";
import Board from "./pages/Board";

function ProtectedRoute({children}){
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;

}

export default function App(){
  const { user } = useAuth();
  return(
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/board' : '/login'} replace/>}/>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />}/>

      <Route
      path="/board"
      element={
       <ProtectedRoute>
        <Board />
       </ProtectedRoute>
      }
      />
    </Routes>
  )
}
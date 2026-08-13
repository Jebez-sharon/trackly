import {Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from "./pages/Register";

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
        <div className="min-h-screen bg-gray-50 p-8">
          <h1 className="text-2xl font-semibold">
            Board (coming next)
          </h1>
        </div>
       </ProtectedRoute>
      }
      />
    </Routes>
  )
}
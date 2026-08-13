import { useState } from "react";
import { useNavigate , Link} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login(){
    const [email, setEmail] = useState('');
    const[password, setPassword] = useState('');
    const[error, setError] = useState('');
    const [loading,setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e){
        e.preventDefault();
        setError('');
        setLoading(true);

        try{
            await login(email, password);
            navigate('/board');
        } catch (err){
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally{
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">

                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                    Sign in to Trackly
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    Track issues across your team.
                </p>

                {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form action="" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>

                    <button
                     type="submit"
                     disabled={loading}
                     className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition">
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-gray-900 hover:underline">
                     Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
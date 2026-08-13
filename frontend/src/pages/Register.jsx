// Signup form. Creates a User + Organization together, then sends
// the user to login.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

export default function Register(){
    const[form , setForm] = useState({
        username:'',
        email:'',
        password:'',
        organization_name:'',
        organization_slug:'',
    });

    const[error, setError] = useState('')
    const[loading, setLoading] = useState(false)

    const navigate = useNavigate();

    function handleChange(e){
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e){
        e.preventDefault();
        setError('');
        setLoading(true);

        try{
            await client.post('/auth/register', form);
            navigate('/login')
        }catch(err){
            setError(err.response?.data?.error || 'Registration failed.Please try again.');
        }finally{
            setLoading(false);
        }
    }
    return(
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                    Create your workspace
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    You'll be the admin of this organization.
                </p>

                {error &&(
                    <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form action="" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                        </label>
                        <input type="text" name="username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input type="email" name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input type="password" name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                        <p className="mt-1 text-xs text-gray-500">
                            At least 8 characters.
                        </p>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Organization name
                        </label>
                        <input type="text" name="organization_name"
                        value={form.organization_name}
                        onChange={handleChange}
                        required
                        placeholder="Acme Corp"
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">
                            Organization slug
                        </label>
                        <input type="text" name="organization_slug"
                        value={form.organization_slug}
                        onChange={handleChange}
                        required
                        placeholder="acme-corp"
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                        <p className="mt-1 text-xs text-gray-500">
                            Lowercase, no spaces - used in URLs.
                        </p>
                    </div>

                    <button type="submit"
                    disabled={loading}
                    className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white
                    hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                        {loading ? 'Creating...': 'Create workspace'}

                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-gray-900 hover:underline" >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
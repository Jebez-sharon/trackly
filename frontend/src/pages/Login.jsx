import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom'
import {useAuth} from '../context/AuthContext'
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";

export default function Login(){
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const[submitting, setSubmitting] = useState(false);

    async function handleSubmit(event){
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try{
            await login(email, password);
            navigate('/board',{ replace:true});
        }catch(err){
            setError(err.message);
        }finally{
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Every bug, task and status in one workspace."
            footer={
                <>
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-brand hover:text-brand-hover">
                        Create one
                    </Link>
                </>
            }
            >
            
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {error && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                        <p className="text-[13px] text-danger-text">{error}</p>
                    </div>
                )}

                <Field 
                    id="email" label="Email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                />

                <Field 
                    id="password" label="Password" type="password" autoComplete="current-password" required 
                    value={password} onChange={(e)=> setPassword(e.target.value)}
                />

                <Button type="submit" loading={submitting}
                >
                    {submitting ? 'Signing in...':'Sign in'}
                </Button>
            </form>
            
        </AuthLayout>
    );
}
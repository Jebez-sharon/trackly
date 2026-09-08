import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { useAuth } from "../context/auth-context";


function slugify(value){
    return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0,50)
}

export default function Register(){
    const {login} = useAuth();
    const navigate = useNavigate();

    const[username, setUsername] = useState('');
    const[email, setEmail] = useState('');
    const[password, setPassword] = useState('');
    const[orgName, setOrgName] = useState('');
    const[error, setError] = useState('');
    const[submitting, setSubmitting] = useState(false);

    const slug = slugify(orgName);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');

        if(password.length < 8){
            return setError('Password must be at least 8 characters.')
        }
        if (!slug){
            return setError('Organization name must contain at least one letter or number.');
        }

        setSubmitting(true);
        try{
            await api.post('/api/auth/register',{
                username, email, password , org_name:orgName, org_slug:slug,
            });
        }catch(err){
            setError(err.message);
            setSubmitting(false);
            return;
        }
        try{
            await login(email, password);
            navigate('/board',{replace:true});
        }catch{
            navigate('/login',{replace: true});
        }
    }

    return (
        <AuthLayout
                    title="Create your workspace"
                    subtitle="You'll be the admin of a new organization."
                    footer={
                        <>
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-brand hover:text-brand-hover">
                                Sign in
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
                            id="username" label="Your name" autoComplete="username" required
                            value={username} onChange={(e) => setUsername(e.target.value)}
                            placeholder="john"
                        />
                        <Field 
                            id="email" label="Work email" type="email" autoComplete="email" required
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                        />
        
                        <Field 
                            id="password" label="Password" type="password" autoComplete="new-password" required 
                            value={password} onChange={(e)=> setPassword(e.target.value)} hint="At least 8 characters."
                        />

                        <Field 
                            id="orgName" label="Organization" required
                            value={orgName} onChange={(e) => setOrgName(e.target.value)}
                            placeholder="Acme Inc"
                            hint={slug ? `Workspace URL: trackly.app/${slug}`: 'Used for your workspace URL.'}
                        />
        
                        <Button type="submit" loading={submitting}
                        >
                            {submitting ? 'Creating workspace...':'Create workspace'}
                        </Button>
                    </form>
                    
                </AuthLayout>
    )
}
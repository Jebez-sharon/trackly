// Shows the org's projects, and the issues inside the selected one.
import { useState,useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../api/projects";
import { getIssues } from "../api/issues";

export default function Board(){
    const { user, organization, logout } = useAuth();

    const[projects, setProjects] = useState([]);
    const[selectedProject, setSelectedProject] =useState(null)
    const [issues, setIssues] = useState([]);
    const[loading,setLoading] = useState(true)
    const[error, setError] = useState('');

    useEffect(() => {
        async function loadProjects() {
            try{
                const data = await getProjects(organization.id);
                setProjects(data);
                if (data.length > 0){
                    setSelectedProject(data[0]);
                }
            }catch(err){
                setError('Could not load projects.');
            }finally{
                setLoading(false)
            }
        }
        loadProjects();
    }, [organization.id]);

    useEffect(() =>{
        if (!selectedProject) return;

        async function loadIssues() {
            try{
                const data= await getIssues(selectedProject.id);
                setIssues(data);
            }catch(err){
                setError('Could not load issue.');
            }
        }
        loadIssues();
    },[selectedProject]);

    if(loading){
        return(
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-gray-500">
                    Loading...
                </p>
            </div>
        );
    }

    return(
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Trackly</h1>
                    <p className="text-xs text-gray-500">{organization.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                        {user.username}

                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {organization.role}
                        </span>
                    </span>
                    <button onClick={logout} className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 transition">
                        Sign out
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-6 py-6">
                {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {projects.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                        <p className="text-sm text-gray-500">
                            No projects yet. Create one to start tracking issues.
                        </p>
                    </div>
                ):(
                    <>
                    <div className="mb-4 flex gap-2">
                        {projects.map((project) => (
                            <button key={project.id} onClick={()=> setSelectedProject(project)}
                            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                                selectedProject?.id === project.id
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            >
                                {project.key}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Key</th>
                                    <th className="px-4 py-3 text-left">Title</th>
                                    <th className="px-4 py-3 text-left">Priority</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Assignee</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {issues.map((issue)=>(
                                    <tr className="hover:bg-gray-50" key={issue.id}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                            {issue.issue_key}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {issue.title}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 capitalize">
                                            {issue.priority.replace('_',' ')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {issue.status}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {issue.assignee ? issue.assignee.username : 'Unassigned'}
                                        </td>
                                    </tr>
                                ))}
                                {issues.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-gray-400" colSpan={5}>
                                            No issues in this project yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </div>
        </div>
    )
}
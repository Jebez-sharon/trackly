// pages/Board.jsx — inside frontend/src/pages/
// Shows the org's projects, and the issues inside the selected one.

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getProjects, createProject } from "../api/projects";
// CHANGED: added createIssue
import { getIssues, createIssue } from "../api/issues";
import Modal from "../components/Modal";
// CHANGED: added
import Badge from "../components/Badge";

export default function Board() {
    const { user, organization, logout } = useAuth();

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(Boolean(organization));
    const [error, setError] = useState('');

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectForm, setProjectForm] = useState({ name: '', key: '', description: '' });

    // CHANGED: added — state for the new issue modal
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueForm, setIssueForm] = useState({
        title: '', description: '', priority: 'medium', severity: 'low', category: 'general',
    });

    // Creates a project, then adds it to local state without refetching.
    async function handleCreateProject(e) {
        e.preventDefault();
        setError('');
        try {
            const newProject = await createProject(organization.id, projectForm);
            setProjects([...projects, newProject]);
            setSelectedProject(newProject);
            setShowProjectModal(false);
            setProjectForm({ name: '', key: '', description: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not create project.');
        }
    }

    // Creates an issue in the selected project and prepends it to the list.
    async function handleCreateIssue(e) {
        e.preventDefault();
        setError('');
        try {
            const newIssue = await createIssue(selectedProject.id, issueForm);
            setIssues([newIssue, ...issues]);
            setShowIssueModal(false);
            setIssueForm({
                title: '', description: '', priority: 'medium', severity: 'low', category: 'general',
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Could not create issue.');
        }
    }

    useEffect(() => {
        if (!organization) return;

        async function loadProjects() {
            try {
                const data = await getProjects(organization.id);
                setProjects(data);
                if (data.length > 0) {
                    setSelectedProject(data[0]);
                }
            } catch {
                setError('Could not load projects.');
            } finally {
                setLoading(false);
            }
        }
        loadProjects();
    }, [organization]);

    useEffect(() => {
        if (!selectedProject) return;

        async function loadIssues() {
            try {
                const data = await getIssues(selectedProject.id);
                setIssues(data);
            } catch {
                setError('Could not load issues.');
            }
        }
        loadIssues();
    }, [selectedProject]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-gray-500">Loading...</p>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                    <p className="text-sm text-gray-500 mb-4">
                        You don't belong to any organization yet.
                    </p>
                    <button
                        onClick={logout}
                        className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 transition"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        );
    }

    return (
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
                    <button
                        onClick={logout}
                        className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 transition"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-6 py-6">

                {/* CHANGED: was one button — now New issue (primary) + New project */}
                <div className="mb-4 flex justify-end gap-2">
                    {selectedProject && (
                        <button
                            onClick={() => setShowIssueModal(true)}
                            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition"
                        >
                            + New issue
                        </button>
                    )}
                    <button
                        onClick={() => setShowProjectModal(true)}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        + New project
                    </button>
                </div>

                <Modal
                    isOpen={showProjectModal}
                    onClose={() => setShowProjectModal(false)}
                    title="Create project"
                >
                    <form onSubmit={handleCreateProject}>
                        {error && (
                            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={projectForm.name}
                                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                required
                                placeholder="Website Redesign"
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                            <input
                                type="text"
                                value={projectForm.key}
                                onChange={(e) => setProjectForm({ ...projectForm, key: e.target.value })}
                                required
                                maxLength={10}
                                placeholder="WEB"
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Short code used in issue IDs, e.g. WEB-1.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={projectForm.description}
                                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                rows={3}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
                        >
                            Create project
                        </button>
                    </form>
                </Modal>

                {/* CHANGED: added — the new issue modal */}
                <Modal
                    isOpen={showIssueModal}
                    onClose={() => setShowIssueModal(false)}
                    title={`New issue in ${selectedProject?.key}`}
                >
                    <form onSubmit={handleCreateIssue}>
                        {error && (
                            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={issueForm.title}
                                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                                required
                                placeholder="Login button does nothing"
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={issueForm.description}
                                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                                required
                                rows={3}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={issueForm.priority}
                                    onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                >
                                    <option value="no_priority">No priority</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                <select
                                    value={issueForm.severity}
                                    onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
                        >
                            Create issue
                        </button>
                    </form>
                </Modal>

                {projects.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                        <p className="text-sm text-gray-500">
                            No projects yet. Create one to start tracking issues.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex gap-2">
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => {
                                        setIssues([]);
                                        setSelectedProject(project);
                                    }}
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
                                    {issues.map((issue) => (
                                        <tr className="hover:bg-gray-50" key={issue.id}>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                {issue.issue_key}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {issue.title}
                                            </td>
                                            {/* CHANGED: was plain text — now coloured pills */}
                                            <td className="px-4 py-3">
                                                <Badge value={issue.priority} type="priority" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge value={issue.status} type="status" />
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
    );
}
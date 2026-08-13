// Issue-related backend calls.

import client from './client'

export async function getIssues(projectId) {
    const response = await client.get(`/projects/${projectId}/issues`);
    return response.data;
}

export async function createIssue(projectId, data) {
    const response = await client.post(`/projects/${projectId}/issues`,data);
    return response.data;
}

export async function getIssue(issueId) {
    const response = await client.get(`/issues/${issueId}`);
    return response.data;
}

export async function updateStatus(issueId, status) {
    const response = await client.patch(`/issues/${issueId}/status`, {status});
    return response.data;    
}
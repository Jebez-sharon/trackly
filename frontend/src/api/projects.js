// Project-related backend calls.

import client from "./client";

export async function getProjects(organizationId){
    const response = await client.get(`/organizations/${organizationId}/projects`);
    return response.data;
}

export async function createProject(organizationId,data){
    const response = await client.post(`/organizations/${organizationId}/projects`,data);
    return response.data;
}
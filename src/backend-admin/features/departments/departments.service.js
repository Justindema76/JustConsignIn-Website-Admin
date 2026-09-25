import { adminFetch, parseJsonResponse } from '../../services/apiClient';

const parseResponse = response => parseJsonResponse(response, 'Department request failed');

export async function loadDepartments(accessToken) {
  const payload = await parseResponse(await adminFetch('/api/admin/departments', {}, accessToken));
  return Array.isArray(payload.departments) ? payload.departments : [];
}

export async function createDepartment(accessToken, values) {
  const payload = await parseResponse(await adminFetch('/api/admin/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }, accessToken));
  return payload.department;
}

export async function updateDepartment(accessToken, values) {
  const payload = await parseResponse(await adminFetch('/api/admin/departments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }, accessToken));
  return payload.department;
}

export async function deleteDepartment(accessToken, id) {
  return parseResponse(await adminFetch('/api/admin/departments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }, accessToken));
}

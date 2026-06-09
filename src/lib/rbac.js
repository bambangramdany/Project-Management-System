// Roles that can see ALL projects regardless of assignment
export const MANAGER_ROLES = ['OWNER', 'PROJECT_MANAGER']

export function canViewAllProjects(role) {
  return MANAGER_ROLES.includes(role)
}

export function canEditProject(role) {
  return ['OWNER', 'PROJECT_MANAGER'].includes(role)
}

export function canManageUsers(role) {
  return role === 'OWNER'
}

export function canDeleteProject(role) {
  return role === 'OWNER'
}

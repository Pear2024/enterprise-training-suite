// app/_components/nav-config.ts
export type Role = 'EMPLOYEE' | 'TRAINER' | 'ADMIN'
export const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   roles: ['EMPLOYEE','TRAINER','ADMIN'] as Role[] },
  { href: '/profile/change-password', label: 'Change Password', roles: ['EMPLOYEE','TRAINER','ADMIN'] as Role[] },
  { href: '/topics',      label: 'Topics',      roles: ['TRAINER','ADMIN'] as Role[] },
  { href: '/assignments', label: 'Assignments', roles: ['TRAINER','ADMIN'] as Role[] },
  { href: '/reports',     label: 'Reports',     roles: ['TRAINER','ADMIN'] as Role[] },
  { href: '/admin',       label: 'Admin',       roles: ['ADMIN'] as Role[] },
]

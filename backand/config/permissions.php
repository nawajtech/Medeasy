<?php

/**
 * Single source of truth for permission definitions.
 * Permissions are synced to the database by PermissionSeeder — never hardcode names elsewhere.
 */
return [

    /**
     * Super admin assigns tenant modules; these map to permission groups.
     * tenant_core_modules are always available inside every tenant.
     */
    'company_module_map' => [
        'laboratory' => ['lab', 'doctors'],
        'diagnostics' => ['diagnostics', 'doctors', 'departments'],
    ],

    'tenant_core_modules' => ['dashboard', 'settings', 'users', 'roles', 'patients', 'finance', 'audit'],

    'modules' => [
        'dashboard' => [
            'label' => 'Dashboard',
            'permissions' => [
                'dashboard.view' => 'View dashboard',
            ],
        ],
        'companies' => [
            'label' => 'Companies',
            'permissions' => [
                'company.view' => 'View companies',
                'company.create' => 'Create companies',
                'company.edit' => 'Edit companies',
                'company.delete' => 'Delete companies',
            ],
        ],
        'branches' => [
            'label' => 'Branches',
            'permissions' => [
                'branch.view' => 'View branches',
                'branch.create' => 'Create branches',
                'branch.edit' => 'Edit branches',
                'branch.delete' => 'Delete branches',
            ],
        ],
        'departments' => [
            'label' => 'Departments',
            'permissions' => [
                'department.view' => 'View departments',
                'department.create' => 'Create departments',
                'department.edit' => 'Edit departments',
                'department.delete' => 'Delete departments',
            ],
        ],
        'patients' => [
            'label' => 'Patients',
            'permissions' => [
                'patient.view' => 'View',
                'patient.create' => 'Create',
                'patient.edit' => 'Edit',
                'patient.delete' => 'Delete',
            ],
        ],
        'doctors' => [
            'label' => 'Doctors',
            'permissions' => [
                'doctor.view' => 'View',
                'doctor.create' => 'Create',
                'doctor.edit' => 'Edit',
                'doctor.delete' => 'Delete',
            ],
        ],
        'finance' => [
            'label' => 'Finance & P&L',
            'permissions' => [
                'financial.view' => 'View financial reports',
                'financial.create' => 'Record expenses',
                'financial.delete' => 'Delete expenses',
            ],
        ],
        'lab' => [
            'label' => 'Laboratory',
            'permissions' => [
                'lab.view' => 'View lab module',
                'lab.create' => 'Create lab records',
                'lab.edit' => 'Edit lab records',
                'lab.delete' => 'Delete lab records',
                'lab.verify' => 'Verify lab results',
                'lab.approve' => 'Approve lab results',
            ],
        ],
        'diagnostics' => [
            'label' => 'Diagnostics',
            'permissions' => [
                'diagnostic.view' => 'View',
                'diagnostic.create' => 'Create',
                'diagnostic.edit' => 'Edit',
                'diagnostic.delete' => 'Delete',
                'diagnostic.approve' => 'Approve reports',
            ],
        ],
        'reports' => [
            'label' => 'Reports',
            'permissions' => [
                'report.view' => 'View',
                'report.export' => 'Export',
            ],
        ],
        'settings' => [
            'label' => 'Settings',
            'permissions' => [
                'settings.view' => 'View',
                'settings.edit' => 'Edit',
            ],
        ],
        'users' => [
            'label' => 'Users',
            'permissions' => [
                'users.view' => 'View',
                'users.create' => 'Create',
                'users.edit' => 'Edit',
                'users.delete' => 'Delete',
            ],
        ],
        'roles' => [
            'label' => 'Roles & Permissions',
            'permissions' => [
                'role.view' => 'View roles',
                'role.create' => 'Create roles',
                'role.edit' => 'Edit roles',
                'role.delete' => 'Delete roles',
                'role.assign_permissions' => 'Assign permissions to roles',
            ],
        ],
        'audit' => [
            'label' => 'Audit Trail',
            'permissions' => [
                'audit.view' => 'View audit trail',
                'audit.export' => 'Export audit trail',
            ],
        ],
    ],

    /**
     * System roles shown/provisioned for each tenant (Roles page + user assignment).
     * Other role definitions may remain for legacy users but are not listed by default.
     */
    'tenant_roles' => [
        'company_admin',
        'receptionist',
        'doctor',
        'accountant',
        'staff',
        'lab_technician',
    ],

    /**
     * Reduced permission sets when a role operates in a specific tenant context.
     * Used instead of the default role permissions list during tenant provisioning.
     */
    'role_context_permissions' => [
        'doctor' => [
            'diagnostics_only' => [
                'diagnostic.view',
                'diagnostic.edit',
            ],
        ],
    ],

    /**
     * Default role definitions. Permission lists use wildcard module.action patterns
     * resolved by RolePermissionSeeder.
     */
    'roles' => [
        'super_admin' => [
            'label' => 'Super Admin',
            'description' => 'Full platform access. Roles & permissions are managed per tenant by each organization admin.',
            'is_system' => true,
            'permissions' => ['*'],
            'exclude_permissions' => ['role.*'],
        ],
        'company_admin' => [
            'label' => 'Admin',
            'description' => 'Manages a single diagnostic centre or laboratory tenant.',
            'is_system' => true,
            'permissions' => [
                'dashboard.*',
                'branch.*',
                'department.*',
                'patient.*',
                'doctor.*',
                'financial.*',
                'lab.*',
                'diagnostic.*',
                'report.*',
                'settings.*',
                'users.*',
                'role.*',
                'audit.*',
            ],
        ],
        'doctor' => [
            'label' => 'Doctor',
            'description' => 'Diagnostic or lab staff with patient and order access.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'patient.create',
                'patient.edit',
                'lab.view',
                'lab.create',
                'diagnostic.view',
                'diagnostic.create',
                'diagnostic.edit',
            ],
        ],
        'receptionist' => [
            'label' => 'Receptionist',
            'description' => 'Front desk — patients and diagnostic/lab bookings.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.*',
                'lab.view',
                'lab.create',
                'diagnostic.view',
                'diagnostic.create',
            ],
        ],
        'lab_technician' => [
            'label' => 'Lab Technician',
            'description' => 'Laboratory tests and results.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'patient.create',
                'patient.edit',
                'lab.*',
            ],
        ],
        'radiologist' => [
            'label' => 'Radiologist',
            'description' => 'Diagnostic imaging and reports.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'patient.create',
                'patient.edit',
                'diagnostic.*',
            ],
        ],
        'accountant' => [
            'label' => 'Accountant',
            'description' => 'Revenue, expenses, and financial reports.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'financial.*',
                'report.*',
                'patient.view',
            ],
        ],
        'staff' => [
            'label' => 'General Staff',
            'description' => 'General staff with limited access.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'lab.view',
                'diagnostic.view',
            ],
        ],
    ],
];
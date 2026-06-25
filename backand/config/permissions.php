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
        'clinic' => [
            'dashboard', 'branches', 'departments', 'patients', 'appointments',
            'doctors', 'prescriptions', 'billing', 'reports',
        ],
        'pharmacy' => ['medicine'],
        'laboratory' => ['lab'],
        'diagnostics' => ['diagnostics'],
    ],

    'tenant_core_modules' => ['settings', 'users', 'roles', 'patients'],

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
        'appointments' => [
            'label' => 'Appointments',
            'permissions' => [
                'appointment.view' => 'View',
                'appointment.create' => 'Create',
                'appointment.edit' => 'Edit',
                'appointment.delete' => 'Delete',
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
        'prescriptions' => [
            'label' => 'Prescriptions',
            'permissions' => [
                'prescription.view' => 'View',
                'prescription.create' => 'Create',
                'prescription.edit' => 'Edit',
                'prescription.delete' => 'Delete',
                'prescription.print' => 'Print',
            ],
        ],
        'medicine' => [
            'label' => 'Medicine',
            'permissions' => [
                'medicine.view' => 'View',
                'medicine.create' => 'Create',
                'medicine.edit' => 'Edit',
                'medicine.delete' => 'Delete',
            ],
        ],
        'billing' => [
            'label' => 'Billing',
            'permissions' => [
                'billing.view' => 'View',
                'billing.create' => 'Create',
                'billing.edit' => 'Edit',
                'billing.delete' => 'Delete',
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
            'label' => 'Hospital Admin',
            'description' => 'Manages a single clinic or hospital tenant.',
            'is_system' => true,
            'permissions' => [
                'dashboard.*',
                'branch.*',
                'department.*',
                'patient.*',
                'appointment.*',
                'doctor.*',
                'prescription.*',
                'medicine.*',
                'billing.*',
                'lab.*',
                'diagnostic.*',
                'report.*',
                'settings.*',
                'users.*',
                'role.*',
            ],
        ],
        'doctor' => [
            'label' => 'Doctor',
            'description' => 'Clinical staff with patient and appointment access.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'patient.create',
                'patient.edit',
                'appointment.view',
                'appointment.create',
                'appointment.edit',
                'prescription.*',
                'medicine.view',
                'lab.view',
                'lab.create',
                'diagnostic.view',
                'diagnostic.create',
                'billing.view',
            ],
        ],
        'nurse' => [
            'label' => 'Nurse',
            'description' => 'Nursing staff with patient care access.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'patient.edit',
                'appointment.view',
                'appointment.edit',
                'prescription.view',
                'medicine.view',
            ],
        ],
        'receptionist' => [
            'label' => 'Receptionist',
            'description' => 'Front desk — patients, appointments, and billing.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.*',
                'appointment.*',
                'billing.view',
                'billing.create',
                'billing.edit',
                'medicine.view',
                'lab.view',
                'lab.create',
                'diagnostic.view',
                'diagnostic.create',
            ],
        ],
        'pharmacist' => [
            'label' => 'Pharmacist',
            'description' => 'Pharmacy and medicine management.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'medicine.*',
                'prescription.view',
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
            'description' => 'Billing, revenue, and financial reports.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'billing.*',
                'report.*',
                'patient.view',
            ],
        ],
        'staff' => [
            'label' => 'General Staff',
            'description' => 'General clinic staff with limited access.',
            'is_system' => true,
            'permissions' => [
                'dashboard.view',
                'patient.view',
                'appointment.view',
                'medicine.view',
                'lab.view',
                'diagnostic.view',
            ],
        ],
    ],
];

<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminId = (string) Str::uuid();

        DB::table('users')->updateOrInsert(
            ['username' => 'admin'],
            [
                'id' => $adminId,
                'password_hash' => Hash::make('password'),
                'role' => 'Admin',
                'name' => 'Administrator',
                'discount_limit' => 100,
                'created_at' => now(),
            ]
        );

        $modules = [
            'rooms',
            'guests',
            'reservations',
            'folios',
            'reports',
            'taxes',
            'payment_methods',
            'room_types',
            'rate_plans',
            'property',
            'gateway',
            'users',
            'permissions',
            'integrations',
            'whatsapp',
            'telegram',
            'transactions',
            'ledger',
            'maintenance',
            'housekeeping',
            'refunds',
            'approvals',
            'audit',
        ];

        foreach ($modules as $module) {
            DB::table('role_permissions')->updateOrInsert(
                ['role' => 'Admin', 'module' => $module],
                ['access_level' => 'full']
            );
        }
    }
}

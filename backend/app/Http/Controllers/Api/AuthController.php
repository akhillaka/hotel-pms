<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\LegacyTokenService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly LegacyTokenService $tokens)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = null;

        if ($this->canUseMysql()) {
            try {
                $user = DB::table('users')->where('username', $data['username'])->first();
            } catch (\Throwable) {
                $user = null;
            }
        }

        if (! $user && app()->environment('local') && $data['username'] === 'admin' && $data['password'] === 'password') {
            $user = (object) [
                'id' => (string) Str::uuid(),
                'username' => 'admin',
                'password_hash' => Hash::make('password'),
                'role' => 'Admin',
                'name' => 'Administrator',
                'discount_limit' => 100,
            ];

            if ($this->canUseMysql()) {
                DB::table('users')->updateOrInsert(
                    ['username' => 'admin'],
                    [
                        'id' => $user->id,
                        'password_hash' => $user->password_hash,
                        'role' => $user->role,
                        'name' => $user->name,
                        'discount_limit' => $user->discount_limit,
                        'created_at' => now(),
                    ]
                );
            }
        }

        if (! $user || ! password_verify($data['password'], (string) $user->password_hash)) {
            return response()->json(['error' => 'Invalid credentials'], 400);
        }

        $permissions = $this->permissionsForRole((string) $user->role);
        $token = $this->tokens->issue([
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
            'name' => $user->name,
            'discountLimit' => $user->discount_limit,
        ]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'name' => $user->name,
                'discountLimit' => (float) $user->discount_limit,
                'permissions' => $permissions,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->attributes->get('legacy_user');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'name' => $user->name,
                'discountLimit' => (float) $user->discount_limit,
                'permissions' => $this->permissionsForRole((string) $user->role),
            ],
        ]);
    }

    private function permissionsForRole(string $role): array
    {
        if (! $this->canUseMysql()) {
            return $role === 'Admin'
                ? array_fill_keys([
                    'rooms', 'guests', 'reservations', 'folios', 'reports', 'taxes', 'payment_methods', 'room_types', 'rate_plans', 'property', 'gateway', 'users', 'permissions', 'integrations', 'whatsapp', 'telegram', 'transactions', 'ledger', 'maintenance', 'housekeeping', 'refunds', 'approvals', 'audit',
                ], 'full')
                : [];
        }

        try {
            $permissions = DB::table('role_permissions')
                ->where('role', $role)
                ->get(['module', 'access_level']);
        } catch (\Throwable) {
            return [];
        }

        $map = [];
        foreach ($permissions as $permission) {
            $map[$permission->module] = $permission->access_level;
        }

        return $map;
    }

    private function canUseMysql(): bool
    {
        return extension_loaded('pdo_mysql');
    }
}
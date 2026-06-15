<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class LegacyAudit
{
    public static function log(?string $userId, string $username, string $action, ?string $oldValue = null, ?string $newValue = null): void
    {
        DB::table('audit_logs')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $userId,
            'username' => $username,
            'action' => $action,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'timestamp' => now(),
        ]);
    }
}
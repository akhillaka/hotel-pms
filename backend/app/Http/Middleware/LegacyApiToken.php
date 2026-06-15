<?php

namespace App\Http\Middleware;

use App\Support\LegacyTokenService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class LegacyApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = (string) $request->header('Authorization', '');
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader) ?: null;

        if (! $token) {
            return response()->json(['error' => 'Access token missing'], 401);
        }

        $claims = app(LegacyTokenService::class)->parse($token);
        if (! $claims) {
            return response()->json(['error' => 'Invalid or expired token'], 403);
        }

        if (! extension_loaded('pdo_mysql')) {
            $user = (object) [
                'id' => $claims['id'] ?? null,
                'username' => $claims['username'] ?? '',
                'role' => $claims['role'] ?? 'Admin',
                'name' => $claims['name'] ?? ($claims['username'] ?? 'user'),
                'discount_limit' => $claims['discountLimit'] ?? 0,
            ];
        } else {
            try {
                $user = DB::table('users')->where('username', $claims['username'] ?? '')->first();
            } catch (\Throwable) {
                $user = null;
            }

            if (! $user) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }
        }

        $request->attributes->set('legacy_user', $user);
        $request->attributes->set('legacy_token', $claims);

        return $next($request);
    }
}
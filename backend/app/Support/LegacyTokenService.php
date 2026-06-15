<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Config;

class LegacyTokenService
{
    public function issue(array $claims): string
    {
        $claims['exp'] = CarbonImmutable::now()->addHours(8)->timestamp;

        $payload = $this->base64UrlEncode(json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $signature = hash_hmac('sha256', $payload, $this->secret());

        return $payload.'.'.$signature;
    }

    public function parse(?string $token): ?array
    {
        if (! $token || ! str_contains($token, '.')) {
            return null;
        }

        [$payload, $signature] = explode('.', $token, 2);
        $expected = hash_hmac('sha256', $payload, $this->secret());

        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $decoded = json_decode($this->base64UrlDecode($payload), true);
        if (! is_array($decoded) || empty($decoded['exp']) || $decoded['exp'] < time()) {
            return null;
        }

        return $decoded;
    }

    private function secret(): string
    {
        return (string) Config::get('app.key', '');
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
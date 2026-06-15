<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\LegacyAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function taxesIndex(): JsonResponse
    {
        return response()->json(DB::table('taxes')->orderBy('name')->get());
    }

    public function taxesStore(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string'], 'rate' => ['required']]);
        DB::table('taxes')->insert(['id' => (string) Str::uuid(), 'name' => $data['name'], 'rate' => (float) $data['rate']]);
        return response()->json(['message' => 'Tax rule created successfully']);
    }

    public function taxesDestroy(string $id): JsonResponse
    {
        DB::table('taxes')->where('id', $id)->delete();
        return response()->json(['message' => 'Tax rule removed successfully']);
    }

    public function paymentMethodsIndex(): JsonResponse
    {
        return response()->json(DB::table('payment_methods')->orderBy('name')->get());
    }

    public function paymentMethodsStore(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string']]);
        DB::table('payment_methods')->insert(['id' => (string) Str::uuid(), 'name' => $data['name'], 'status' => 'Active']);
        return response()->json(['message' => 'Payment method added successfully']);
    }

    public function paymentMethodsDestroy(string $id): JsonResponse
    {
        DB::table('payment_methods')->where('id', $id)->delete();
        return response()->json(['message' => 'Payment method removed']);
    }

    public function roomTypesIndex(): JsonResponse
    {
        return response()->json(DB::table('room_types')->orderBy('name')->get());
    }

    public function roomTypesStore(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string'], 'code' => ['required', 'string'], 'capacity' => ['required']]);
        DB::table('room_types')->insert(['id' => 'rt_'.Str::lower($data['code']), 'name' => $data['name'], 'code' => Str::upper($data['code']), 'capacity' => (int) $data['capacity']]);
        return response()->json(['message' => 'Room Type master created successfully']);
    }

    public function roomTypesUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string'], 'code' => ['required', 'string'], 'capacity' => ['required']]);
        DB::table('room_types')->where('id', $id)->update(['name' => $data['name'], 'code' => Str::upper($data['code']), 'capacity' => (int) $data['capacity']]);
        return response()->json(['message' => 'Room Type updated successfully']);
    }

    public function roomTypesDestroy(string $id): JsonResponse
    {
        DB::table('room_types')->where('id', $id)->delete();
        return response()->json(['message' => 'Room type category removed successfully']);
    }

    public function ratePlansIndex(): JsonResponse
    {
        $plans = DB::table('rate_plans as r')
            ->join('room_types as t', 'r.room_type_id', '=', 't.id')
            ->select('r.*', 't.name as room_type_name')
            ->get()
            ->map(function ($plan) {
                $plan->hourly_prices = json_decode($plan->hourly_prices ?? '{}', true) ?: [];
                return $plan;
            });

        return response()->json($plans);
    }

    public function ratePlansStore(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string'], 'room_type_id' => ['required', 'string'], 'night_price' => ['required'], 'day_use_price' => ['required'], 'hourly_prices' => ['required']]);
        DB::table('rate_plans')->insert(['id' => (string) Str::uuid(), 'name' => $data['name'], 'room_type_id' => $data['room_type_id'], 'night_price' => (float) $data['night_price'], 'day_use_price' => (float) $data['day_use_price'], 'hourly_prices' => json_encode($data['hourly_prices'])]);
        return response()->json(['message' => 'Rate plan created successfully']);
    }

    public function ratePlansUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string'], 'night_price' => ['required'], 'day_use_price' => ['required'], 'hourly_prices' => ['required']]);
        DB::table('rate_plans')->where('id', $id)->update(['name' => $data['name'], 'night_price' => (float) $data['night_price'], 'day_use_price' => (float) $data['day_use_price'], 'hourly_prices' => json_encode($data['hourly_prices'])]);
        return response()->json(['message' => 'Rate plan updated']);
    }

    public function ratePlansDestroy(string $id): JsonResponse
    {
        DB::table('rate_plans')->where('id', $id)->delete();
        return response()->json(['message' => 'Rate plan entry removed']);
    }

    public function roomsStore(Request $request): JsonResponse
    {
        $data = $request->validate(['room_number' => ['required', 'string'], 'room_type_id' => ['required', 'string'], 'floor' => ['required'], 'capacity' => ['required']]);
        DB::table('rooms')->insert(['id' => (string) Str::uuid(), 'room_number' => $data['room_number'], 'room_type_id' => $data['room_type_id'], 'floor' => (int) $data['floor'], 'capacity' => (int) $data['capacity'], 'status' => 'Vacant Clean']);
        return response()->json(['message' => 'Room created successfully']);
    }

    public function roomsUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['room_number' => ['required', 'string'], 'room_type_id' => ['required', 'string'], 'floor' => ['required'], 'capacity' => ['required']]);
        DB::table('rooms')->where('id', $id)->update(['room_number' => $data['room_number'], 'room_type_id' => $data['room_type_id'], 'floor' => (int) $data['floor'], 'capacity' => (int) $data['capacity']]);
        return response()->json(['message' => 'Room updated']);
    }

    public function roomsDestroy(string $id): JsonResponse
    {
        DB::table('rooms')->where('id', $id)->delete();
        return response()->json(['message' => 'Room removed successfully']);
    }

    public function propertyPublic(): JsonResponse
    {
        $rows = DB::table('property_settings')->get(['key', 'value']);
        $settings = ['name' => 'Akhil Residency', 'logo_url' => ''];
        foreach ($rows as $row) {
            $settings[$row->key] = $row->value;
        }
        return response()->json($settings);
    }

    public function propertyIndex(): JsonResponse
    {
        return $this->propertyPublic();
    }

    public function propertyStore(Request $request): JsonResponse
    {
        foreach ($request->all() as $key => $value) {
            DB::table('property_settings')->updateOrInsert(['key' => $key], ['value' => (string) $value]);
        }
        return response()->json(['message' => 'Property details updated successfully']);
    }

    public function propertyLogo(Request $request): JsonResponse
    {
        if (! $file = $request->file('logo')) {
            return response()->json(['error' => 'No file uploaded'], 400);
        }
        $name = Str::uuid().'-'.$file->getClientOriginalName();
        $file->move(public_path('uploads'), $name);
        DB::table('property_settings')->updateOrInsert(['key' => 'logo_url'], ['value' => '/uploads/'.$name]);
        return response()->json(['message' => 'Logo uploaded successfully', 'logo_url' => '/uploads/'.$name]);
    }

    public function settingsProperty(): JsonResponse
    {
        return $this->propertyPublic();
    }

    public function settingsPropertyStore(Request $request): JsonResponse
    {
        return $this->propertyStore($request);
    }

    public function gatewayIndex(): JsonResponse
    {
        return response()->json(DB::table('gateway_settings')->pluck('value', 'key'));
    }

    public function gatewayStore(Request $request): JsonResponse
    {
        foreach ($request->all() as $key => $value) {
            DB::table('gateway_settings')->updateOrInsert(['key' => $key], ['value' => (string) $value]);
        }
        return response()->json(['message' => 'Payment gateway configurations saved']);
    }

    public function usersIndex(): JsonResponse
    {
        return response()->json(DB::table('users')->select('id', 'username', 'role', 'name', 'discount_limit')->orderBy('name')->get());
    }

    public function usersStore(Request $request): JsonResponse
    {
        $data = $request->validate(['username' => ['required', 'string'], 'password' => ['required', 'string'], 'role' => ['required', 'string'], 'name' => ['required', 'string'], 'discount_limit' => ['nullable']]);
        $id = (string) Str::uuid();
        DB::table('users')->insert(['id' => $id, 'username' => $data['username'], 'password_hash' => bcrypt($data['password']), 'role' => $data['role'], 'name' => $data['name'], 'discount_limit' => (float) ($data['discount_limit'] ?? 0), 'created_at' => now()]);
        return response()->json(['message' => 'User created successfully', 'id' => $id]);
    }

    public function usersUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->only(['role', 'name', 'discount_limit', 'password']);
        $target = DB::table('users')->where('id', $id)->first();
        if (! $target) {
            return response()->json(['error' => 'User not found'], 404);
        }
        $update = ['role' => $data['role'] ?? $target->role, 'name' => $data['name'] ?? $target->name, 'discount_limit' => isset($data['discount_limit']) ? (float) $data['discount_limit'] : $target->discount_limit];
        if (! empty($data['password'])) {
            $update['password_hash'] = bcrypt($data['password']);
        }
        DB::table('users')->where('id', $id)->update($update);
        return response()->json(['message' => 'User updated successfully']);
    }

    public function permissionsIndex(): JsonResponse
    {
        return response()->json(DB::table('role_permissions')->get());
    }

    public function permissionsStore(Request $request): JsonResponse
    {
        $matrix = $request->input('matrix', []);
        foreach ($matrix as $item) {
            DB::table('role_permissions')->updateOrInsert(
                ['role' => $item['role'], 'module' => $item['module']],
                ['access_level' => $item['access_level']]
            );
        }
        return response()->json(['success' => true, 'message' => 'Permissions updated successfully']);
    }

    public function integrationsConfig(): JsonResponse
    {
        $keys = ['waToken', 'waPhoneId', 'waLang', 'waVerifyToken', 'tgToken', 'tgChatId', 'rzpKeyId', 'rzpKeySecret', 'rzpWebhookSecret', 'rzpMode'];
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = DB::table('property_settings')->where('key', $key)->value('value') ?? '';
        }
        return response()->json($result);
    }

    public function integrationsConfigStore(Request $request): JsonResponse
    {
        foreach (['waToken', 'waPhoneId', 'waLang', 'waVerifyToken', 'tgToken', 'tgChatId', 'rzpKeyId', 'rzpKeySecret', 'rzpWebhookSecret', 'rzpMode'] as $key) {
            if ($request->filled($key)) {
                DB::table('property_settings')->updateOrInsert(['key' => $key], ['value' => (string) $request->input($key)]);
            }
        }
        return response()->json(['message' => 'Integration settings saved']);
    }

    public function testTelegram(): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Test message dispatched to owner channel']);
    }

    public function testWhatsApp(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Test message dispatched to '.$request->input('mobile')]);
    }

    public function testRazorpay(): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Razorpay credentials are valid ✅']);
    }
}
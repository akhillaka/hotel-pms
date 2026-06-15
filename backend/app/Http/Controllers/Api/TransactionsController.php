<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionsController extends Controller
{
    private function legacyUser(Request $request): ?object
    {
        return $request->attributes->get('legacy_user');
    }

    public function index(): JsonResponse
    {
        $manual = DB::table('property_transactions')->get()->map(fn ($row) => (array) $row);
        return response()->json($manual);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['type' => ['required', 'string'], 'amount' => ['required'], 'category' => ['required', 'string'], 'description' => ['required', 'string']]);
        $id = (string) Str::uuid();
        $now = now();
        $legacyUser = $this->legacyUser($request);
        DB::table('property_transactions')->insert(['id' => $id, 'type' => $data['type'], 'amount' => (float) $data['amount'], 'category' => $data['category'], 'description' => $data['description'], 'created_by' => $legacyUser?->username ?? 'system', 'created_at' => $now]);
        return response()->json(['id' => $id, 'type' => $data['type'], 'amount' => (float) $data['amount'], 'category' => $data['category'], 'description' => $data['description'], 'created_by' => $legacyUser?->username ?? 'system', 'created_at' => $now]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['type' => ['required', 'string'], 'amount' => ['required'], 'category' => ['required', 'string'], 'description' => ['required', 'string']]);
        DB::table('property_transactions')->where('id', $id)->update(['type' => $data['type'], 'amount' => (float) $data['amount'], 'category' => $data['category'], 'description' => $data['description']]);
        return response()->json(['message' => 'Transaction updated']);
    }

    public function destroy(string $id): JsonResponse
    {
        DB::table('property_transactions')->where('id', $id)->delete();
        return response()->json(['message' => 'Transaction deleted']);
    }

    public function current(): JsonResponse
    {
        return response()->json(DB::table('cash_registers')->where('status', 'Open')->first());
    }

    public function history(): JsonResponse
    {
        return response()->json(DB::table('cash_registers')->where('status', 'Closed')->orderByDesc('closed_at')->limit(50)->get());
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate(['opening_cash' => ['nullable'], 'notes' => ['nullable', 'string']]);
        $existing = DB::table('cash_registers')->where('status', 'Open')->first();
        if ($existing) {
            return response()->json(['error' => 'A shift register is already open. Close it first.'], 400);
        }

        $id = 'REG-'.now()->timestamp;
        $legacyUser = $this->legacyUser($request);
        DB::table('cash_registers')->insert(['id' => $id, 'opened_at' => now(), 'opened_by' => $legacyUser?->username ?? 'system', 'opening_cash' => (float) ($data['opening_cash'] ?? 0), 'expected_cash' => (float) ($data['opening_cash'] ?? 0), 'status' => 'Open', 'notes' => $data['notes'] ?? '']);
        return response()->json(DB::table('cash_registers')->where('id', $id)->first());
    }

    public function close(Request $request): JsonResponse
    {
        $data = $request->validate(['actual_cash' => ['nullable'], 'notes' => ['nullable', 'string']]);
        $active = DB::table('cash_registers')->where('status', 'Open')->first();
        if (! $active) {
            return response()->json(['error' => 'No active shift register found to close.'], 400);
        }

        $legacyUser = $this->legacyUser($request);
        DB::table('cash_registers')->where('id', $active->id)->update(['closed_at' => now(), 'closed_by' => $legacyUser?->username ?? 'system', 'actual_cash' => (float) ($data['actual_cash'] ?? 0), 'status' => 'Closed', 'notes' => $data['notes'] ?? '']);
        return response()->json(DB::table('cash_registers')->where('id', $active->id)->first());
    }
}
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApprovalController extends Controller
{
    private function legacyUser(Request $request): ?object
    {
        return $request->attributes->get('legacy_user');
    }

    public function index(): JsonResponse
    {
        return response()->json(DB::table('approval_requests')->orderByDesc('created_at')->get());
    }

    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'details' => ['required'],
        ]);

        $id = (string) Str::uuid();
        DB::table('approval_requests')->insert([
            'id' => $id,
            'type' => $data['type'],
            'status' => 'Pending Approval',
            'requested_by' => $this->legacyUser($request)?->username ?? 'system',
            'created_at' => now(),
            'details' => json_encode($data['details']),
        ]);

        return response()->json(['message' => 'Approval request raised successfully', 'id' => $id]);
    }

    public function approve(string $id): JsonResponse
    {
        DB::table('approval_requests')->where('id', $id)->update(['status' => 'Approved', 'approved_by' => 'system', 'approved_at' => now()]);
        return response()->json(['message' => 'Request approved successfully and action executed.']);
    }

    public function reject(string $id): JsonResponse
    {
        DB::table('approval_requests')->where('id', $id)->update(['status' => 'Rejected', 'approved_by' => 'system', 'approved_at' => now()]);
        return response()->json(['message' => 'Request rejected']);
    }
}
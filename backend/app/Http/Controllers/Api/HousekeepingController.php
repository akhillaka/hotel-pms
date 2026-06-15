<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HousekeepingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            DB::table('housekeeping_tasks as h')
                ->join('rooms as r', 'h.room_id', '=', 'r.id')
                ->leftJoin('users as u', 'h.assigned_to', '=', 'u.username')
                ->select('h.*', 'r.room_number', 'r.status as room_status', 'u.name as housekeeper_name')
                ->orderByDesc('h.created_at')
                ->get()
        );
    }

    public function housekeepers(): JsonResponse
    {
        return response()->json(
            DB::table('users')
                ->whereIn('role', ['Housekeeping', 'Manager', 'Admin'])
                ->select('username', 'name', 'role')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'room_id' => ['required', 'string'],
            'remarks' => ['nullable', 'string'],
        ]);

        DB::table('housekeeping_tasks')->insert([
            'id' => (string) Str::uuid(),
            'room_id' => $data['room_id'],
            'assigned_to' => null,
            'status' => 'Pending',
            'remarks' => $data['remarks'] ?? 'Routine Cleaning',
            'created_at' => now(),
            'updated_at' => now(),
            'checklist' => json_encode([]),
            'priority' => 'medium',
        ]);

        DB::table('rooms')->where('id', $data['room_id'])->update(['status' => 'Dirty']);

        return response()->json(['message' => 'Housekeeping cleaning task created successfully']);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        DB::table('housekeeping_tasks')->where('id', $id)->update(array_filter([
            'assigned_to' => $request->input('assigned_to'),
            'status' => $request->input('status'),
            'remarks' => $request->input('remarks'),
            'checklist' => $request->filled('checklist') ? (is_string($request->input('checklist')) ? $request->input('checklist') : json_encode($request->input('checklist'))) : null,
            'priority' => $request->input('priority'),
            'updated_at' => now(),
        ], fn ($value) => $value !== null));

        return response()->json(['message' => 'Housekeeping task updated successfully']);
    }

    public function destroy(string $id): JsonResponse
    {
        DB::table('housekeeping_tasks')->where('id', $id)->delete();
        return response()->json(['message' => 'Task deleted']);
    }
}
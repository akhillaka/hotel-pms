<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MaintenanceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            DB::table('maintenance_tickets as m')
                ->join('rooms as r', 'm.room_id', '=', 'r.id')
                ->select('m.*', 'r.room_number')
                ->orderByDesc('m.created_at')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'room_id' => ['required', 'string'],
            'issue' => ['required', 'string'],
        ]);

        DB::table('maintenance_tickets')->insert([
            'id' => (string) Str::uuid(),
            'room_id' => $data['room_id'],
            'issue' => $data['issue'],
            'status' => 'Open',
            'created_at' => now(),
        ]);

        DB::table('rooms')->where('id', $data['room_id'])->update(['status' => 'Maintenance']);

        return response()->json(['message' => 'Maintenance ticket created and room status updated to Maintenance']);
    }

    public function resolve(string $id): JsonResponse
    {
        $ticket = DB::table('maintenance_tickets')->where('id', $id)->first();
        if (! $ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        DB::table('maintenance_tickets')->where('id', $id)->update(['status' => 'Resolved']);
        DB::table('rooms')->where('id', $ticket->room_id)->update(['status' => 'Vacant Clean']);

        return response()->json(['message' => 'Maintenance ticket resolved, room transitioned to Vacant Clean']);
    }
}
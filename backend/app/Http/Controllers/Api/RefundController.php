<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class RefundController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            DB::table('refunds as r')
                ->join('folios as f', 'r.folio_id', '=', 'f.id')
                ->join('reservations as res', 'f.reservation_id', '=', 'res.id')
                ->join('guests as g', 'res.guest_id', '=', 'g.id')
                ->select('r.*', 'f.reservation_id', 'res.reservation_number', 'g.name as guest_name')
                ->orderByDesc('r.created_at')
                ->get()
        );
    }

    public function approve(string $id): JsonResponse
    {
        DB::table('refunds')->where('id', $id)->update(['status' => 'Approved', 'approved_by' => 'system']);
        return response()->json(['message' => 'Refund approved and recorded on guest folio', 'refundId' => $id]);
    }

    public function reject(string $id): JsonResponse
    {
        DB::table('refunds')->where('id', $id)->update(['status' => 'Rejected', 'approved_by' => 'system']);
        return response()->json(['message' => 'Refund request rejected', 'refundId' => $id]);
    }
}
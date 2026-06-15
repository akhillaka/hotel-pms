<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalRooms = DB::table('rooms')->count();
        $dirtyRooms = DB::table('rooms')->where('status', 'Dirty')->count();
        $maintenanceRooms = DB::table('rooms')->where('status', 'Maintenance')->count();
        $occupiedRooms = DB::table('rooms')->where('status', 'Occupied')->count();
        $inhouseCount = DB::table('reservations')->where('status', 'Checked In')->count();
        $reservedRooms = DB::table('rooms')->where('status', 'Reserved')->count();
        $vacantClean = DB::table('rooms')->where('status', 'Vacant Clean')->count();
        $today = now()->toDateString();
        $arrivals = DB::table('reservations')->whereDate('check_in_datetime', $today)->count();
        $departures = DB::table('reservations')->whereDate('check_out_datetime', $today)->count();
        $checkins = DB::table('reservations')->whereDate('check_in_datetime', $today)->where('status', 'Checked In')->count();
        $checkouts = DB::table('reservations')->whereDate('check_out_datetime', $today)->where('status', 'Checked Out')->count();

        $revenueToday = (float) (DB::table('folio_entries')->where('entry_type', 'Charge')->whereDate('created_at', $today)->where('is_voided', 0)->sum('debit') ?: 0);
        $collectionToday = (float) (DB::table('folio_entries')->where('entry_type', 'Payment')->whereDate('created_at', $today)->where('is_voided', 0)->sum('credit') ?: 0);
        $outstanding = (float) DB::table('folio_entries as fe')->join('folios as f', 'fe.folio_id', '=', 'f.id')->where('f.status', 'Open')->where('fe.is_voided', 0)->selectRaw('COALESCE(SUM(fe.debit),0)-COALESCE(SUM(fe.credit),0) as balance')->value('balance') ?? 0;
        $delayedCheckins = DB::table('reservations')->whereDate('check_in_datetime', $today)->where('status', 'Reserved')->count();

        return response()->json([
            'occupancy' => [
                'total' => $totalRooms,
                'available' => $vacantClean,
                'occupied' => $occupiedRooms,
                'inhouse' => $inhouseCount,
                'reserved' => $reservedRooms,
                'dirty' => $dirtyRooms,
                'maintenance' => $maintenanceRooms,
            ],
            'activity' => [
                'arrivals' => $arrivals,
                'departures' => $departures,
                'checkins' => $checkins,
                'checkouts' => $checkouts,
                'walkins' => $checkins,
                'pendingCheckins' => $delayedCheckins,
            ],
            'financials' => [
                'revenueToday' => $revenueToday,
                'collectionToday' => $collectionToday,
                'outstanding' => $outstanding,
                'depositsHeld' => 0,
            ],
            'alerts' => [],
        ]);
    }

    public function advanced(Request $request): JsonResponse
    {
        $data = $request->validate(['startDate' => ['required', 'string'], 'endDate' => ['required', 'string']]);

        $getMetrics = function (string $start, string $end) {
            return [
                'revenue' => (float) (DB::table('folio_entries')->where('entry_type', 'Charge')->whereDate('created_at', '>=', $start)->whereDate('created_at', '<=', $end)->where('is_voided', 0)->sum('debit') ?: 0),
                'collections' => (float) (DB::table('folio_entries')->where('entry_type', 'Payment')->whereDate('created_at', '>=', $start)->whereDate('created_at', '<=', $end)->where('is_voided', 0)->sum('credit') ?: 0),
                'bookings' => DB::table('reservations')->whereDate('check_in_datetime', '>=', $start)->whereDate('check_in_datetime', '<=', $end)->count(),
            ];
        };

        return response()->json([
            'ranges' => [
                'current' => ['start' => $data['startDate'], 'end' => $data['endDate']],
                'prevMonth' => ['start' => $data['startDate'], 'end' => $data['endDate']],
                'prevYear' => ['start' => $data['startDate'], 'end' => $data['endDate']],
            ],
            'metrics' => [
                'current' => $getMetrics($data['startDate'], $data['endDate']),
                'prevMonth' => $getMetrics($data['startDate'], $data['endDate']),
                'prevYear' => $getMetrics($data['startDate'], $data['endDate']),
            ],
            'bookings' => [],
            'transactions' => [],
        ]);
    }
}
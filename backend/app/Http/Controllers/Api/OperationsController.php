<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\LegacyAudit;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OperationsController extends Controller
{
    private function legacyUser(Request $request): ?object
    {
        return $request->attributes->get('legacy_user');
    }

    public function roomsIndex(): JsonResponse
    {
        $rooms = DB::table('rooms as r')
            ->join('room_types as t', 'r.room_type_id', '=', 't.id')
            ->select('r.*', 't.name as room_type_name', 't.code as room_type_code')
            ->orderBy('r.room_number')
            ->get();

        return response()->json($rooms);
    }

    public function roomsAvailable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_type_id' => ['required', 'string'],
            'check_in' => ['required', 'string'],
            'check_out' => ['required', 'string'],
        ]);

        $rooms = DB::table('rooms as r')
            ->join('room_types as t', 'r.room_type_id', '=', 't.id')
            ->select('r.*', 't.name as room_type_name', 't.code as room_type_code')
            ->where('r.room_type_id', $validated['room_type_id'])
            ->where('r.status', '!=', 'Maintenance')
            ->whereNotIn('r.id', function ($query) use ($validated) {
                $query->select('room_id')
                    ->from('reservations')
                    ->where('room_type_id', $validated['room_type_id'])
                    ->whereNotNull('room_id')
                    ->whereNotIn('status', ['Cancelled', 'Checked Out', 'No Show'])
                    ->where('check_in_datetime', '<', $validated['check_out'])
                    ->where('check_out_datetime', '>', $validated['check_in']);
            })
            ->get();

        return response()->json($rooms);
    }

    public function roomStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'string']]);
        $room = DB::table('rooms')->where('id', $id)->first();
        if (! $room) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        DB::table('rooms')->where('id', $id)->update(['status' => $data['status']]);
        $legacyUser = $this->legacyUser($request);
        LegacyAudit::log($legacyUser?->id, $legacyUser?->username ?? 'system', 'ROOM_STATUS_CHANGE', $room->status, $data['status']);

        if ($data['status'] === 'Dirty') {
            DB::table('housekeeping_tasks')->updateOrInsert(
                ['room_id' => $id, 'status' => 'Pending'],
                ['id' => (string) Str::uuid(), 'remarks' => 'Manual status change to Dirty', 'created_at' => now(), 'updated_at' => now(), 'priority' => 'medium']
            );
        }

        return response()->json(['message' => 'Room status updated successfully', 'status' => $data['status']]);
    }

    public function guestsIndex(Request $request): JsonResponse
    {
        $query = DB::table('guests');
        if ($request->filled('mobile')) {
            $query->where('mobile', 'like', '%'.$request->string('mobile').'%');
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function guestShow(string $id): JsonResponse
    {
        $guest = DB::table('guests')->where('id', $id)->first();
        if (! $guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        return response()->json($guest);
    }

    public function guestHistory(string $id): JsonResponse
    {
        $stays = DB::table('reservations as r')
            ->leftJoin('rooms as rm', 'r.room_id', '=', 'rm.id')
            ->select('r.*', 'rm.room_number')
            ->where('r.guest_id', $id)
            ->orderByDesc('r.created_at')
            ->get();

        $revenue = DB::table('folio_entries as fe')
            ->join('folios as f', 'fe.folio_id', '=', 'f.id')
            ->join('reservations as r', 'f.reservation_id', '=', 'r.id')
            ->where('r.guest_id', $id)
            ->where('fe.is_voided', 0)
            ->selectRaw('COALESCE(SUM(fe.debit),0) as total_spent, COALESCE(SUM(fe.credit),0) as total_paid')
            ->first();

        $totalSpent = (float) ($revenue->total_spent ?? 0);
        $totalPaid = (float) ($revenue->total_paid ?? 0);

        return response()->json([
            'stays' => $stays,
            'totalSpent' => $totalSpent,
            'totalPaid' => $totalPaid,
            'outstanding' => $totalSpent - $totalPaid,
        ]);
    }

    public function guestUpdate(Request $request, string $id): JsonResponse
    {
        $guest = DB::table('guests')->where('id', $id)->first();
        if (! $guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'mobile' => ['sometimes', 'string'],
            'nationality' => ['sometimes', 'nullable', 'string'],
            'id_type' => ['sometimes', 'nullable', 'string'],
            'id_number' => ['sometimes', 'nullable', 'string'],
            'gender' => ['sometimes', 'nullable', 'string'],
            'dob' => ['sometimes', 'nullable', 'string'],
            'address' => ['sometimes', 'nullable', 'string'],
        ]);

        DB::table('guests')->where('id', $id)->update($data);
        $legacyUser = $this->legacyUser($request);
        LegacyAudit::log($legacyUser?->id, $legacyUser?->username ?? 'system', 'GUEST_UPDATED', $guest->name, $data['name'] ?? $guest->name);

        return response()->json(['message' => 'Guest updated successfully']);
    }

    public function guestBlacklist(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'is_blacklisted' => ['nullable'],
            'blacklist_reason' => ['nullable', 'string'],
        ]);

        $guest = DB::table('guests')->where('id', $id)->first();
        if (! $guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        DB::table('guests')->where('id', $id)->update([
            'is_blacklisted' => ! empty($data['is_blacklisted']) ? 1 : 0,
            'blacklist_reason' => $data['blacklist_reason'] ?? null,
        ]);

        $legacyUser = $this->legacyUser($request);
        LegacyAudit::log($legacyUser?->id, $legacyUser?->username ?? 'system', ! empty($data['is_blacklisted']) ? 'GUEST_BLACKLIST' : 'GUEST_UNBLACKLIST', $guest->name, $data['blacklist_reason'] ?? 'Removed from blacklist');

        return response()->json(['message' => 'Guest blacklist status updated successfully']);
    }

    public function guestDocuments(Request $request, string $id): JsonResponse
    {
        $guest = DB::table('guests')->where('id', $id)->first();
        if (! $guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        $paths = [];
        foreach (['photo' => 'photo_url', 'idFront' => 'id_front_url', 'idBack' => 'id_back_url'] as $field => $column) {
            if ($file = $request->file($field)) {
                $name = Str::uuid().'-'.$file->getClientOriginalName();
                $file->move(public_path('uploads'), $name);
                $paths[$column] = '/uploads/'.$name;
            }
        }

        if ($paths) {
            DB::table('guests')->where('id', $id)->update($paths);
        }

        return response()->json(['message' => 'Documents uploaded successfully']);
    }

    public function reservationsIndex(Request $request): JsonResponse
    {
        $query = DB::table('reservations as r')
            ->join('guests as g', 'r.guest_id', '=', 'g.id')
            ->join('room_types as rt', 'r.room_type_id', '=', 'rt.id')
            ->leftJoin('rooms as rm', 'r.room_id', '=', 'rm.id')
            ->select('r.*', 'g.name as guest_name', 'g.mobile as guest_mobile', 'rm.room_number', 'rt.name as room_type_name')
            ->orderByDesc('r.check_in_datetime');

        if ($request->filled('status')) {
            $query->where('r.status', $request->string('status'));
        }

        if ($request->filled('limit')) {
            $query->limit((int) $request->query('limit'));
        }

        return response()->json($query->get());
    }

    public function reservationCheckAvailability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'room_type_id' => ['required', 'string'],
            'check_in' => ['required', 'string'],
            'check_out' => ['required', 'string'],
        ]);

        $total = DB::table('rooms')->where('room_type_id', $data['room_type_id'])->count();
        $overlaps = DB::table('reservations')
            ->where('room_type_id', $data['room_type_id'])
            ->whereNotNull('room_id')
            ->whereNotIn('status', ['Cancelled', 'Checked Out', 'No Show'])
            ->where('check_in_datetime', '<', $data['check_out'])
            ->where('check_out_datetime', '>', $data['check_in'])
            ->count();

        return response()->json([
            'available' => max(0, $total - $overlaps),
            'total' => $total,
            'overlaps' => $overlaps,
        ]);
    }

    public function reservationStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'guest.name' => ['required', 'string'],
            'guest.mobile' => ['required', 'string'],
            'room_type_id' => ['required', 'string'],
            'rate_plan_id' => ['required', 'string'],
            'check_in' => ['required', 'string'],
            'check_out' => ['required', 'string'],
            'adults' => ['nullable', 'integer'],
            'children' => ['nullable', 'integer'],
            'room_id' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'custom_rate' => ['nullable'],
            'stay_type' => ['nullable', 'string'],
        ]);

        $guestData = $request->input('guest');
        $guest = DB::table('guests')->where('mobile', $guestData['mobile'])->first();
        if (! $guest) {
            $guestId = (string) Str::uuid();
            DB::table('guests')->insert([
                'id' => $guestId,
                'name' => $guestData['name'],
                'mobile' => $guestData['mobile'],
            ]);
            $guest = (object) ['id' => $guestId, 'name' => $guestData['name'], 'mobile' => $guestData['mobile']];
        }

        $checkIn = CarbonImmutable::parse($data['check_in']);
        $checkOut = CarbonImmutable::parse($data['check_out']);
        $stayType = $data['stay_type'] ?? ($checkIn->toDateString() === $checkOut->toDateString() ? 'day_use' : 'night');
        $status = $data['room_id'] ? 'Checked In' : 'Reserved';
        $reservationId = (string) Str::uuid();

        DB::table('reservations')->insert([
            'id' => $reservationId,
            'reservation_number' => 'RES-'.str_pad((string) (DB::table('reservations')->count() + 100001), 6, '0', STR_PAD_LEFT),
            'guest_id' => $guest->id,
            'room_type_id' => $data['room_type_id'],
            'room_id' => $data['room_id'] ?? null,
            'stay_type' => $stayType,
            'check_in_datetime' => $checkIn->toDateTimeString(),
            'check_out_datetime' => $checkOut->toDateTimeString(),
            'status' => $status,
            'adults' => $data['adults'] ?? 1,
            'children' => $data['children'] ?? 0,
            'remarks' => $data['remarks'] ?? null,
            'rate_plan_id' => $data['rate_plan_id'],
            'custom_rate' => $data['custom_rate'] ?? null,
            'created_at' => now(),
        ]);

        DB::table('folios')->insert([
            'id' => (string) Str::uuid(),
            'reservation_id' => $reservationId,
            'status' => 'Open',
            'created_at' => now(),
        ]);

        if ($data['room_id']) {
            DB::table('rooms')->where('id', $data['room_id'])->update(['status' => 'Occupied']);
        }

        return response()->json(['message' => 'Reservation created successfully', 'reservationId' => $reservationId]);
    }

    public function reservationUpdate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'guest_name' => ['nullable', 'string'],
            'adults' => ['nullable', 'integer'],
            'children' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string'],
        ]);

        $reservation = DB::table('reservations')->where('id', $id)->first();
        if (! $reservation) {
            return response()->json(['error' => 'Reservation not found'], 404);
        }

        if (! empty($data['guest_name'])) {
            DB::table('guests')->where('id', $reservation->guest_id)->update(['name' => $data['guest_name']]);
        }

        DB::table('reservations')->where('id', $id)->update([
            'adults' => $data['adults'] ?? $reservation->adults,
            'children' => $data['children'] ?? $reservation->children,
            'remarks' => $data['remarks'] ?? $reservation->remarks,
        ]);

        return response()->json(['message' => 'Reservation updated']);
    }

    public function reservationDelete(string $id): JsonResponse
    {
        DB::table('reservations')->where('id', $id)->delete();
        return response()->json(['message' => 'Reservation deleted']);
    }

    public function reservationAction(Request $request, string $id, string $action): JsonResponse
    {
        return match ($action) {
            'check-in' => $this->checkIn($request, $id),
            'check-out' => $this->checkOut($request, $id),
            'cancel' => $this->cancel($request, $id),
            'no-show' => $this->noShow($request, $id),
            'room-change' => $this->roomChange($request, $id),
            default => response()->json(['error' => 'Unsupported action'], 404),
        };
    }

    public function reservationDates(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['check_out' => ['required', 'string']]);
        DB::table('reservations')->where('id', $id)->update(['check_out_datetime' => $data['check_out']]);
        return response()->json(['message' => 'Reservation dates updated']);
    }

    public function folioShow(string $reservationId): JsonResponse
    {
        $folio = DB::table('folios')->where('reservation_id', $reservationId)->first();
        if (! $folio) {
            return response()->json(['error' => 'Folio not found for this reservation'], 404);
        }

        $entries = DB::table('folio_entries')->where('folio_id', $folio->id)->orderBy('created_at')->get();
        $summary = DB::table('folio_entries')
            ->where('folio_id', $folio->id)
            ->where('is_voided', 0)
            ->selectRaw('COALESCE(SUM(debit),0) as totalDebit, COALESCE(SUM(credit),0) as totalCredit')
            ->first();

        $totalDebit = (float) ($summary->totalDebit ?? 0);
        $totalCredit = (float) ($summary->totalCredit ?? 0);

        return response()->json([
            'folio' => $folio,
            'entries' => $entries,
            'summary' => [
                'totalDebit' => $totalDebit,
                'totalCredit' => $totalCredit,
                'balance' => $totalDebit - $totalCredit,
            ],
        ]);
    }

    public function folioCharge(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'charge_type' => ['required', 'string'],
            'description' => ['required', 'string'],
            'amount' => ['required'],
            'tax_id' => ['nullable', 'string'],
        ]);

        $folio = DB::table('folios')->where('id', $id)->first();
        if (! $folio) {
            return response()->json(['error' => 'Folio not found'], 404);
        }

        if ($folio->status === 'Checked Out') {
            return response()->json(['error' => 'Cannot post charges to a closed folio'], 400);
        }

        $mode = DB::table('property_settings')->where('key', 'tax_calculation_mode')->value('value') ?? 'Exempt';
        $baseAmount = (float) $data['amount'];
        $taxAmount = 0;
        $chargeDesc = $data['description'];
        $taxDesc = '';

        if (! empty($data['tax_id']) && $mode !== 'Exempt') {
            $tax = DB::table('taxes')->where('id', $data['tax_id'])->first();
            if ($tax) {
                if ($mode === 'Inclusive') {
                    $baseAmount = (float) $data['amount'] / (1 + ((float) $tax->rate / 100));
                    $taxAmount = (float) $data['amount'] - $baseAmount;
                    $chargeDesc = $data['description'].' (Inc. '.$tax->rate.'% '.$tax->name.')';
                } else {
                    $taxAmount = (float) $data['amount'] * ((float) $tax->rate / 100);
                }
                $taxDesc = $tax->name.' ('.$tax->rate.'%) on '.$data['description'];
            }
        }

        $balance = (float) DB::table('folio_entries')->where('folio_id', $folio->id)->where('is_voided', 0)->selectRaw('COALESCE(SUM(debit),0)-COALESCE(SUM(credit),0) as balance')->value('balance') ?? 0;
        $balance += $baseAmount;

        DB::table('folio_entries')->insert([
            'id' => (string) Str::uuid(),
            'folio_id' => $folio->id,
            'entry_type' => 'Charge',
            'charge_type' => $data['charge_type'],
            'description' => $chargeDesc,
            'debit' => $baseAmount,
            'credit' => 0,
            'balance' => $balance,
            'created_by' => ($this->legacyUser($request)?->name ?? 'System').' ('.($this->legacyUser($request)?->role ?? 'System').')',
            'created_at' => now(),
        ]);

        if ($taxAmount > 0) {
            $balance += $taxAmount;
            DB::table('folio_entries')->insert([
                'id' => (string) Str::uuid(),
                'folio_id' => $folio->id,
                'entry_type' => 'Charge',
                'charge_type' => 'Tax',
                'description' => $taxDesc,
                'debit' => $taxAmount,
                'credit' => 0,
                'balance' => $balance,
                'created_by' => ($this->legacyUser($request)?->name ?? 'System').' ('.($this->legacyUser($request)?->role ?? 'System').')',
                'created_at' => now(),
            ]);
        }

        $legacyUser = $this->legacyUser($request);
        LegacyAudit::log($legacyUser?->id, $legacyUser?->username ?? 'system', 'CHARGE_POSTED', 'Folio: '.$folio->id, 'Type: '.$data['charge_type'].' | Base: '.number_format($baseAmount, 2)." | Tax: ".number_format($taxAmount, 2));
        return response()->json(['message' => 'Charge posted successfully']);
    }

    public function folioPayment(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'amount' => ['required'],
        ]);

        $folio = DB::table('folios')->where('id', $id)->first();
        if (! $folio) {
            return response()->json(['error' => 'Folio not found'], 404);
        }

        $balance = (float) DB::table('folio_entries')->where('folio_id', $folio->id)->where('is_voided', 0)->selectRaw('COALESCE(SUM(debit),0)-COALESCE(SUM(credit),0) as balance')->value('balance') ?? 0;
        $newBalance = $balance - (float) $data['amount'];

        DB::table('folio_entries')->insert([
            'id' => (string) Str::uuid(),
            'folio_id' => $folio->id,
            'entry_type' => 'Payment',
            'payment_method' => $data['payment_method'],
            'description' => $data['description'] ?? 'Payment intake',
            'debit' => 0,
            'credit' => (float) $data['amount'],
            'balance' => $newBalance,
            'created_by' => ($this->legacyUser($request)?->name ?? 'System').' ('.($this->legacyUser($request)?->role ?? 'System').')',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Payment recorded successfully']);
    }

    public function folioDeposit(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['amount' => ['required'], 'payment_method' => ['nullable', 'string'], 'description' => ['nullable', 'string']]);
        DB::table('deposits')->insert([
            'id' => (string) Str::uuid(),
            'folio_id' => $id,
            'amount' => (float) $data['amount'],
            'payment_method' => $data['payment_method'] ?? 'Cash',
            'status' => 'Held',
            'description' => $data['description'] ?? null,
            'created_by' => $this->legacyUser($request)?->username ?? 'system',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Deposit recorded']);
    }

    public function folioRefund(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['amount' => ['required'], 'payment_method' => ['nullable', 'string'], 'reason' => ['required', 'string']]);
        DB::table('refunds')->insert([
            'id' => (string) Str::uuid(),
            'folio_id' => $id,
            'amount' => (float) $data['amount'],
            'payment_method' => $data['payment_method'] ?? 'Cash',
            'status' => 'Pending Approval',
            'reason' => $data['reason'],
            'requested_by' => $this->legacyUser($request)?->username ?? 'system',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Refund request submitted']);
    }

    public function folioReopen(Request $request, string $id): JsonResponse
    {
        $folio = DB::table('folios')->where('id', $id)->first();
        if (! $folio) {
            return response()->json(['error' => 'Folio not found'], 404);
        }

        DB::table('folios')->where('id', $id)->update(['status' => 'Open']);
        DB::table('reservations')->where('id', $folio->reservation_id)->update(['status' => 'Checked In']);
        return response()->json(['message' => 'Folio reopened successfully']);
    }

    public function folioAdjust(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['original_entry_id' => ['required', 'string'], 'reason' => ['required', 'string'], 'discount_percent' => ['nullable']]);
        $entry = DB::table('folio_entries')->where('id', $data['original_entry_id'])->first();
        if (! $entry) {
            return response()->json(['error' => 'Original charge entry not found'], 404);
        }

        $legacyUser = $this->legacyUser($request);
        if (! empty($data['discount_percent']) && (float) $data['discount_percent'] > (float) ($legacyUser?->discount_limit ?? 0)) {
            return response()->json(['error' => 'DISCOUNT_LIMIT_EXCEEDED', 'message' => 'Your account role ('.$legacyUser?->role.') has a maximum discount policy limit of '.($legacyUser?->discount_limit ?? 0)."%. Action blocked."], 403);
        }

        DB::table('folio_entries')->insert([
            'id' => (string) Str::uuid(),
            'folio_id' => $id,
            'entry_type' => 'Adjustment',
            'description' => 'Adjustment Reversal: '.$entry->description.'. Reason: '.$data['reason'],
            'debit' => 0,
            'credit' => (float) $entry->debit,
            'balance' => 0,
            'created_by' => ($legacyUser?->name ?? 'System').' ('.($legacyUser?->role ?? 'System').')',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Folio adjustment posted successfully']);
    }

    public function folioUpdateCharge(Request $request, string $entryId): JsonResponse
    {
        $data = $request->validate(['description' => ['required', 'string'], 'amount' => ['required']]);
        DB::table('folio_entries')->where('id', $entryId)->update(['description' => $data['description'], 'debit' => (float) $data['amount']]);
        return response()->json(['message' => 'Charge updated successfully']);
    }

    public function folioUpdatePayment(Request $request, string $entryId): JsonResponse
    {
        $data = $request->validate(['description' => ['required', 'string'], 'amount' => ['required'], 'payment_method' => ['required', 'string']]);
        DB::table('folio_entries')->where('id', $entryId)->update(['description' => $data['description'], 'credit' => (float) $data['amount'], 'payment_method' => $data['payment_method']]);
        return response()->json(['message' => 'Payment updated successfully']);
    }

    public function folioVoidEntry(Request $request, string $id): JsonResponse
    {
        DB::table('folio_entries')->where('id', $id)->update(['is_voided' => 1]);
        return response()->json(['message' => 'Folio entry voided successfully']);
    }

    private function checkIn(Request $request, string $id): JsonResponse
    {
        $reservation = DB::table('reservations')->where('id', $id)->first();
        if (! $reservation) {
            return response()->json(['error' => 'Reservation not found'], 404);
        }
        if ($reservation->status === 'Checked In') {
            return response()->json(['error' => 'Guest is already checked in to this reservation'], 400);
        }
        if ($reservation->status === 'Cancelled') {
            return response()->json(['error' => 'Cannot check-in a cancelled reservation'], 400);
        }

        $roomId = $request->input('room_id', $reservation->room_id);
        DB::table('reservations')->where('id', $id)->update(['status' => 'Checked In', 'room_id' => $roomId]);
        if ($roomId) {
            DB::table('rooms')->where('id', $roomId)->update(['status' => 'Occupied']);
        }
        DB::table('folios')->where('reservation_id', $id)->update(['status' => 'Open']);
        return response()->json(['message' => 'Guest checked in successfully']);
    }

    private function checkOut(Request $request, string $id): JsonResponse
    {
        $reservation = DB::table('reservations')->where('id', $id)->first();
        if (! $reservation) {
            return response()->json(['error' => 'Reservation not found'], 404);
        }

        DB::table('reservations')->where('id', $id)->update(['status' => 'Checked Out']);
        $folio = DB::table('folios')->where('reservation_id', $id)->first();
        if ($folio) {
            DB::table('folios')->where('id', $folio->id)->update(['status' => 'Checked Out']);
        }
        if ($reservation->room_id) {
            DB::table('rooms')->where('id', $reservation->room_id)->update(['status' => 'Dirty']);
        }
        return response()->json(['message' => 'Reservation checked out successfully']);
    }

    private function cancel(Request $request, string $id): JsonResponse
    {
        DB::table('reservations')->where('id', $id)->update(['status' => 'Cancelled']);
        return response()->json(['message' => 'Reservation cancelled successfully']);
    }

    private function noShow(Request $request, string $id): JsonResponse
    {
        DB::table('reservations')->where('id', $id)->update(['status' => 'No Show']);
        return response()->json(['message' => 'Reservation marked as no show']);
    }

    private function roomChange(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['room_id' => ['required', 'string']]);
        DB::table('reservations')->where('id', $id)->update(['room_id' => $data['room_id']]);
        DB::table('rooms')->where('id', $data['room_id'])->update(['status' => 'Occupied']);
        return response()->json(['message' => 'Reservation room changed successfully']);
    }

}
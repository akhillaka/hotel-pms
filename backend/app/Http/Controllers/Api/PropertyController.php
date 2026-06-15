<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PropertyController extends Controller
{
    public function public(): JsonResponse
    {
        $rows = DB::table('property_settings')->get(['key', 'value']);
        $settings = [
            'name' => 'Akhil Residency',
            'logo_url' => '',
        ];

        foreach ($rows as $row) {
            $settings[$row->key] = $row->value;
        }

        return response()->json($settings);
    }
}
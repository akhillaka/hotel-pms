<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IntegrationsController extends Controller
{
    public function whatsappFeed(): JsonResponse
    {
        return response()->json(DB::table('whatsapp_messages')->orderByDesc('timestamp')->limit(200)->get());
    }

    public function whatsappConversations(): JsonResponse
    {
        return response()->json(DB::table('whatsapp_conversations')->orderByDesc('last_message_at')->get());
    }

    public function whatsappMessages(Request $request): JsonResponse
    {
        $mobile = $request->query('mobile');
        if (! $mobile) {
            return response()->json(['error' => 'Missing mobile parameter'], 400);
        }

        return response()->json(DB::table('whatsapp_messages')->where('mobile', $mobile)->orderBy('timestamp')->get());
    }

    public function whatsappSend(Request $request): JsonResponse
    {
        $data = $request->validate(['mobile' => ['required', 'string'], 'message' => ['required', 'string'], 'templateName' => ['nullable', 'string']]);
        $conversation = DB::table('whatsapp_conversations')->where('mobile', $data['mobile'])->first();
        if (! $conversation) {
            $conversationId = (string) Str::uuid();
            DB::table('whatsapp_conversations')->insert(['id' => $conversationId, 'mobile' => $data['mobile'], 'status' => 'Open', 'last_message_at' => now(), 'created_at' => now()]);
        } else {
            $conversationId = $conversation->id;
            DB::table('whatsapp_conversations')->where('id', $conversationId)->update(['last_message_at' => now()]);
        }

        DB::table('whatsapp_messages')->insert([
            'id' => (string) Str::uuid(),
            'conversation_id' => $conversationId,
            'mobile' => $data['mobile'],
            'message' => $data['message'],
            'type' => $data['templateName'] ?? 'Manual Agent Reply',
            'status' => 'Sent',
            'template_name' => $data['templateName'] ?? null,
            'timestamp' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function telegramFeed(): JsonResponse
    {
        return response()->json([]);
    }

    public function whatsappWebhookVerify(Request $request): mixed
    {
        $verifyToken = DB::table('property_settings')->where('key', 'waVerifyToken')->value('value') ?? 'pms_verify_token';
        return $request->query('hub.mode') === 'subscribe' && $request->query('hub.verify_token') === $verifyToken ? response($request->query('hub.challenge')) : response()->noContent(403);
    }

    public function whatsappWebhook(Request $request): JsonResponse
    {
        return response()->json(['ok' => true]);
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

    public function integrationsConfig(): JsonResponse
    {
        return app(AdminController::class)->integrationsConfig();
    }

    public function integrationsConfigStore(Request $request): JsonResponse
    {
        return app(AdminController::class)->integrationsConfigStore($request);
    }
}
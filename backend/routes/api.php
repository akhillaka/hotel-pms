<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HousekeepingController;
use App\Http\Controllers\Api\IntegrationsController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\OperationsController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\TransactionsController;
use Illuminate\Support\Facades\Route;

Route::get('/debug-info', fn () => response()->json(['status' => 'ok', 'backend' => 'laravel-12']));
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/property/public', [PropertyController::class, 'public']);
Route::get('/taxes', [AdminController::class, 'taxesIndex']);

Route::middleware('legacy.token')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/rooms', [OperationsController::class, 'roomsIndex']);
    Route::get('/rooms/available', [OperationsController::class, 'roomsAvailable']);
    Route::patch('/rooms/{id}/status', [OperationsController::class, 'roomStatus']);
    Route::post('/rooms', [AdminController::class, 'roomsStore']);
    Route::put('/rooms/{id}', [AdminController::class, 'roomsUpdate']);
    Route::delete('/rooms/{id}', [AdminController::class, 'roomsDestroy']);

    Route::get('/guests', [OperationsController::class, 'guestsIndex']);
    Route::get('/guests/{id}', [OperationsController::class, 'guestShow']);
    Route::get('/guests/{id}/history', [OperationsController::class, 'guestHistory']);
    Route::patch('/guests/{id}', [OperationsController::class, 'guestUpdate']);
    Route::patch('/guests/{id}/blacklist', [OperationsController::class, 'guestBlacklist']);
    Route::post('/guests/{id}/documents', [OperationsController::class, 'guestDocuments']);

    Route::get('/reservations', [OperationsController::class, 'reservationsIndex']);
    Route::post('/reservations/check-availability', [OperationsController::class, 'reservationCheckAvailability']);
    Route::post('/reservations', [OperationsController::class, 'reservationStore']);
    Route::put('/reservations/{id}', [OperationsController::class, 'reservationUpdate']);
    Route::delete('/reservations/{id}', [OperationsController::class, 'reservationDelete']);
    Route::post('/reservations/{id}/{action}', [OperationsController::class, 'reservationAction']);
    Route::patch('/reservations/{id}/dates', [OperationsController::class, 'reservationDates']);

    Route::get('/folios/{reservationId}', [OperationsController::class, 'folioShow']);
    Route::post('/folios/{id}/charge', [OperationsController::class, 'folioCharge']);
    Route::post('/folios/{id}/payment', [OperationsController::class, 'folioPayment']);
    Route::post('/folios/{id}/deposit', [OperationsController::class, 'folioDeposit']);
    Route::post('/folios/{id}/refund', [OperationsController::class, 'folioRefund']);
    Route::post('/folios/{id}/reopen', [OperationsController::class, 'folioReopen']);
    Route::post('/folios/{id}/adjust', [OperationsController::class, 'folioAdjust']);
    Route::patch('/folios/charges/{entryId}', [OperationsController::class, 'folioUpdateCharge']);
    Route::patch('/folios/payments/{entryId}', [OperationsController::class, 'folioUpdatePayment']);
    Route::delete('/folios/entries/{id}', [OperationsController::class, 'folioVoidEntry']);

    Route::get('/reports/dashboard', [ReportsController::class, 'dashboard']);
    Route::get('/reports/advanced', [ReportsController::class, 'advanced']);

    Route::get('/maintenance', [MaintenanceController::class, 'index']);
    Route::post('/maintenance', [MaintenanceController::class, 'store']);
    Route::patch('/maintenance/{id}/resolve', [MaintenanceController::class, 'resolve']);

    Route::get('/housekeeping/tasks', [HousekeepingController::class, 'index']);
    Route::get('/housekeepers', [HousekeepingController::class, 'housekeepers']);
    Route::post('/housekeeping/tasks', [HousekeepingController::class, 'store']);
    Route::patch('/housekeeping/tasks/{id}', [HousekeepingController::class, 'update']);
    Route::delete('/housekeeping/tasks/{id}', [HousekeepingController::class, 'destroy']);

    Route::get('/audit', [AuditController::class, 'index']);
    Route::get('/refunds', [RefundController::class, 'index']);
    Route::post('/refunds/{id}/approve', [RefundController::class, 'approve']);
    Route::post('/refunds/{id}/reject', [RefundController::class, 'reject']);
    Route::get('/approvals', [ApprovalController::class, 'index']);
    Route::post('/approvals/request', [ApprovalController::class, 'request']);
    Route::post('/approvals/{id}/approve', [ApprovalController::class, 'approve']);
    Route::post('/approvals/{id}/reject', [ApprovalController::class, 'reject']);

    Route::get('/payment-methods', [AdminController::class, 'paymentMethodsIndex']);
    Route::post('/payment-methods', [AdminController::class, 'paymentMethodsStore']);
    Route::delete('/payment-methods/{id}', [AdminController::class, 'paymentMethodsDestroy']);
    Route::post('/taxes', [AdminController::class, 'taxesStore']);
    Route::delete('/taxes/{id}', [AdminController::class, 'taxesDestroy']);
    Route::get('/room-types', [AdminController::class, 'roomTypesIndex']);
    Route::post('/room-types', [AdminController::class, 'roomTypesStore']);
    Route::patch('/room-types/{id}', [AdminController::class, 'roomTypesUpdate']);
    Route::delete('/room-types/{id}', [AdminController::class, 'roomTypesDestroy']);
    Route::get('/rate-plans', [AdminController::class, 'ratePlansIndex']);
    Route::post('/rate-plans', [AdminController::class, 'ratePlansStore']);
    Route::patch('/rate-plans/{id}', [AdminController::class, 'ratePlansUpdate']);
    Route::delete('/rate-plans/{id}', [AdminController::class, 'ratePlansDestroy']);
    Route::get('/property', [AdminController::class, 'propertyIndex']);
    Route::post('/property', [AdminController::class, 'propertyStore']);
    Route::post('/property/logo', [AdminController::class, 'propertyLogo']);
    Route::get('/settings/property', [AdminController::class, 'settingsProperty']);
    Route::post('/settings/property', [AdminController::class, 'settingsPropertyStore']);
    Route::get('/gateway', [AdminController::class, 'gatewayIndex']);
    Route::post('/gateway', [AdminController::class, 'gatewayStore']);
    Route::get('/users', [AdminController::class, 'usersIndex']);
    Route::post('/users', [AdminController::class, 'usersStore']);
    Route::patch('/users/{id}', [AdminController::class, 'usersUpdate']);
    Route::get('/permissions', [AdminController::class, 'permissionsIndex']);
    Route::post('/permissions', [AdminController::class, 'permissionsStore']);
    Route::get('/integrations/config', [AdminController::class, 'integrationsConfig']);
    Route::post('/integrations/config', [AdminController::class, 'integrationsConfigStore']);
    Route::post('/integrations/test-telegram', [AdminController::class, 'testTelegram']);
    Route::post('/integrations/test-whatsapp', [AdminController::class, 'testWhatsApp']);
    Route::post('/integrations/test-razorpay', [AdminController::class, 'testRazorpay']);

    Route::get('/whatsapp/feed', [IntegrationsController::class, 'whatsappFeed']);
    Route::get('/whatsapp/conversations', [IntegrationsController::class, 'whatsappConversations']);
    Route::get('/whatsapp/messages', [IntegrationsController::class, 'whatsappMessages']);
    Route::post('/whatsapp/send', [IntegrationsController::class, 'whatsappSend']);
    Route::get('/telegram/feed', [IntegrationsController::class, 'telegramFeed']);
    Route::get('/whatsapp/webhook', [IntegrationsController::class, 'whatsappWebhookVerify']);
    Route::post('/whatsapp/webhook', [IntegrationsController::class, 'whatsappWebhook']);

    Route::get('/transactions', [TransactionsController::class, 'index']);
    Route::post('/transactions', [TransactionsController::class, 'store']);
    Route::put('/transactions/{id}', [TransactionsController::class, 'update']);
    Route::delete('/transactions/{id}', [TransactionsController::class, 'destroy']);
    Route::get('/ledger/current', [TransactionsController::class, 'current']);
    Route::get('/ledger/history', [TransactionsController::class, 'history']);
    Route::post('/ledger/open', [TransactionsController::class, 'open']);
    Route::post('/ledger/close', [TransactionsController::class, 'close']);
});
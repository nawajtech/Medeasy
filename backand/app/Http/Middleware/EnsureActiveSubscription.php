<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveSubscription
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isSuperAdmin() || ! $user->company_id) {
            return $next($request);
        }

        $company = $user->company;

        if (! $company || $this->subscriptions->hasActiveSubscription($company)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Your organization does not have an active subscription. Please contact your administrator or upgrade your plan.',
            'reason' => 'subscription_inactive',
            'subscription' => $this->subscriptions->subscriptionSummary($company),
        ], 403);
    }
}

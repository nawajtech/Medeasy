<?php

namespace App\Http\Controllers\Api\Patient;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\AppointmentAssistant\AppointmentAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class PatientChatController extends Controller
{
    public function __construct(
        private AppointmentAssistantService $assistant,
    ) {}

    public function chat(Request $request): JsonResponse
    {
        /** @var Patient $patient */
        $patient = $request->user();

        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'history' => ['sometimes', 'array', 'max:40'],
            'history.*.role' => ['required_with:history', Rule::in(['user', 'assistant'])],
            'history.*.content' => ['required_with:history', 'string', 'max:4000'],
        ]);

        $history = $data['history'] ?? [];
        $history[] = [
            'role' => 'user',
            'content' => $data['message'],
        ];

        try {
            $result = $this->assistant->chat($patient, $history);
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'reply' => $e->getMessage(),
            ], 503);
        } catch (Throwable $e) {
            report($e);

            if ($this->isRateLimitError($e)) {
                $msg = 'The booking assistant is busy right now (AI rate limit). Please wait about a minute and try again, or book from the Centres page.';

                return response()->json([
                    'message' => $msg,
                    'reply' => $msg,
                ], 429);
            }

            $message = config('app.debug')
                ? ('Assistant error: '.$e->getMessage())
                : 'Assistant error';

            return response()->json([
                'message' => $message,
                'reply' => 'Something went wrong while processing your request. Please try again.',
            ], 500);
        }

        return response()->json([
            'reply' => $result['reply'],
            'booked' => $result['booked'],
            'appointment_id' => $result['appointment_id'],
            // Omit detailed tool_trace in production responses to keep payloads small;
            // include only when APP_DEBUG is on for local debugging.
            'tool_trace' => config('app.debug') ? $result['tool_trace'] : [],
        ]);
    }

    private function isRateLimitError(Throwable $e): bool
    {
        $msg = strtolower($e->getMessage());

        return str_contains($msg, 'rate limit')
            || str_contains($msg, 'too many requests')
            || str_contains($msg, 'resource_exhausted')
            || $e instanceof \OpenAI\Exceptions\RateLimitException;
    }
}

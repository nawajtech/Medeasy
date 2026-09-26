<?php

namespace App\Services\AppointmentAssistant;

use App\Models\Patient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AppointmentAssistantService
{
    public const SYSTEM_PROMPT = <<<'PROMPT'
You are the AI appointment assistant for Apna Medi.

Your job is to help patients book diagnostic appointments by understanding their messages and using the available tools.

## Available Tools

1. `findPatient` — Find/confirm the logged-in patient (optionally by phone).
2. `checkServiceAvailability` — Check whether a requested service/test is available (USG, CBC, X-Ray, ECG, etc.).
3. `checkDoctorAvailability` — Check which doctors/centres are available for a service/date/time.
4. `getAvailableSlots` — Return real available appointment slots.
5. `bookAppointment` — Create the appointment after all required information is confirmed.
6. `getAppointmentDetails` — Get details of an existing appointment.
7. `cancelAppointment` — Cancel an existing appointment after confirming with the patient.

## Important Rules

* Never invent doctor availability.
* Never invent appointment slots.
* Never say an appointment is booked until `bookAppointment` successfully returns success=true.
* Never directly access or modify the database — always use tools.
* If a tool returns no availability, tell the patient and ask for another suitable option.
* Before booking, make sure you have: patient, service (test_type_id or package_id), company_id, date, and exact slot datetime from getAvailableSlots. Include doctor_id when required.
* If information is missing, ask the patient for it.
* If the patient gives multiple pieces of information in one message, extract all of them before asking another question.
* Prefer pay_on_visit unless the patient asks to pay online.
* Be concise and friendly. Do not mention tool names to the patient.

## Appointment Flow

1. Extract service / date / time window from the message.
2. Call checkServiceAvailability.
3. Call checkDoctorAvailability with date and time range.
4. Call getAvailableSlots for the chosen centre (and doctor if needed).
5. Ask the patient which slot they prefer.
6. After they pick a slot, call findPatient if needed, then bookAppointment with the exact datetime from getAvailableSlots.
7. Confirm only if bookAppointment returns success=true and include the appointment_id.
PROMPT;

    public function __construct(
        private AppointmentAssistantTools $tools,
    ) {}

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     * @return array{reply: string, booked: bool, appointment_id: int|null, tool_trace: array<int, array<string, mixed>>}
     */
    public function chat(Patient $patient, array $messages): array
    {
        $apiKey = config('services.gemini.api_key');
        if (! filled($apiKey)) {
            throw new RuntimeException('GEMINI_API_KEY is not configured on the server.');
        }

        $model = (string) config('services.gemini.model', 'gemini-3.8-flash');
        $maxRounds = max(1, (int) config('services.gemini.max_tool_rounds', 8));

        $systemText = self::SYSTEM_PROMPT."\n\nLogged-in patient context (do not invent other identities): "
            .json_encode([
                'id' => $patient->id,
                'name' => $patient->name,
                'phone' => $patient->phone,
                'email' => $patient->email,
                'today' => now(config('app.timezone'))->toDateString(),
                'timezone' => config('app.timezone'),
            ], JSON_UNESCAPED_UNICODE);

        $contents = [];
        foreach ($messages as $msg) {
            $content = trim((string) ($msg['content'] ?? ''));
            if ($content === '') {
                continue;
            }
            $role = ($msg['role'] ?? '') === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $content]],
            ];
        }

        if ($contents === []) {
            return [
                'reply' => 'How can I help you book an appointment today?',
                'booked' => false,
                'appointment_id' => null,
                'tool_trace' => [],
            ];
        }

        // Gemini requires the first content role to be "user".
        if (($contents[0]['role'] ?? '') !== 'user') {
            array_unshift($contents, [
                'role' => 'user',
                'parts' => [['text' => 'Hello']],
            ]);
        }

        $toolTrace = [];
        $booked = false;
        $appointmentId = null;

        for ($round = 0; $round < $maxRounds; $round++) {
            $response = $this->generateContent($apiKey, $model, $systemText, $contents);
            $candidate = $response['candidates'][0] ?? null;
            $parts = $candidate['content']['parts'] ?? [];

            if ($parts === []) {
                $block = $response['promptFeedback']['blockReason'] ?? null;
                throw new RuntimeException($block
                    ? "Gemini blocked the request ({$block})."
                    : 'Empty response from Gemini.');
            }

            $functionCalls = [];
            $textChunks = [];

            foreach ($parts as $part) {
                if (isset($part['functionCall']['name'])) {
                    $functionCalls[] = $part['functionCall'];
                }
                if (isset($part['text']) && is_string($part['text']) && trim($part['text']) !== '') {
                    $textChunks[] = trim($part['text']);
                }
            }

            if ($functionCalls === []) {
                $reply = trim(implode("\n", $textChunks));

                return [
                    'reply' => $reply !== '' ? $reply : 'How can I help you book an appointment today?',
                    'booked' => $booked,
                    'appointment_id' => $appointmentId,
                    'tool_trace' => $toolTrace,
                ];
            }

            // Append model turn (may include text + function calls).
            $contents[] = [
                'role' => 'model',
                'parts' => $parts,
            ];

            $functionResponseParts = [];

            foreach ($functionCalls as $call) {
                $name = (string) ($call['name'] ?? '');
                $arguments = $call['args'] ?? [];
                if (! is_array($arguments)) {
                    $arguments = [];
                }

                try {
                    $result = $this->tools->call($name, $arguments, $patient);
                } catch (\Throwable $e) {
                    Log::warning('Appointment assistant tool failed', [
                        'tool' => $name,
                        'error' => $e->getMessage(),
                    ]);
                    $result = ['success' => false, 'error' => $e->getMessage()];
                }

                if ($name === 'bookAppointment' && ($result['success'] ?? false)) {
                    $booked = true;
                    $appointmentId = isset($result['appointment_id']) ? (int) $result['appointment_id'] : null;
                }

                $toolTrace[] = [
                    'tool' => $name,
                    'arguments' => $arguments,
                    'result' => $result,
                ];

                $functionResponseParts[] = [
                    'functionResponse' => [
                        'name' => $name,
                        'response' => $result,
                    ],
                ];
            }

            $contents[] = [
                'role' => 'user',
                'parts' => $functionResponseParts,
            ];
        }

        return [
            'reply' => 'I need a bit more detail to continue. Please tell me the service, preferred date, and time window.',
            'booked' => $booked,
            'appointment_id' => $appointmentId,
            'tool_trace' => $toolTrace,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $contents
     * @return array<string, mixed>
     */
    private function generateContent(string $apiKey, string $model, string $systemText, array $contents): array
    {
        $attempts = 3;
        $delayMs = 1500;
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            .rawurlencode($model)
            .':generateContent';

        $payload = [
            'systemInstruction' => [
                'parts' => [['text' => $systemText]],
            ],
            'contents' => $contents,
            'tools' => [
                [
                    'functionDeclarations' => $this->tools->geminiDeclarations(),
                ],
            ],
            'toolConfig' => [
                'functionCallingConfig' => [
                    'mode' => 'AUTO',
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.2,
            ],
        ];

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            // Use x-goog-api-key (not Authorization: Bearer) — required for AQ./AI Studio keys.
            $response = Http::timeout(60)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $apiKey,
                ])
                ->post($url, $payload);

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            $status = $response->status();
            $body = $response->json();
            $message = (string) data_get($body, 'error.message', $response->body());

            Log::warning('Gemini API error', [
                'attempt' => $attempt,
                'status' => $status,
                'message' => $message,
                'model' => $model,
            ]);

            if (in_array($status, [429, 503], true) && $attempt < $attempts) {
                usleep($delayMs * 1000);
                $delayMs *= 2;
                continue;
            }

            if ($status === 429) {
                throw new RuntimeException(
                    'The booking assistant is busy right now (Gemini rate limit). Please wait a minute and try again, or book from the Centres page.'
                );
            }

            if ($status === 401 || $status === 403) {
                throw new RuntimeException(
                    'Gemini API key was rejected. Create a Gemini API key in Google AI Studio and set GEMINI_API_KEY in .env (use x-goog-api-key style keys).'
                );
            }

            throw new RuntimeException('Gemini error: '.$message);
        }

        throw new RuntimeException('Unable to reach the booking assistant right now.');
    }
}

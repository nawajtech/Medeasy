<?php

namespace App\Services\AppointmentAssistant;

use App\Models\Patient;
use Illuminate\Support\Facades\Log;
use OpenAI\Factory;
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
        $apiKey = config('services.openai.api_key');
        if (! filled($apiKey)) {
            throw new RuntimeException('OPENAI_API_KEY is not configured on the server.');
        }

        $client = (new Factory)->withApiKey($apiKey)->make();
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $maxRounds = max(1, (int) config('services.openai.max_tool_rounds', 8));

        $history = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
            [
                'role' => 'system',
                'content' => 'Logged-in patient context (do not invent other identities): '
                    .json_encode([
                        'id' => $patient->id,
                        'name' => $patient->name,
                        'phone' => $patient->phone,
                        'email' => $patient->email,
                        'today' => now(config('app.timezone'))->toDateString(),
                        'timezone' => config('app.timezone'),
                    ]),
            ],
        ];

        foreach ($messages as $msg) {
            $role = ($msg['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = trim((string) ($msg['content'] ?? ''));
            if ($content === '') {
                continue;
            }
            $history[] = ['role' => $role, 'content' => $content];
        }

        $toolTrace = [];
        $booked = false;
        $appointmentId = null;

        for ($round = 0; $round < $maxRounds; $round++) {
            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $history,
                'tools' => $this->tools->definitions(),
                'tool_choice' => 'auto',
                'temperature' => 0.2,
            ]);

            $choice = $response->choices[0] ?? null;
            if (! $choice) {
                throw new RuntimeException('Empty response from AI model.');
            }

            $message = $choice->message;
            $toolCalls = $message->toolCalls ?? [];

            if ($toolCalls === [] || $toolCalls === null) {
                $reply = trim((string) ($message->content ?? ''));

                return [
                    'reply' => $reply !== '' ? $reply : 'How can I help you book an appointment today?',
                    'booked' => $booked,
                    'appointment_id' => $appointmentId,
                    'tool_trace' => $toolTrace,
                ];
            }

            $assistantMessage = [
                'role' => 'assistant',
                'content' => $message->content,
                'tool_calls' => [],
            ];

            foreach ($toolCalls as $call) {
                $assistantMessage['tool_calls'][] = [
                    'id' => $call->id,
                    'type' => 'function',
                    'function' => [
                        'name' => $call->function->name,
                        'arguments' => $call->function->arguments,
                    ],
                ];
            }

            $history[] = $assistantMessage;

            foreach ($toolCalls as $call) {
                $name = $call->function->name;
                $rawArgs = $call->function->arguments ?? '{}';
                $arguments = json_decode($rawArgs, true);
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

                $history[] = [
                    'role' => 'tool',
                    'tool_call_id' => $call->id,
                    'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        return [
            'reply' => 'I need a bit more detail to continue. Please tell me the service, preferred date, and time window.',
            'booked' => $booked,
            'appointment_id' => $appointmentId,
            'tool_trace' => $toolTrace,
        ];
    }
}

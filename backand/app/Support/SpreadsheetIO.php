<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SpreadsheetIO
{
    public static function exportExcel(string $filename, array $headers, callable $rows): StreamedResponse
    {
        if (! str_ends_with(strtolower($filename), '.xls')) {
            $filename .= '.xls';
        }

        return response()->streamDownload(function () use ($headers, $rows) {
            echo '<?xml version="1.0" encoding="UTF-8"?>'."\n";
            echo '<?mso-application progid="Excel.Sheet"?>'."\n";
            echo '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
            echo 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'."\n";
            echo '<Worksheet ss:Name="Sheet1"><Table>'."\n";

            self::writeXmlRow($headers);

            foreach ($rows() as $row) {
                self::writeXmlRow($row);
            }

            echo '</Table></Worksheet></Workbook>';
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }

    /** @param  array<int, array<int, mixed>>  $sampleRows */
    public static function exportTemplate(string $filename, array $headers, array $sampleRows = []): StreamedResponse
    {
        return self::exportExcel($filename, $headers, function () use ($sampleRows) {
            foreach ($sampleRows as $row) {
                yield $row;
            }
        });
    }

    /** @return array{headers: array<int, string>, rows: array<int, array<int, string>>} */
    public static function readUploadedFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'csv', 'txt' => self::readCsv($file->getRealPath()),
            'xls' => self::readExcelXml($file->getRealPath()),
            default => throw new \InvalidArgumentException('Unsupported file type. Upload a .csv or .xls file exported from Excel.'),
        };
    }

    public static function normalizeHeader(string $header): string
    {
        $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
        $header = strtolower(trim($header));
        $header = preg_replace('/[^\w]+/', '_', $header) ?? $header;

        return trim($header, '_');
    }

    public static function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    /** @param  array<string, int>  $columnMap */
    public static function cell(array $row, array $columnMap, string $key): string
    {
        if (! isset($columnMap[$key])) {
            return '';
        }

        return trim((string) ($row[$columnMap[$key]] ?? ''));
    }

    /** @param  array<int, string>  $headers */
    public static function mapHeaders(array $headers, array $aliases): array
    {
        $map = [];

        foreach ($headers as $index => $header) {
            $key = self::normalizeHeader((string) $header);

            foreach ($aliases as $field => $names) {
                if (in_array($key, $names, true)) {
                    $map[$field] = $index;
                }
            }
        }

        return $map;
    }

    private static function writeXmlRow(array $cells): void
    {
        echo '<Row>';

        foreach ($cells as $cell) {
            $value = self::xmlEscape((string) $cell);
            $type = is_numeric($cell) && $cell !== '' && ! str_contains((string) $cell, ' ')
                ? 'Number'
                : 'String';
            echo "<Cell><Data ss:Type=\"{$type}\">{$value}</Data></Cell>";
        }

        echo '</Row>'."\n";
    }

    private static function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /** @return array{headers: array<int, string>, rows: array<int, array<int, string>>} */
    private static function readCsv(string $path): array
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            throw new \RuntimeException('Could not read uploaded file.');
        }

        $headerRow = fgetcsv($handle);

        if (! $headerRow) {
            fclose($handle);

            throw new \RuntimeException('Spreadsheet file is empty.');
        }

        $rows = [];

        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }

        fclose($handle);

        return [
            'headers' => array_map('strval', $headerRow),
            'rows' => $rows,
        ];
    }

    /** @return array{headers: array<int, string>, rows: array<int, array<int, string>>} */
    private static function readExcelXml(string $path): array
    {
        $xml = @simplexml_load_file($path);

        if ($xml === false) {
            throw new \RuntimeException('Could not parse Excel file.');
        }

        $xml->registerXPathNamespace('ss', 'urn:schemas-microsoft-com:office:spreadsheet');
        $rowNodes = $xml->xpath('//ss:Worksheet/ss:Table/ss:Row') ?: [];

        $headers = [];
        $rows = [];

        foreach ($rowNodes as $index => $rowNode) {
            $cells = self::parseXmlRow($rowNode);

            if ($index === 0) {
                $headers = $cells;
                continue;
            }

            if (self::isEmptyRow($cells)) {
                continue;
            }

            $rows[] = $cells;
        }

        if (count($headers) === 0) {
            throw new \RuntimeException('Spreadsheet file is empty.');
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    /** @return array<int, string> */
    private static function parseXmlRow(\SimpleXMLElement $rowNode): array
    {
        $rowNode->registerXPathNamespace('ss', 'urn:schemas-microsoft-com:office:spreadsheet');
        $cellNodes = $rowNode->xpath('ss:Cell') ?: [];
        $cells = [];
        $column = 0;

        foreach ($cellNodes as $cellNode) {
            $attributes = $cellNode->attributes('urn:schemas-microsoft-com:office:spreadsheet');
            $targetIndex = isset($attributes['Index']) ? (int) $attributes['Index'] - 1 : $column;

            while (count($cells) < $targetIndex) {
                $cells[] = '';
            }

            $dataNode = $cellNode->children('urn:schemas-microsoft-com:office:spreadsheet')->Data ?? null;
            $cells[$targetIndex] = $dataNode !== null ? trim((string) $dataNode) : '';
            $column = max($column, $targetIndex + 1);
        }

        return $cells;
    }
}

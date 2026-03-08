#!/usr/bin/env python3
"""
OpenAI Batch helper for TradeMatch localized SEO workflow.

Flow:
1) Upload JSONL as Files API input
2) Create Batch job for /v1/chat/completions
3) Poll until terminal status
4) Download output/error files
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib import request, error

API_BASE = 'https://api.openai.com/v1'


def _headers(api_key, content_type='application/json'):
    headers = {
        'Authorization': f'Bearer {api_key}',
    }
    if content_type:
        headers['Content-Type'] = content_type
    return headers


def _http_json(method, path, api_key, payload=None):
    url = f'{API_BASE}{path}'
    data = None
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')

    req = request.Request(url, method=method, headers=_headers(api_key), data=data)
    with request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode('utf-8'))


def _multipart_form_data(fields, file_field_name, file_name, file_bytes):
    boundary = '----tm-boundary-20260307'
    lines = []

    for key, value in fields.items():
        lines.append(f'--{boundary}')
        lines.append(f'Content-Disposition: form-data; name="{key}"')
        lines.append('')
        lines.append(str(value))

    lines.append(f'--{boundary}')
    lines.append(
        f'Content-Disposition: form-data; name="{file_field_name}"; filename="{file_name}"'
    )
    lines.append('Content-Type: application/jsonl')
    lines.append('')

    body = '\r\n'.join(lines).encode('utf-8') + b'\r\n' + file_bytes + b'\r\n'
    body += f'--{boundary}--\r\n'.encode('utf-8')
    content_type = f'multipart/form-data; boundary={boundary}'
    return content_type, body


def upload_input_file(api_key, input_file):
    file_bytes = input_file.read_bytes()
    content_type, body = _multipart_form_data(
        fields={'purpose': 'batch'},
        file_field_name='file',
        file_name=input_file.name,
        file_bytes=file_bytes,
    )

    req = request.Request(
        f'{API_BASE}/files',
        method='POST',
        headers=_headers(api_key, content_type=content_type),
        data=body,
    )
    with request.urlopen(req, timeout=120) as res:
        return json.loads(res.read().decode('utf-8'))


def create_batch(api_key, input_file_id, completion_window):
    payload = {
        'input_file_id': input_file_id,
        'endpoint': '/v1/chat/completions',
        'completion_window': completion_window,
    }
    return _http_json('POST', '/batches', api_key, payload=payload)


def get_batch(api_key, batch_id):
    return _http_json('GET', f'/batches/{batch_id}', api_key)


def download_file_content(api_key, file_id):
    req = request.Request(
        f'{API_BASE}/files/{file_id}/content',
        method='GET',
        headers=_headers(api_key, content_type=None),
    )
    with request.urlopen(req, timeout=120) as res:
        return res.read()


def wait_for_completion(api_key, batch_id, interval_seconds, timeout_seconds):
    terminal = {'completed', 'failed', 'expired', 'cancelled'}
    started = time.time()

    while True:
        batch = get_batch(api_key, batch_id)
        status = batch.get('status')
        print(f'Batch status: {status}')
        if status in terminal:
            return batch

        elapsed = time.time() - started
        if elapsed > timeout_seconds:
            raise TimeoutError(
                f'Batch {batch_id} did not complete within {timeout_seconds} seconds.'
            )

        time.sleep(interval_seconds)


def parse_args():
    parser = argparse.ArgumentParser(description='Run OpenAI Batch end-to-end for JSONL requests')
    parser.add_argument(
        '--input-jsonl',
        required=True,
        help='Path to OpenAI Batch request JSONL file',
    )
    parser.add_argument(
        '--output-dir',
        default='./batch',
        help='Directory to store batch metadata and downloaded output files',
    )
    parser.add_argument(
        '--completion-window',
        default='24h',
        choices=['24h'],
        help='OpenAI Batch completion window',
    )
    parser.add_argument(
        '--poll-interval',
        type=int,
        default=30,
        help='Polling interval in seconds',
    )
    parser.add_argument(
        '--timeout-seconds',
        type=int,
        default=172800,
        help='Max total wait time in seconds (default 48h)',
    )
    parser.add_argument(
        '--batch-id-only',
        action='store_true',
        help='Create batch and print batch_id without waiting',
    )
    return parser.parse_args()


def main():
    args = parse_args()

    api_key = os.getenv('OPENAI_API_KEY', '').strip()
    if not api_key:
        print('ERROR: OPENAI_API_KEY is not set in environment.')
        return 1

    input_jsonl = Path(args.input_jsonl).resolve()
    if not input_jsonl.exists():
        print(f'ERROR: Input JSONL not found: {input_jsonl}')
        return 1

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        print(f'Uploading batch input file: {input_jsonl}')
        uploaded = upload_input_file(api_key, input_jsonl)
        input_file_id = uploaded.get('id')
        if not input_file_id:
            print('ERROR: Failed to retrieve input file id from upload response.')
            return 1
        print(f'Uploaded input_file_id: {input_file_id}')

        print('Creating batch job...')
        batch = create_batch(api_key, input_file_id, args.completion_window)
        batch_id = batch.get('id')
        if not batch_id:
            print('ERROR: Failed to retrieve batch id.')
            return 1

        (output_dir / f'batch-{batch_id}-created.json').write_text(
            json.dumps(batch, indent=2), encoding='utf-8'
        )

        print(f'Batch created: {batch_id}')
        if args.batch_id_only:
            print(batch_id)
            return 0

        final_batch = wait_for_completion(
            api_key,
            batch_id,
            interval_seconds=args.poll_interval,
            timeout_seconds=args.timeout_seconds,
        )

        (output_dir / f'batch-{batch_id}-final.json').write_text(
            json.dumps(final_batch, indent=2), encoding='utf-8'
        )

        status = final_batch.get('status')
        print(f'Final batch status: {status}')

        output_file_id = final_batch.get('output_file_id')
        error_file_id = final_batch.get('error_file_id')

        if output_file_id:
            output_bytes = download_file_content(api_key, output_file_id)
            out_path = output_dir / f'batch-{batch_id}-output.jsonl'
            out_path.write_bytes(output_bytes)
            print(f'Downloaded output JSONL: {out_path}')

        if error_file_id:
            error_bytes = download_file_content(api_key, error_file_id)
            err_path = output_dir / f'batch-{batch_id}-errors.jsonl'
            err_path.write_bytes(error_bytes)
            print(f'Downloaded error JSONL: {err_path}')

        if status != 'completed':
            print('Batch finished but not completed successfully. Check final metadata/errors.')
            return 2

        return 0

    except error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        print(f'HTTP ERROR: {exc.code} {exc.reason}')
        print(detail)
        return 1
    except TimeoutError as exc:
        print(f'TIMEOUT: {exc}')
        return 1
    except Exception as exc:
        print(f'ERROR: {exc}')
        return 1


if __name__ == '__main__':
    sys.exit(main())

# OpenAI Batch Workflow (AI-authored snippets)

This workflow is file-based and scalable for large page counts.

## 1) Export batch request JSONL

Generate requests for the same target slice you want to build (example: first 100 pages):

```powershell
c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py `
  --yes `
  --max-pages 100 `
  --openai-batch-export-file ./batch/openai-requests-100.jsonl `
  --batch-export-only
```

## 2) Submit JSONL to OpenAI Batch API

Use your preferred OpenAI client/CLI to upload `openai-requests-100.jsonl` and run a batch job.

Or use the included helper to run upload -> create -> poll -> download in one command:

```powershell
$env:OPENAI_API_KEY="your_openai_key"
c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe openai_batch_runner.py `
  --input-jsonl ./batch/openai-requests-100.jsonl `
  --output-dir ./batch
```

This writes:
- `batch-<id>-created.json`
- `batch-<id>-final.json`
- `batch-<id>-output.jsonl` (when available)
- `batch-<id>-errors.jsonl` (if any)

Expected output format: JSONL where each line contains:
- `custom_id` like `plumbing|london`
- `response.body.choices[0].message.content` containing JSON with keys:
  - `meta_description`
  - `hero_subheadline`
  - `local_intro_p1`
  - `local_intro_p2`
  - `local_insight`
  - `service_lore`

## 3) Generate pages with AI snippets

Prefer mode (fallback to deterministic text if a snippet is missing):

```powershell
c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py `
  --yes `
  --max-pages 100 `
  --openai-batch-results-file ./batch/batch-<id>-output.jsonl `
  --ai-snippet-mode prefer
```

Require mode (fail if any snippet is missing):

```powershell
c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py `
  --yes `
  --max-pages 100 `
  --openai-batch-results-file ./batch/batch-<id>-output.jsonl `
  --ai-snippet-mode require
```

## 4) Validate output

```powershell
c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe validate_output.py --output-dir ./generated-pages --sample-size 100
```

## Notes

- This does not make live API calls during generation.
- Batch export is deterministic for the selected target pages.
- `--ai-snippet-mode off` disables AI snippets completely.

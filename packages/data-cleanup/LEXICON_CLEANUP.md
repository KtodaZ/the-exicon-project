# Lexicon Cleanup Tools

This document explains how to use the lexicon cleanup tools to clean up HTML formatting and improve the Description fields of lexicon items while preserving all original content and F3 terminology.

## Overview

The lexicon cleanup tools are designed to:
- Remove HTML tags, styling, and formatting artifacts from lexicon descriptions
- Clean up font family specifications and color attributes
- Fix HTML entity encoding issues
- Preserve all original text content, meaning, and F3 terminology
- Maintain the authentic voice and humor from the original authors

## Available Commands

### 1. Basic Lexicon Cleanup
```bash
cd packages/data-cleanup
pnpm run build
pnpm run lexicon:cleanup
```
This processes lexicon items in batches and creates proposals for review.

### 2. Bulk Auto-Cleanup (Recommended)
```bash
pnpm run lexicon:bulk-cleanup
```
This processes ALL lexicon items automatically, auto-applying high-confidence changes (>0.8) and saving lower-confidence changes for review.

### 3. Review Proposals
```bash
pnpm run lexicon:review
```
Shows all pending lexicon cleanup proposals that need manual review.

### 4. Approve Individual Proposals
```bash
pnpm run lexicon:approve <proposalId>
```
Approves and applies a specific proposal by ID.

## What Gets Cleaned Up

The cleanup process targets these issues in lexicon descriptions:

### Before (with HTML artifacts):
```
<p style="margin-left: 0px!important"><span style="color: rgb(0, 0, 0); font-family: docs-Calibri; font-size: 15px">Short for After Action Report</span></p>
```

### After (clean):
```
Short for After Action Report
```

### Common Issues Fixed:
- HTML tags (`<p>`, `<span>`, etc.)
- Style attributes (`style="..."`)
- Font specifications (`font-family: Calibri, Arial`)
- Color attributes (`color: rgb(0, 0, 0)`)
- HTML entities (`&nbsp;`, `&amp;`, etc.)
- Margin and padding specifications

## What Gets Preserved

The cleanup process carefully preserves:
- All original text content and meaning
- F3-specific terminology and acronyms
- Regional references and culture
- Author's voice, humor, and personality
- Proper capitalization and punctuation
- All abbreviations and special terms

## Configuration

The cleanup uses these settings:
- **Model**: `gpt-4o-mini` (fast and cost-effective)
- **Temperature**: `0.1` (very low for consistent, conservative formatting)
- **Batch Size**: `20` items at a time
- **Auto-approve**: Changes with >0.8 confidence
- **Max Tokens**: `300` per request

## Safety Features

- **Batch Processing**: Handles items in small batches to avoid overwhelming the API
- **Rate Limiting**: Includes delays between API calls
- **Confidence Thresholds**: Only auto-applies high-confidence changes
- **Proposal System**: Lower-confidence changes are saved for manual review
- **Processing Limits**: Stops after 1000 items for safety
- **Preserve Originals**: Never deletes original content

## Workflow

1. **Start with Bulk Cleanup**: Use `pnpm run lexicon:bulk-cleanup` to process most items automatically
2. **Review Proposals**: Use `pnpm run lexicon:review` to see items that need manual review
3. **Approve Good Proposals**: Use `pnpm run lexicon:approve <id>` for proposals you want to apply
4. **Repeat as Needed**: Run cleanup again to process any remaining items

## Expected Results

After cleanup, lexicon descriptions will be:
- Clean and readable without HTML artifacts
- Properly formatted with correct punctuation
- Consistent in style while preserving original voice
- Free of font specifications and styling remnants
- Maintaining all F3 terminology and cultural references

## Example Transformations

| Before | After |
|--------|-------|
| `<span style="font-family: Calibri">Short for King Of Birds.</span>` | `Short for King Of Birds.` |
| `<p style="margin-left: 0px">An F3 exercise Event.</p>` | `An F3 exercise Event.` |
| `Building a Leadership Road forty-three feet ahead&nbsp;of the people` | `Building a Leadership Road forty-three feet ahead of the people` |

## Monitoring Progress

The tools provide detailed feedback:
- Batch processing progress
- Success/failure counts
- Confidence scores for each change
- Reasons for proposed changes
- Total items processed

This ensures you can monitor the cleanup progress and quality of the results. 
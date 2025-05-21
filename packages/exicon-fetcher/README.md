# Exicon Fetcher

A utility package to fetch and store exercise lexicon (Exicon) data from the F3 Nation API.

## Features

- Fetches the complete list of exercise data from the API
- Performs individual lookups for detailed content of each exercise
- Extracts and stores video URLs when available
- Organizes data in JSON format for easy consumption
- Enhances exercise data using Vercel AI SDK with tool calling for efficient processing

## Usage

1. Make sure you have set your OpenAI API key in a `.env` file:
   ```
   OPENAI_API_KEY=your-api-key
   ```

2. Install dependencies and build the package:
   ```
   pnpm install
   pnpm build
   ```

3. Check if all dependencies are installed correctly:
   ```
   pnpm check-deps
   ```
   This will verify that:
   - All required npm packages are installed
   - The OpenAI API key is set
   - The data directory exists
   - Any existing data files are valid

4. To fetch Exicon data:
   ```
   pnpm fetch
   ```
   This will:
   - Fetch all exercise data from the F3 Nation API
   - Store the data in the `data` directory
   - Extract video URLs from the HTML content
   - Save data in JSON and CSV formats

5. To enhance Exicon data using batch processing:
   ```
   # Test batch processing on a subset of items
   pnpm test
   
   # Process all items in batches
   pnpm enhance
   ```
   This will:
   - Process multiple items in a single API call
   - Reduce token usage and API calls
   - Save the enhanced data with additional metadata fields

6. To run a demo of the OpenAI API with function calling:
   ```
   pnpm demo-ai
   ```
   This demonstrates how the OpenAI API processes a single exercise item.

## Working with the Enhanced Data

The enhanced data can be found in the following files:

### Batch Enhancement:
- JSON: `data/all-exicon-items-batch-revised.json`
- CSV: `data/all-exicon-items-batch-revised.csv`

The enhanced data includes:
- All original fields from the F3 Exicon
- AI-generated aliases
- Tags categorizing each exercise
- Confidence scores for tag assignments
- Quality scores for descriptions
- Difficulty ratings (0-1 scale)
- Time estimates (in minutes)
- Author information when available

## Troubleshooting

### OpenAI Response Quality Issues

If you're getting empty or low-quality results from the OpenAI API:

1. **Check the debug logs**: The enhancer saves all API requests and responses in the `data/debug` directory. Review the files to see what data is being sent and received.

2. **Reduce batch size**: If the model is not processing all items in a batch, reduce the batch size in `src/enhanceBatchExicon.ts`:
   ```typescript
   async function enhanceExiconDataBatch(inputFilePath?: string, batchSize: number = 2): Promise<void> {
   ```

3. **Check your API key**: Ensure your OpenAI API key in the `.env` file is valid and has sufficient quota.

4. **Review the prompts**: You can modify the prompt in `src/enhanceBatchExicon.ts` to provide better instructions or examples for the model.

5. **Increase max_tokens**: If the model is truncating responses for large batches, increase the `max_tokens` parameter.

## Technology

- Vercel AI SDK
- OpenAI GPT-4o
- Node.js
- TypeScript

## APIs Used

- F3 Nation List API: Used to fetch the list of exercises
- F3 Nation Content API: Used to fetch the details of each exercise
- OpenAI API (via Vercel AI SDK): Used to enhance exercise metadata

## License

MIT 
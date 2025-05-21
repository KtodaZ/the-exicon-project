/**
 * JSON parsing utilities for handling potentially truncated or malformed responses from AI APIs
 */

/**
 * Attempts to parse potentially malformed JSON from an API response
 * using multiple fallback strategies
 * 
 * @param argumentsText - Raw JSON string that might be malformed
 * @param finishReason - The finish reason from the API response
 * @param resultsKey - The key containing the results array
 * @returns Parsed JSON object or null if parsing failed
 */
export function parseToolCallArguments(
  argumentsText: string | undefined,
  finishReason: string | undefined,
  resultsKey: string = "results"
): any {
  if (!argumentsText) {
    console.error("Empty arguments text, nothing to parse");
    return null;
  }

  // Check for truncation
  const isTruncated = finishReason === "length";
  if (isTruncated) {
    console.warn("⚠️ Warning: Response was truncated due to token limit!");
    argumentsText = fixTruncatedJson(argumentsText, resultsKey);
  }

  // Try direct parsing first
  try {
    const parsed = JSON.parse(argumentsText);
    console.log("Successfully parsed JSON directly");
    return parsed;
  } catch (parseError) {
    console.error(`Direct parsing failed:`, parseError);
    // Attempt fallback parsing methods
    return attemptFallbackParsing(argumentsText, resultsKey);
  }
}

/**
 * Attempts to fix truncated JSON by completing closing brackets
 * or finding the last complete object
 */
function fixTruncatedJson(argumentsText: string, resultsKey: string): string {
  // If it ends with a comma or doesn't have closing braces, try to fix it
  if (!argumentsText.trim().endsWith(']}"}') && !argumentsText.trim().endsWith(']}')) {
    console.log("Attempting to fix truncated JSON...");
    
    // Add missing closing brackets if needed
    // First find how many opening { and [ without matching closing ones
    let openBraces = (argumentsText.match(/\{/g) || []).length - (argumentsText.match(/\}/g) || []).length;
    let openBrackets = (argumentsText.match(/\[/g) || []).length - (argumentsText.match(/\]/g) || []).length;
    
    console.log(`Found ${openBraces} unclosed braces and ${openBrackets} unclosed brackets`);
    
    // Find the last complete result object by looking for },{ pattern
    const lastResultMatch = argumentsText.match(/\}\s*,\s*\{\s*"external_id"\s*:/g);
    if (lastResultMatch && lastResultMatch.length > 0) {
      // We know this is a string and lastResultMatch exists, safe to access
      const lastMatchString = lastResultMatch[lastResultMatch.length - 1] as string;
      const lastMatchPos = argumentsText.lastIndexOf(lastMatchString);
      
      // Cut off at the last complete result
      argumentsText = argumentsText.substring(0, lastMatchPos) + "}]}";
      console.log("Fixed JSON by cutting at the last complete result");
    } else {
      // If we can't find a pattern, just add closing brackets
      while (openBraces > 0) {
        argumentsText += '}';
        openBraces--;
      }
      while (openBrackets > 0) {
        argumentsText += ']';
        openBrackets--;
      }
      console.log("Fixed JSON by adding missing closing brackets");
    }
  }
  
  return argumentsText;
}

/**
 * Attempts fallback parsing methods when direct parsing fails
 */
function attemptFallbackParsing(argumentsText: string, resultsKey: string): any {
  // Try extracting just the results array
  console.log("Attempting to extract results array...");
  
  try {
    // Look for the results array pattern
    const resultMatch = argumentsText.match(new RegExp(`"${resultsKey}"\\s*:\\s*(\\[.*\\])`, 's'));
    if (resultMatch && resultMatch[1]) {
      const resultsArrayText = resultMatch[1];
      
      // Try the character-by-character parser
      const parsedObjects = parseArrayByCharacters(resultsArrayText);
      if (parsedObjects && parsedObjects.length > 0) {
        const result: any = {};
        result[resultsKey] = parsedObjects;
        return result;
      }
      
      // If character parsing failed, try to extract individual objects
      const individualObjects = extractIndividualObjects(argumentsText, "external_id");
      if (individualObjects && individualObjects.length > 0) {
        const result: any = {};
        result[resultsKey] = individualObjects;
        return result;
      }
    }
  } catch (regexError) {
    console.error("Failed regex extraction:", regexError);
  }
  
  console.error("All parsing attempts failed");
  return null;
}

/**
 * Parses an array text character by character to find complete objects
 */
function parseArrayByCharacters(arrayText: string): any[] | null {
  // Find the last valid JSON object (in case array is truncated)
  let validJson = "";
  let bracketCount = 0;
  let inObject = false;
  let objectStart = 0;
  
  // Parse character by character to find valid objects
  for (let i = 0; i < arrayText.length; i++) {
    const char = arrayText[i];
    if (char === '{') {
      if (!inObject) {
        inObject = true;
        objectStart = i;
      }
      bracketCount++;
    } else if (char === '}') {
      bracketCount--;
      if (bracketCount === 0 && inObject) {
        // We found a complete object
        validJson += arrayText.substring(objectStart, i + 1) + ",";
        inObject = false;
      }
    }
  }
  
  // Remove the trailing comma and wrap in array brackets
  if (validJson.endsWith(",")) {
    validJson = validJson.slice(0, -1);
  }
  validJson = "[" + validJson + "]";
  
  // Try to parse the extracted objects
  try {
    const validResults = JSON.parse(validJson);
    console.log(`Successfully extracted ${validResults.length} complete result objects`);
    return validResults;
  } catch (validJsonError) {
    console.error("Failed to parse extracted objects:", validJsonError);
    return null;
  }
}

/**
 * Last resort extraction of individual objects using regex
 */
function extractIndividualObjects(text: string, idField: string): any[] | null {
  // As a last resort, try finding and parsing individual objects
  const objectRegex = new RegExp(`\\{\\s*"${idField}"\\s*:[^}]+\\}`, 'g');
  const matches = text.match(objectRegex) || [];
  
  if (matches.length > 0) {
    try {
      const validObjects = matches.map(m => {
        // Make sure each object is properly terminated and has required fields
        if (!m.endsWith('}')) m += '}';
        // Try to parse individual object
        try {
          return JSON.parse(m);
        } catch {
          // Skip invalid objects
          return null;
        }
      }).filter(Boolean);
      
      console.log(`Extracted ${validObjects.length} individual result objects`);
      return validObjects;
    } catch (regexError) {
      console.error("Failed to extract individual objects:", regexError);
      return null;
    }
  }
  
  return null;
} 
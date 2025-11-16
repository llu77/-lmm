export interface CommentUpdateInput {
  currentBody: string;
  actionFailed: boolean;
  executionDetails: {
    duration_ms?: number;
    cost_usd?: number;
    duration_api_ms?: number;
  } | null;
  jobUrl: string;
  branchName?: string;
  branchLink?: string;
  prLink?: string;
  triggerUsername?: string;
  errorDetails?: string;
}

/**
 * Formats duration in milliseconds to a human-readable string
 * @param durationMs Duration in milliseconds
 * @returns Formatted duration string (e.g., "45s", "1m 15s")
 */
function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Extracts username from comment body content
 * Looks for @username patterns in the text
 */
function extractUsername(content: string): string | undefined {
  const usernameMatch = content.match(/@(\w+[-\w]*)/);
  return usernameMatch ? usernameMatch[1] : undefined;
}

/**
 * Extracts branch name from a branch link URL
 * @param branchLink Branch link in format "[View branch](url)"
 * @returns Branch name or undefined
 */
function extractBranchNameFromLink(branchLink: string): string | undefined {
  const match = branchLink.match(/\/tree\/([^\s)]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extracts PR URL from content
 * @param content Comment body content
 * @returns PR URL or undefined
 */
function extractPrUrl(content: string): string | undefined {
  // Match [Create a PR](url) - need to handle nested parentheses in URL
  // Use a more sophisticated approach to find the matching closing paren
  const startPattern = '[Create a PR](';
  const startIndex = content.indexOf(startPattern);
  
  if (startIndex === -1) return undefined;
  
  const urlStart = startIndex + startPattern.length;
  let parenDepth = 1;
  let urlEnd = urlStart;
  
  // Find the matching closing parenthesis
  for (let i = urlStart; i < content.length; i++) {
    if (content[i] === '(') {
      parenDepth++;
    } else if (content[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        urlEnd = i;
        break;
      }
    }
  }
  
  if (parenDepth !== 0) return undefined; // Unmatched parentheses
  
  return content.substring(urlStart, urlEnd);
}

/**
 * Extracts PR URL from prLink parameter
 * @param prLink PR link in format "[Create a PR](url)"
 * @returns PR URL or undefined
 */
function extractPrUrlFromLink(prLink: string): string | undefined {
  const match = prLink.match(/\[Create a PR\]\(([^)]+)\)/);
  return match ? match[1] : undefined;
}

/**
 * Extracts repository owner and name from job URL
 * @param jobUrl GitHub Actions job URL
 * @returns Object with owner and repo, or null if not found
 */
function extractRepoInfo(jobUrl: string): { owner: string; repo: string } | null {
  const match = jobUrl.match(/github\.com\/([^/]+)\/([^/]+)\//);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Encodes a URL by encoding the query parameters properly
 * For already-encoded URLs, returns them as-is
 * For unencoded URLs, properly encodes them using + for spaces
 * @param url URL to encode
 * @returns Encoded URL or null if encoding fails
 */
function encodeUrl(url: string): string | null {
  try {
    // If URL is already encoded, return as-is
    if (url.includes('%20') || url.includes('%3A') || url.includes('%23')) {
      return url;
    }
    
    // Parse the URL
    const urlObj = new URL(url);
    
    // Get the base URL without query string
    const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    
    // Encode query parameters - URLSearchParams naturally uses + for spaces
    const params = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    
    // Convert to string (uses + for spaces by default)
    const queryString = params.toString();
    
    // Reconstruct URL with encoded parameters
    const encodedUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    return encodedUrl;
  } catch {
    // If URL parsing fails, return null
    return null;
  }
}

/**
 * Removes working message patterns from the comment body
 */
function removeWorkingMessage(body: string): string {
  // Remove "Claude Code is working..." with optional spinner image
  return body
    .replace(/Claude Code is working[.…]\s*(?:<img[^>]*>)?\s*/g, '')
    .trim();
}

/**
 * Removes old job links from body
 */
function removeJobLinks(body: string, jobUrl: string): string {
  // Remove [View job run](url) patterns
  const jobUrlEscaped = jobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return body
    .replace(new RegExp(`\\[View job run\\]\\(${jobUrlEscaped}\\)`, 'g'), '')
    .trim();
}

/**
 * Removes old branch links from body
 */
function removeBranchLinks(body: string): string {
  // Remove [View branch](url) patterns
  return body
    .replace(/\[View branch\]\([^)]+\)/g, '')
    .trim();
}

/**
 * Removes PR links from body
 * @param body Comment body
 * @returns Body with PR links removed
 */
function removePrLinks(body: string): string {
  // Remove [Create a PR](url) patterns - handle nested parentheses properly
  const startPattern = '[Create a PR](';
  const startIndex = body.indexOf(startPattern);
  
  if (startIndex === -1) return body;
  
  const urlStart = startIndex + startPattern.length;
  let parenDepth = 1;
  let urlEnd = urlStart;
  
  // Find the matching closing parenthesis
  for (let i = urlStart; i < body.length; i++) {
    if (body[i] === '(') {
      parenDepth++;
    } else if (body[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        urlEnd = i;
        break;
      }
    }
  }
  
  if (parenDepth !== 0) return body; // Unmatched parentheses, don't remove
  
  // Remove the entire [Create a PR](...) pattern including trailing whitespace
  const beforeLink = body.substring(0, startIndex);
  const afterLink = body.substring(urlEnd + 1);
  
  return (beforeLink + afterLink).trim();
}

/**
 * Updates a GitHub comment body with execution results
 * @param input Comment update input parameters
 * @returns Updated comment body
 */
export function updateCommentBody(input: CommentUpdateInput): string {
  const {
    currentBody,
    actionFailed,
    executionDetails,
    jobUrl,
    branchName,
    branchLink,
    prLink,
    triggerUsername,
    errorDetails,
  } = input;

  // Extract username from content if not provided
  const username = triggerUsername || extractUsername(currentBody);

  // Format duration if available
  let durationText = '';
  if (executionDetails?.duration_ms) {
    durationText = formatDuration(executionDetails.duration_ms);
  }

  // Build header message
  let headerMessage = '';
  if (actionFailed) {
    headerMessage = `**Claude encountered an error${durationText ? ` after ${durationText}` : ''}**`;
  } else {
    if (username) {
      headerMessage = `**Claude finished @${username}'s task${durationText ? ` in ${durationText}` : ''}**`;
    } else {
      headerMessage = `**Claude finished the task${durationText ? ` in ${durationText}` : ''}**`;
    }
  }

  // Add job link to header
  headerMessage += ` —— [View job](${jobUrl})`;

  // Extract repository info for branch and PR links
  const repoInfo = extractRepoInfo(jobUrl);

  // Build additional header links
  const headerLinks: string[] = [];

  // Add branch link if available
  if (branchName && repoInfo) {
    const branchUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/tree/${branchName}`;
    headerLinks.push(`• [\`${branchName}\`](${branchUrl})`);
  } else if (branchLink && branchLink.trim()) {
    const extractedBranchName = extractBranchNameFromLink(branchLink);
    if (extractedBranchName && repoInfo) {
      const branchUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/tree/${extractedBranchName}`;
      headerLinks.push(`• [\`${extractedBranchName}\`](${branchUrl})`);
    }
  }

  // Add PR link if available
  // First try to extract from content
  let prUrl = extractPrUrl(currentBody);
  
  if (prUrl) {
    // Try to encode the URL
    const encodedPrUrl = encodeUrl(prUrl);
    if (encodedPrUrl) {
      headerLinks.push(`• [Create PR ➔](${encodedPrUrl})`);
      prUrl = encodedPrUrl; // Use the encoded version
    } else {
      // If encoding fails, fall back to prLink parameter
      const prLinkUrl = prLink ? extractPrUrlFromLink(prLink) : undefined;
      if (prLinkUrl) {
        headerLinks.push(`• [Create PR ➔](${prLinkUrl})`);
        prUrl = undefined; // Don't remove the invalid URL from body
      }
    }
  } else if (prLink) {
    // If no PR link in content, use the provided prLink
    const prLinkUrl = extractPrUrlFromLink(prLink);
    if (prLinkUrl) {
      headerLinks.push(`• [Create PR ➔](${prLinkUrl})`);
    }
  }

  // Build full header
  let header = headerMessage;
  if (headerLinks.length > 0) {
    header += '\n' + headerLinks.join('\n');
  }

  // Clean up the body
  let cleanedBody = currentBody;
  cleanedBody = removeWorkingMessage(cleanedBody);
  cleanedBody = removeJobLinks(cleanedBody, jobUrl);
  cleanedBody = removeBranchLinks(cleanedBody);
  
  // Only remove PR links if we successfully extracted and encoded them
  if (prUrl) {
    cleanedBody = removePrLinks(cleanedBody);
  }

  // Trim and normalize whitespace
  cleanedBody = cleanedBody.trim();

  // Add error details if present
  let errorSection = '';
  if (errorDetails) {
    errorSection = `\n\n\`\`\`\n${errorDetails}\n\`\`\``;
  }

  // Combine header, separator, body, and error details
  const separator = '\n\n---\n';
  const result = header + separator + cleanedBody + errorSection;

  return result;
}

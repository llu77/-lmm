import { useState, useEffect } from 'react';

interface GitHubCodeProps {
  repo: string;
  path: string;
  startLine?: number;
  endLine?: number;
  showLineNumbers?: boolean;
  collapse?: boolean;
  wrap?: boolean;
  title?: string;
  lang?: string;
}

/**
 * GitHubCode Component
 * 
 * عرض كود من مستودع GitHub مباشرة في الوثائق
 * متوافق مع دليل أنماط Cloudflare
 * 
 * @example
 * ```tsx
 * <GitHubCode
 *   repo="cloudflare/cloudflare-docs"
 *   path="src/example.js"
 *   startLine={10}
 *   endLine={30}
 *   showLineNumbers={true}
 * />
 * ```
 */
export function GitHubCode({
  repo,
  path,
  startLine,
  endLine,
  showLineNumbers = true,
  collapse = false,
  wrap = false,
  title,
  lang,
}: GitHubCodeProps) {
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(collapse);

  useEffect(() => {
    async function fetchCode() {
      try {
        setLoading(true);
        setError(null);

        // Fetch file from GitHub API
        const response = await fetch(
          `https://api.github.com/repos/${repo}/contents/${path}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3.raw',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch code: ${response.statusText}`);
        }

        let content = await response.text();

        // Filter by line numbers if specified
        if (startLine !== undefined || endLine !== undefined) {
          const lines = content.split('\n');
          const start = (startLine ?? 1) - 1;
          const end = endLine ?? lines.length;
          content = lines.slice(start, end).join('\n');
        }

        setCode(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch code');
      } finally {
        setLoading(false);
      }
    }

    fetchCode();
  }, [repo, path, startLine, endLine]);

  // Detect language from file extension if not provided
  const detectedLang = lang || path.split('.').pop() || 'text';

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
          <span>جاري تحميل الكود...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>خطأ في تحميل الكود: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* Header */}
      {(title || collapse) && (
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2">
          {title && (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {title}
            </div>
          )}
          {collapse && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label={isCollapsed ? 'عرض الكود' : 'إخفاء الكود'}
            >
              {isCollapsed ? 'عرض' : 'إخفاء'}
            </button>
          )}
        </div>
      )}

      {/* Code Block */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          <pre
            className={`p-4 text-sm ${
              wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            }`}
          >
            <code
              className={`language-${detectedLang} block text-gray-800 dark:text-gray-200`}
            >
              {showLineNumbers
                ? code.split('\n').map((line, i) => {
                    const lineNum = (startLine ?? 1) + i;
                    return (
                      <div
                        key={i}
                        className="table-row hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="table-cell select-none pe-4 text-end text-gray-400 dark:text-gray-600">
                          {lineNum}
                        </span>
                        <span className="table-cell">{line || '\n'}</span>
                      </div>
                    );
                  })
                : code}
            </code>
          </pre>
        </div>
      )}

      {/* Footer with GitHub link */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2">
        <a
          href={`https://github.com/${repo}/blob/main/${path}${
            startLine ? `#L${startLine}` : ''
          }${endLine ? `-L${endLine}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
          عرض على GitHub
        </a>
      </div>
    </div>
  );
}

export default GitHubCode;

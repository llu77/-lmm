import { ReactNode } from 'react';

interface CodeBlockProps {
  children: ReactNode;
  lang?: string;
  title?: string;
  showLineNumbers?: boolean;
  collapse?: boolean;
  wrap?: boolean;
  highlight?: number[];
}

/**
 * Code Block Component
 * 
 * عرض كتل الكود مع دعم:
 * - أرقام الأسطر
 * - تمييز الأسطر المحددة
 * - الطي والتوسيع
 * - التفاف النص
 * 
 * متوافق مع دليل أنماط Cloudflare
 * 
 * @example
 * ```tsx
 * <CodeBlock lang="typescript" title="example.ts" showLineNumbers>
 *   const greeting = "مرحباً";
 *   console.log(greeting);
 * </CodeBlock>
 * ```
 */
export function CodeBlock({
  children,
  lang = 'text',
  title,
  showLineNumbers = false,
  collapse = false,
  wrap = false,
  highlight = [],
}: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(collapse);

  const code = typeof children === 'string' ? children : String(children);
  const lines = code.split('\n');

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
            <code className={`language-${lang} block text-gray-800 dark:text-gray-200`}>
              {showLineNumbers
                ? lines.map((line, i) => {
                    const lineNum = i + 1;
                    const isHighlighted = highlight.includes(lineNum);
                    return (
                      <div
                        key={i}
                        className={`table-row ${
                          isHighlighted
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`table-cell select-none pe-4 text-end ${
                            isHighlighted
                              ? 'text-yellow-600 dark:text-yellow-400 font-bold'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
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
    </div>
  );
}

// Import React for useState hook
import React from 'react';

export default CodeBlock;

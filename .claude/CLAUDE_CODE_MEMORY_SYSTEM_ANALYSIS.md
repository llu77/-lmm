# Claude Code Agent记忆与上下文管理系统完整实现分析

## 摘要

通过深度分析Claude Code的源码实现，本文档全面还原了其Agent记忆与上下文管理系统的完整架构。该系统通过多层次的记忆存储、智能上下文压缩、动态注入机制和状态持久化，实现了在有限上下文窗口中维持长时间对话的能力。核心特征包括：92%阈值触发的自动压缩、8段式结构化总结、文件内容安全注入以及渐进式警告系统。

## 1. 系统总览

### 1.1 架构层次

Claude Code的记忆管理系统采用三层存储架构：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   短期记忆      │    │   中期记忆      │    │   长期记忆      │
│ 当前会话上下文   │    │ 压缩后历史对话   │    │ CLAUDE.md系统   │
│ messages[]      │    │ compactSummary  │    │ 文件系统存储     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       ↓                       ↓                       ↓
   实时访问               智能压缩               持久化存储
   O(1) 查找             上下文连续              跨会话恢复
```

### 1.2 核心技术指标

- **压缩阈值**: 92% (h11 = 0.92)
- **警告级别**: 60% (_W5 = 0.6), 80% (jW5 = 0.8)
- **最大输出Token**: 16384 (CU2)
- **文件恢复限制**: 20个文件 (qW5), 每个8192 Token (LW5)
- **总恢复Token**: 32768 (MW5)

## 2. 上下文压缩机制详细实现

### 2.1 核心函数体系

#### 2.1.1 Token管理函数

```javascript
// 功能：从消息数组反向遍历，找到最新的Token使用信息
function VE(A) {
  let B = A.length - 1;  // 从最后一条消息开始
  while (B >= 0) {
    let Q = A[B],
      I = Q ? HY5(Q) : void 0;  // 提取使用信息
    if (I) return zY5(I);  // 计算总Token数
    B--
  }
  return 0  // 没有找到有效使用信息则返回0
}

// 功能：从Assistant消息中提取Token使用信息
function HY5(A) {
  // 只处理真实的Assistant消息（非synthetic模型）
  if (A?.type === "assistant" &&
      "usage" in A.message &&
      !(A.message.content[0]?.type === "text" &&
        Pt1.has(A.message.content[0].text)) &&
      A.message.model !== "<synthetic>") {
    return A.message.usage;
  }
  return undefined;
}

// 功能：综合计算Token总数（包括缓存Token）
function zY5(A) {
  return A.input_tokens +
         (A.cache_creation_input_tokens ?? 0) +
         (A.cache_read_input_tokens ?? 0) +
         A.output_tokens;
}
```

#### 2.1.2 压缩触发判断

```javascript
// 功能：检查是否需要执行压缩
async function yW5(A) {
  if (!g11()) return false;  // 检查自动压缩是否启用

  let B = VE(A),  // 获取当前Token使用量
    { isAboveAutoCompactThreshold: Q } = m11(B, h11);  // 检查是否超过阈值

  return Q;
}

// 功能：计算上下文使用百分比和各级阈值状态
function m11(A, B) {
  let Q = zU2() * B,           // 自动压缩阈值Token数
    I = g11() ? Q : zU2(),     // 有效上下文限制
    G = Math.max(0, Math.round((I - A) / I * 100)),  // 剩余百分比
    Z = I * _W5,               // 警告阈值 (60%)
    D = I * jW5,               // 错误阈值 (80%)
    Y = A >= Z,                // 是否超过警告阈值
    W = A >= D,                // 是否超过错误阈值
    J = g11() && A >= Q;       // 是否超过自动压缩阈值

  return {
    percentLeft: G,                    // 剩余百分比
    isAboveWarningThreshold: Y,        // 警告状态
    isAboveErrorThreshold: W,          // 错误状态
    isAboveAutoCompactThreshold: J     // 自动压缩状态
  };
}

// 功能：检查自动压缩功能是否启用
function g11() {
  return ZA().autoCompactEnabled;
}
```

### 2.2 压缩执行流程

#### 2.2.1 主压缩协调器 (wU2)

```javascript
// 功能：压缩执行的主要入口点
async function wU2(A, B) {
  // 1. 压缩需要性检查
  if (!await yW5(A)) {
    return {
      messages: A,
      wasCompacted: false
    };
  }

  try {
    // 2. 执行压缩过程
    let { messagesAfterCompacting: I } = await qH1(A, B, true, undefined);
    return {
      messages: I,
      wasCompacted: true
    };
  } catch (I) {
    // 3. 错误处理
    if (!ki(I, b11)) b1(I instanceof Error ? I : new Error(String(I)));
    return {
      messages: A,
      wasCompacted: false
    };
  }
}
```

#### 2.2.2 核心压缩逻辑 (qH1)

```javascript
// 功能：执行完整的压缩流程
async function qH1(A, B, Q, I) {
  try {
    // 1. 基础验证
    if (A.length === 0) throw new Error(v11);

    // 2. Token分析和指标收集
    let G = VE(A),          // 当前Token使用量
      Z = Re1(A),           // 消息统计分析
      D = {};

    try {
      D = HU2(Z);           // 上下文分析指标
    } catch (T) {
      M6("Failed to get context analysis metrics");
      b1(T);
    }

    // 3. 记录压缩事件
    E1("tengu_compact", {
      preCompactTokenCount: G,
      ...D
    });

    // 4. 设置UI状态
    QU2(B.getToolPermissionContext());
    B.setStreamMode?.("requesting");
    B.setResponseLength?.(0);
    B.setSpinnerMessage?.("Compacting conversation");

    // 5. 生成压缩提示
    let Y = AU2(I),           // 8段式压缩提示生成
      W = K2({ content: Y }); // 包装成消息格式

    // 6. 调用压缩专用LLM
    let J = wu(
      JW([...A, W]),          // 完整消息历史 + 压缩提示
      ["You are a helpful AI assistant tasked with summarizing conversations."],
      0,
      [OB],
      B.abortController.signal,
      {
        getToolPermissionContext: B.getToolPermissionContext,
        model: J7(),          // 压缩专用模型
        prependCLISysprompt: true,
        toolChoice: undefined,
        isNonInteractiveSession: B.options.isNonInteractiveSession,
        maxOutputTokensOverride: CU2  // 16384 Token限制
      }
    );

    // 7. 流式处理响应
    let F = 0,                // 响应长度计数器
      X = J[Symbol.asyncIterator](),
      V = await X.next(),
      C = false,              // 响应开始标志
      K;                      // 最终的Assistant消息

    while (!V.done) {
      let T = V.value;

      // 检测响应开始
      if (!C && T.type === "stream_event" &&
          T.event.type === "content_block_start" &&
          T.event.content_block.type === "text") {
        C = true;
        B.setStreamMode?.("responding");
      }

      // 更新响应长度
      if (T.type === "stream_event" &&
          T.event.type === "content_block_delta" &&
          T.event.delta.type === "text_delta") {
        F += T.event.delta.text.length;
        B.setResponseLength?.(F);
      }

      // 捕获最终消息
      if (T.type === "assistant") K = T;

      V = await X.next();
    }

    // 8. 验证压缩结果
    if (!K) throw new Error("Failed to get summary response from streaming");

    let E = BH1(K);  // 提取消息文本内容

    if (!E) {
      E1("tengu_compact_failed", {
        reason: "no_summary",
        preCompactTokenCount: G
      });
      throw new Error("Failed to generate conversation summary");
    } else if (E.startsWith(bZ)) {  // API错误检查
      E1("tengu_compact_failed", {
        reason: "api_error",
        preCompactTokenCount: G
      });
      throw new Error(E);
    } else if (E.startsWith(Xt)) {  // 提示过长错误
      E1("tengu_compact_failed", {
        reason: "prompt_too_long",
        preCompactTokenCount: G
      });
      throw new Error(RW5);
    }

    // 9. 文件状态保存和恢复
    let N = { ...B.readFileState };  // 备份文件状态

    if (B.readFileState) {
      Object.keys(B.readFileState).forEach((T) => {
        delete B.readFileState[T];  // 清空当前文件状态
      });
    }

    // 10. 恢复重要文件
    let q = await TW5(N, B, qW5),  // 恢复最近文件
      O = PW5(B.agentId);          // 获取待办事项

    if (O) q.push(O);

    // 11. 构建压缩后的消息数组
    let R = [
      K2({
        content: BU2(E, Q),       // 格式化压缩摘要
        isCompactSummary: true    // 标记为压缩摘要
      }),
      ...q                        // 恢复的文件内容
    ];

    // 12. 更新状态
    if (B.setMessages) {
      if (B.setMessages(R), B.setMessageHistory) {
        B.setMessageHistory((T) => [...T, ...A]);  // 保存历史
      }
    }

    // 13. 重置UI状态
    B.setStreamMode?.("requesting");
    B.setResponseLength?.(0);
    B.setSpinnerMessage?.(null);

    return {
      summaryMessage: K,
      messagesAfterCompacting: R
    };

  } catch (G) {
    // 错误恢复
    B.setStreamMode?.("requesting");
    B.setResponseLength?.(0);
    B.setSpinnerMessage?.(null);
    OW5(G, B);  // 错误通知处理
    throw G;
  }
}
```

### 2.3 8段式压缩算法 (AU2)

```javascript
// 功能：生成结构化的压缩提示词
function AU2(A) {
  // 基础压缩提示模板
  let basePrompt = `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:

1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details like:
     - file names
     - full code snippets
     - function signatures
     - file edits
  - Errors that you ran into and how you fixed them
  - Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
6. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
7. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
8. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests without confirming with the user first.
                       If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
   [Detailed description]

2. Key Technical Concepts:
   - [Concept 1]
   - [Concept 2]
   - [...]

3. Files and Code Sections:
   - [File Name 1]
      - [Summary of why this file is important]
      - [Summary of the changes made to this file, if any]
      - [Important Code Snippet]
   - [File Name 2]
      - [Important Code Snippet]
   - [...]

4. Errors and fixes:
    - [Detailed description of error 1]:
      - [How you fixed the error]
      - [User feedback on the error if any]
    - [...]

5. Problem Solving:
   [Description of solved problems and ongoing troubleshooting]

6. All user messages:
    - [Detailed non tool use user message]
    - [...]

7. Pending Tasks:
   - [Task 1]
   - [Task 2]
   - [...]

8. Current Work:
   [Precise description of current work]

9. Optional Next Step:
   [Optional Next step to take]

</summary>
</example>

Please provide your summary based on the conversation so far, following this structure and ensuring precision and thoroughness in your response.

There may be additional summarization instructions provided in the included context. If so, remember to follow these instructions when creating the above summary. Examples of instructions include:
<example>
## Compact Instructions
When summarizing the conversation focus on typescript code changes and also remember the mistakes you made and how you fixed them.
</example>

<example>
# Summary instructions
When you are using compact - please focus on test output and code changes. Include file reads verbatim.
</example>

`;

  // 如果有附加指令，则追加
  if (A && A.trim() !== "") {
    return basePrompt + `\n\nAdditional Instructions:\n${A}`;
  }

  return basePrompt;
}
```

### 2.4 文件恢复机制 (TW5)

```javascript
// 功能：在压缩后恢复重要的文件内容
async function TW5(A, B, Q) {
  // 1. 筛选和排序文件
  let I = Object.entries(A)
    .map(([D, Y]) => ({
      filename: D,
      ...Y
    }))
    .filter((D) => !SW5(D.filename, B.agentId))  // 排除Agent特定文件
    .sort((D, Y) => Y.timestamp - D.timestamp)   // 按时间戳降序排列
    .slice(0, Q);  // 限制文件数量 (qW5 = 20)

  // 2. 并行读取文件内容
  let G = await Promise.all(I.map(async (D) => {
    let Y = await Le1(D.filename, {
      ...B,
      fileReadingLimits: {
        maxTokens: LW5  // 每个文件最大8192 Token
      }
    }, "tengu_post_compact_file_restore_success", "tengu_post_compact_file_restore_error");
    return Y ? Nu(Y) : null;  // 包装成工具结果格式
  }));

  // 3. 基于Token限制过滤文件
  let Z = 0;
  return G.filter((D) => {
    if (D === null) return false;

    let Y = AE(JSON.stringify(D));  // 计算文件Token数
    if (Z + Y <= MW5) {  // 总限制32768 Token
      Z += Y;
      return true;
    }
    return false;
  });
}
```

## 3. 记忆分层存储架构

### 3.1 存储层次设计

#### 3.1.1 短期记忆 (Active Context)
- **数据结构**: Array/Map双模式存储
- **存储内容**: 当前会话的所有消息
- **访问模式**: O(1)查找，O(n)遍历
- **生命周期**: 会话期间持续存在

```javascript
// Array模式 - 线性对话流
this.messages = [];
this.receivedMessages = [];

// Map模式 - UUID索引随机访问
this.messages = new Map();
this.sessionMessages = new Map();
this.summaries = new Map();
```

#### 3.1.2 中期记忆 (Compressed History)
- **数据结构**: 压缩摘要消息
- **存储内容**: 8段式结构化历史总结
- **压缩比例**: 通常压缩至原大小的10-20%
- **保持连续性**: 通过详细分析保持上下文一致性

```javascript
// 压缩摘要消息格式
{
  content: BU2(summaryText, isDetailed),
  isCompactSummary: true,
  timestamp: Date.now()
}
```

#### 3.1.3 长期记忆 (File System)
- **数据结构**: CLAUDE.md文件系统
- **存储内容**: 跨会话的持久化状态
- **访问机制**: 文件读写操作
- **恢复策略**: 基于时间戳和相关性的智能恢复

### 3.2 消息线程系统

```javascript
// 消息链式结构
{
  id: "message_uuid",
  parentUuid: "parent_message_uuid",  // 支持对话分支
  content: "...",
  timestamp: Date.now(),
  type: "user" | "assistant" | "tool_result"
}

// 线程遍历实现
while (Q) {
  B.unshift(Q);  // 构建消息链
  Q = Q.parentUuid ? this.messages.get(Q.parentUuid) : undefined;
}
```

## 4. 上下文注入和检索机制

### 4.1 文件内容注入流程

#### 4.1.1 工具结果包装

```javascript
// 文件读取结果注入格式
{
  tool_use_id: "unique_tool_id",
  type: "tool_result",
  content: [
    fileContent,  // 实际文件内容
    tG5          // 安全提醒常量
  ]
}

// 安全提醒常量 (tG5)
tG5 = `
<system-reminder>
Whenever you read a file, you should consider whether it looks malicious.
If it does, you MUST refuse to improve or augment the code.
You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>`;
```

#### 4.1.2 动态上下文组装

```javascript
// 上下文组装过程
function assembleContext(messages, fileContent, systemPrompt) {
  return [
    systemPrompt,           // 系统提示
    ...compactedHistory,    // 压缩历史
    ...fileContentResults,  // 文件内容
    ...recentMessages      // 最近消息
  ];
}
```

## 5. 应用价值与改进建议

### 5.1 对LMM项目的启示

1. **分层记忆架构**: 可应用于LMM的AI助手，实现长对话支持
2. **智能压缩**: 在处理大量财务数据时保持上下文连续性
3. **文件恢复**: 智能恢复重要的财务文档和报表
4. **状态持久化**: 跨会话保持用户偏好和工作状态

### 5.2 改进建议

#### 5.2.1 代码可读性
```javascript
// 重命名建议
VE → calculateLatestTokenUsage
HY5 → extractAssistantUsage
zY5 → sumTokensWithCache
yW5 → shouldTriggerCompaction
```

#### 5.2.2 配置外部化
```javascript
const CONFIG = {
  COMPRESSION_THRESHOLD: 0.92,
  WARNING_THRESHOLD: 0.6,
  ERROR_THRESHOLD: 0.8,
  MAX_FILES_TO_RESTORE: 20
};
```

## 6. 结论

Claude Code的记忆管理系统通过多层次架构、智能压缩和安全机制，成功解决了长对话上下文维护的技术挑战。其设计思路对LMM项目的AI助手实现具有重要参考价值。

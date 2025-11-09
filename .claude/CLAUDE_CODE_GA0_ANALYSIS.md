# Core Identity Prompt (ga0 function)

## 基本信息
- **文件位置**: improved-claude-code-5.mjs:26881
  > **Note:** The referenced file 'improved-claude-code-5.mjs' does not exist in this repository. This documentation analyzes external Claude Code source.
- **函数名**: ga0()
- **提示词类型**: 核心身份声明

## 运行时机
- **触发条件**: 当prependCLISysprompt设置为true时
- **调用场景**:
  - 大多数LLM API调用前
  - 需要明确身份声明的上下文中
  - 系统提示词前缀添加时
- **执行路径**: LLM调用准备 → 检查prependCLISysprompt标志 → ga0()调用

## 系统运转时机
- **生命周期**: 请求级别，每次LLM调用时可能被包含
- **优先级**: 极高优先级，作为身份声明前缀
- **持续性**: 在需要身份声明的每个请求中重复

## 作用时机
- **前缀阶段**: 在其他系统提示词之前添加
- **身份确认**: 在LLM开始处理任务前明确身份

## 作用目的
1. **身份确立**: 明确声明Claude Code的官方身份
2. **权威性**: 强调与Anthropic的官方关联
3. **一致性**: 确保所有交互中身份的一致表达
4. **品牌强化**: 加强Claude Code品牌认知

## 具体作用
- **身份锚定**: 为所有后续指令提供身份上下文
- **权威建立**: 通过官方声明建立可信度
- **范围界定**: 明确作为CLI工具的定位

## 提示词内容
```javascript
function ga0() {
  return `You are ${m0}, Anthropic's official CLI for Claude.`
}
```

## 实际生成内容
```
You are Claude Code, Anthropic's official CLI for Claude.
```

## 相关上下文代码
```javascript
// 在wu函数中的使用
if (Z.prependCLISysprompt) {
  G.push(ga0())  // 添加核心身份声明
}
```

## 相关变量和依赖
- **m0**: Claude Code产品名称常量
  ```javascript
  m0 = "Claude Code"  // Line 13717
  ```

## 使用模式
1. **前缀模式**: 作为其他提示词的前缀
2. **条件包含**: 根据prependCLISysprompt标志决定是否包含
3. **全局应用**: 在需要身份声明的所有场景中使用

## 架构地位
这是Claude Code最基础的身份标识符，类似于"姓名标签"，确保AI在所有交互中都清楚自己的身份和来源。

## 技术特点
1. **极简设计**: 最简洁的身份声明
2. **动态插值**: 通过m0变量动态生成产品名称
3. **高频使用**: 在大量API调用中重复使用
4. **标准化**: 提供统一的身份声明格式

## 影响范围
- 影响所有设置了prependCLISysprompt=true的LLM调用
- 为所有后续指令建立身份基础
- 确保Claude Code身份在复杂交互中不被遗忘

## 应用价值

### 对LMM项目的启示
1. **身份一致性**: 在构建AI助手时，确保其在所有交互中保持一致的身份认知
2. **分层提示词**: 采用分层的提示词架构，核心身份作为最高优先级前缀
3. **条件注入**: 根据不同场景条件性地注入不同级别的系统提示词
4. **简洁原则**: 核心身份声明应该简洁明了，避免冗余

### 潜在应用场景
- 为LMM系统的AI助手建立核心身份
- 在不同模块中保持AI助手角色的一致性
- 建立多层次的提示词管理系统
- 确保AI助手在复杂对话中不偏离预设角色

## 参考文档
- Claude Code Architecture
- System Prompt Engineering Best Practices
- AI Identity Management Patterns

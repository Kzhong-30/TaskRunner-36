const AI_RESPONSES: string[] = [
  `这是一个很好的问题！让我来为你详细解答。

## 要点分析

首先，我们需要理解问题的核心。在现代软件开发中，这种模式非常常见。

### 关键概念

1. **模块化设计** - 将复杂系统拆分为可管理的模块
2. **关注点分离** - 每个模块只负责一件事情
3. **可测试性** - 良好的设计使测试更加容易

## 示例代码

\`\`\`typescript
interface Config {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
}

function createConfig(overrides: Partial<Config> = {}): Config {
  return {
    theme: 'light',
    language: 'zh-CN',
    fontSize: 14,
    ...overrides,
  };
}

const myConfig = createConfig({ theme: 'dark', fontSize: 16 });
console.log(myConfig);
\`\`\`

## 总结

通过合理的设计模式，我们可以构建出更加健壮和可维护的系统。希望这个解答对你有帮助！`,

  `你好！我是 AI 助手，很高兴为你服务。

我可以帮你完成各种任务，包括但不限于：

- 📝 **文本生成与编辑**
- 💻 **编程问题解答**
- 📊 **数据分析建议**
- 🌐 **翻译与语言处理**

如果你有任何问题，请随时提问！`,

  `关于这个问题，我来给你一个全面的解答。

## 算法复杂度分析

| 算法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 冒泡排序 | O(n²) | O(1) |
| 快速排序 | O(n log n) | O(log n) |
| 归并排序 | O(n log n) | O(n) |
| 堆排序 | O(n log n) | O(1) |

### 快速排序实现

\`\`\`python
def quicksort(arr: list[int]) -> list[int]:
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)

# 使用示例
data = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(data))  # [1, 1, 2, 3, 6, 8, 10]
\`\`\`

选择排序算法时，需要根据数据规模和特点来决定。快速排序在大多数情况下表现优秀，但最坏情况下会退化到 O(n²)。`,

  `当然可以！让我来解释一下 React Hooks 的工作原理。

## useState

\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        增加
      </button>
    </div>
  );
}
\`\`\`

## useEffect

\`\`\`jsx
import { useEffect, useState } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]);
  
  if (!user) return <div>加载中...</div>;
  return <div>{user.name}</div>;
}
\`\`\`

## 自定义 Hook

\`\`\`jsx
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}
\`\`\`

Hooks 是 React 函数组件的核心特性，掌握它们是成为高效 React 开发者的关键。`,

  `让我来详细解释这个概念。

## 核心思想

在分布式系统中，有一个著名的 **CAP 定理**：

> 一个分布式系统最多只能同时满足一致性（Consistency）、可用性（Availability）和分区容错性（Partition tolerance）这三项中的两项。

### 这意味着什么？

- **CP 系统**：保证一致性和分区容错，可能牺牲可用性
- **AP 系统**：保证可用性和分区容错，可能牺牲一致性
- **CA 系统**：保证一致性和可用性，但无法处理网络分区

### 实际应用

\`\`\`go
// 简单的分布式锁实现
type DistributedLock struct {
    client *redis.Client
    key    string
    value  string
    ttl    time.Duration
}

func (l *DistributedLock) Acquire() (bool, error) {
    return l.client.SetNX(context.Background(), l.key, l.value, l.ttl).Result()
}

func (l *DistributedLock) Release() error {
    script := \`
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    \`
    return l.client.Eval(context.Background(), script, []string{l.key}, l.value).Err()
}
\`\`\`

理解这些权衡对于设计可靠的分布式系统至关重要。`,
];

export function getRandomResponse(): string {
  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
}

export function simulateStream(
  text: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  speed: number = 20
): () => void {
  let index = 0;
  let cancelled = false;

  function emitNext() {
    if (cancelled) return;

    if (index < text.length) {
      const char = text[index];
      index++;
      onChunk(char);

      const delay = char === '\n' ? speed * 3 :
                    char === '。' || char === '！' || char === '？' ? speed * 2 :
                    char === '，' || char === '；' ? speed * 1.5 :
                    speed + Math.random() * 10;

      setTimeout(emitNext, delay);
    } else {
      onDone();
    }
  }

  emitNext();

  return () => {
    cancelled = true;
  };
}

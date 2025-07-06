# 事件处理器 (EventHandlers)

`EventHandlers` 模块是 MuRainBot2 (MRB2) 框架响应各类事件的基石。它不仅提供了强大的事件过滤和分发能力，还通过依赖注入和可扩展的规则系统，为插件开发者构建复杂交互逻辑提供了坚实的基础。

::: tip 推荐用法
对于需要解析**带参数的、有固定前缀的命令**（例如 `/weather beijing`），我们**强烈推荐使用更高级的 `CommandManager`**。它构建在 `EventHandlers` 之上，提供了更简洁、更强大的命令定义和参数解析功能。

`EventHandlers` 现在主要用于处理以下场景：
-   **非命令类事件**：如监听群成员增加/减少通知 (`NoticeEvent`)、好友请求 (`RequestEvent`)等。
-   **无固定前缀或格式的关键词触发**：例如，监听消息中是否包含“你好”，而不关心它出现在消息的哪个位置。
-   **需要高度自定义底层匹配逻辑的复杂场景**。
:::

## 核心架构：Rule -> Matcher -> Handler

MRB2 的事件处理遵循一个清晰的链式模型：

1.  **事件 (Event)**: 当 MRB2 收到数据时，会将其解析为标准化的事件对象，如 `GroupMessageEvent`。这是数据流的起点。

2.  **匹配器 (Matcher)**: 通过 `on_event()` 创建。它像一个过滤器组，首先根据**事件类型**进行粗筛，然后使用一组**初始规则 (Rule)** 进行精筛。只有通过所有筛选的事件，才能进入该 `Matcher`。

3.  **处理器 (Handler)**: 使用 `@matcher.register_handler()` 注册在 `Matcher` 上的函数。它是事件处理的终点，也可以有自己的**附加规则**。只有通过了 `Matcher` 和 `Handler` 两层规则的事件，才会最终触发处理器函数的执行。

## 依赖注入 (Dependency Injection)：优雅地获取上下文

依赖注入是 `EventHandlers` 的一个核心特性，它允许你的处理器函数**仅仅通过声明参数，就能自动获取所需的上下文信息**，而无需在函数体内手动调用各种管理器。

### 可注入的参数

`EventHandlers` 支持注入以下三种核心的上下文对象：

1.  **`event` (事件对象)**:
    -   **如何声明**: `def my_handler(event: EventClassifier.MessageEvent): ...`
    -   **作用**: 这是最基础的注入，每个处理器函数的第一个参数**必须**是事件对象。框架会自动将触发该处理器的事件实例传递给它。类型注解有助于静态分析和代码补全。

2.  **`state`, `user_state`, `group_state` (状态对象)**:
    -   **如何声明**:
        -   `def my_handler(event, state: dict): ...`
        -   `def my_handler(event, user_state: dict): ...`
        -   `def my_handler(event, group_state: dict): ...`
    -   **作用**: 从 `StateManager` 中获取临时的、与当前交互相关的内存状态。
        -   `state`: 最常用的状态。对于群消息，它对应 `g<group_id>_u<user_id>` 的状态；对于私聊，对应 `u<user_id>` 的状态。
        -   `user_state`: 明确获取当前用户的状态 (`u<user_id>`)。
        -   `group_state`: 明确获取当前群组的状态 (`g<group_id>`)。
    -   **数据结构**: 注入的状态是一个字典，其中 `data` 键对应的值才是你真正用来读写的状态字典。
        ```python
        def handler(event, user_state: dict):
            # user_state['data'] 是一个可变字典，直接修改它即可保存状态
            count = user_state["data"].get("visit_count", 0) + 1
            user_state["data"]["visit_count"] = count
        ```
    -   ::: danger 警告：内存存储，重启丢失
        `StateManager` 中的所有数据都存储在内存中！当机器人程序**重启或关闭**时，**所有状态数据都会丢失**。它只适用于存储临时的会话状态。
        :::

3.  **由 `Rule` 注入的自定义参数**:
    -   **如何声明**: 取决于你自定义的 `Rule`。
    -   **作用**: 这是 `EventHandlers` 最灵活的部分。你的自定义 `Rule` 可以在 `match()` 方法中返回一个元组 `(True, {'my_param': some_value})`。框架会自动收集这些由规则生成的键值对，并通过依赖注入传递给处理器函数。

## 自定义 `Rule`：打造你的专属匹配逻辑

当内置规则无法满足你复杂的需求时，你可以通过继承 `EventHandlers.Rule` 来创建自己的规则。

自定义 `Rule` 的关键在于实现 `match()` 方法。

### `match()` 方法详解

```python
from typing import Any, Tuple

class MyCustomRule(EventHandlers.Rule):
    def match(self, event: EventClassifier.Event) -> bool | Tuple[bool, dict[str, Any]]:
        # ... 你的逻辑 ...
```

-   **输入**: `event`，即当前正在被检查的事件对象。
-   **输出**:
    -   **`bool`**:
        -   返回 `True` 表示匹配成功。
        -   返回 `False` 表示匹配失败。
    -   **`tuple[bool, dict]`**:
        -   这是一个更强大的返回形式，用于在匹配成功的同时，向处理器**注入自定义参数**。
        -   返回 `(True, {'param_name': value})`。当此规则被用于激活一个处理器时，框架会尝试将 `value` 注入到处理器函数中名为 `param_name` 的参数上。
        -   如果匹配失败，应返回 `False` 或 `(False, None)`。

### 示例 1：使用 `FuncRule` 判断群主

对于一些简单的逻辑判断，`FuncRule` 是最快捷的方式。例如，判断消息是否由群主发送。

```python
from murainbot import EventHandlers, EventClassifier

def is_group_owner(event: EventClassifier.Event) -> bool:
    # 最佳实践：通过检查事件的属性来判断其上下文，而不是它的类。
    # 这让 Rule 更加通用和健壮。
    if event.get("message_type") != "group":
        return False
    
    # 安全地获取 sender 信息
    sender_info = event.get("sender")
    if not isinstance(sender_info, dict):
        return False
    
    # 返回角色检查结果
    return sender_info.get("role") == "owner"

# 将函数包装成 Rule
owner_rule = EventHandlers.FuncRule(is_group_owner)

# 在 Matcher 中使用
# 这个 Matcher 可以安全地监听 MessageEvent，因为我们的 Rule 内部做了正确的检查
owner_matcher = EventHandlers.on_event(
    EventClassifier.MessageEvent,
    rules=[owner_rule]
)
```
::: tip 最佳实践
为什么检查 `event.get("message_type")` 而不是 `isinstance(event, GroupMessageEvent)`？

因为这让你的 `Rule` 更加**通用和健壮**。一个 `Rule` 如果写成这样，那么无论 `Matcher` 是通过 `on_event(GroupMessageEvent)` 还是更宽泛的 `on_event(MessageEvent)` 注册的，它都能正确工作。它关注的是事件的**数据内容**（它是不是来自一个群），而不是事件的**具体类实现**，这是一种更可靠的设计模式。
:::

### 示例 2：自定义 `Rule` 提取特定格式消息

当你的规则不仅需要**判断**，还需要**提取数据并注入**时，自定义 `Rule` 就派上了用场。假设我们想创建一个规则，专门匹配并提取形如 `“抽奖: <奖品名称>”` 的消息。

```python
import re
from murainbot import EventHandlers, QQRichText, EventClassifier
from typing import Any, Tuple

class DrawPrizeRule(EventHandlers.Rule):
    # 定义一个正则表达式来匹配格式
    PATTERN = re.compile(r"^抽奖[:：]\s*(?P<prize>.+)")

    def match(self, event: EventClassifier.Event) -> Tuple[bool, dict[str, Any] | None]:
        # 1. 确保我们处理的是消息事件
        if not isinstance(event, EventClassifier.MessageEvent):
            return False, None

        # 2. 获取消息的纯文本内容
        text = event.raw_message.strip()

        # 3. 使用正则表达式进行匹配
        match_obj = self.PATTERN.match(text)
        
        # 4. 如果匹配成功
        if match_obj:
            # 提取命名捕获组 'prize' 的内容
            prize_name = match_obj.group('prize').strip()
            
            # 5. 返回成功标志和要注入的参数字典
            # 我们将提取出的奖品名称注入到名为 'prize' 的参数中
            return True, {"prize": prize_name}
        
        # 6. 如果不匹配，返回失败
        return False, None

# --- 在插件中使用这个自定义 Rule ---

# 创建规则实例
draw_rule = DrawPrizeRule()

# 创建监听器，使用我们的自定义规则
draw_matcher = EventHandlers.on_event(
    EventClassifier.MessageEvent,
    rules=[draw_rule]
)

# 注册处理器，并通过函数签名请求注入 'prize' 参数
@draw_matcher.register_handler()
def handle_draw(event: EventClassifier.MessageEvent, prize: str):
    # 依赖注入的魔力：'prize' 参数已经被自动填充
    user_id = event.user_id
    response_text = f"收到！用户 {user_id} 发起了关于「{prize}」的抽奖！"
    
    event.reply(response_text)
```
在这个例子中，`DrawPrizeRule` 不仅判断了消息格式是否正确，还承担了**数据提取**的工作，并通过依赖注入将提取出的数据直接传递给处理器，极大地简化了处理器的内部逻辑。

## 规则的组合：`&` 与 `|`

`Rule` 对象支持使用 `&` (逻辑与) 和 `|` (逻辑或) 运算符进行组合，以创建更复杂的逻辑链。

```python
from murainbot.EventHandlers import to_me

# 假设已经定义好了 is_group_owner 函数和 owner_rule
owner_rule = EventHandlers.FuncRule(is_group_owner)

# 组合规则：必须是@我的，并且是群主发送的
final_rule = to_me & owner_rule

# 使用组合规则创建 Matcher
owner_command_matcher = EventHandlers.on_event(
    EventClassifier.MessageEvent,
    rules=[final_rule]
)
```

-   `rule1 & rule2` 等效于 `AllRule(rule1, rule2)`。
-   `rule1 | rule2` 等效于 `AnyRule(rule1, rule2)`。
-   当你在 `rules` 列表中放入多个 `Rule` 时，它们之间默认就是 `&` (与) 关系。

通过深入理解依赖注入和自定义 `Rule`，你可以将 `EventHandlers` 的能力发挥到极致，构建出逻辑清晰、高度解耦且易于维护的强大插件。
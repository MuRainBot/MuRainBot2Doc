# 事件处理器 (EventHandlers)

`EventHandlers` 模块是 MuRainBot2 (MRB2) 框架的非常重要的组件之一，专为插件开发者设计，用于精确地响应和处理机器人从 OneBot 实现端接收到的各种事件。通过定义规则 (Rule) 和注册处理函数 (Handler)，你可以让你的插件对特定的消息、通知或请求做出反应。

该模块位于 `Lib.utils.EventHandlers.py`。

## 核心概念

1.  **事件 (Event):** 由 `Lib.utils.EventClassifier` 定义。当 MRB2 从 Onebot 实现端接收到数据时，会将其解析为标准化的事件对象，例如 `EventClassifier.GroupMessageEvent` (群消息)、`EventClassifier.PrivateMessageEvent` (私聊消息)、`EventClassifier.NoticeEvent` (通知事件) 等。每个事件对象都携带了该事件的详细信息（如 `message_id`、`user_id`、`group_id`、`message_type`、`raw_message`、`message` 等）。
2.  **规则 (Rule):** 一个用于过滤事件的条件。它通常是一个 `EventHandlers.Rule` 的子类实例。规则的核心是一个 `match` 方法，该方法接收一个 `event_data` 对象，并返回 `True` (表示事件符合规则) 或 `False` (表示事件不符合规则)。MRB2 提供了多种内置规则，你也可以创建自定义规则。
3.  **匹配器 (Matcher):** 通过 `EventHandlers.on_event()` 函数创建。一个 Matcher 绑定到一个特定的 **事件类型** (如 `EventClassifier.GroupMessageEvent`) 和一组可选的 **初始规则**。只有当一个事件的类型匹配 *并且* 满足所有初始规则时，该事件才会被考虑传递给此 Matcher 下注册的 Handler。Matcher 可以设置优先级，决定其匹配尝试的顺序。
4.  **处理器 (Handler):** 使用 `@Matcher实例.register_handler()` 装饰器注册到 Matcher 上的 **函数**。这是你编写插件核心逻辑的地方。每个 Handler 也可以定义自己的 **附加规则** 和优先级。只有当事件同时满足了 Matcher 的初始规则 *和* Handler 的附加规则时，该 Handler 函数才会被 MRB2 的 **线程池** 调用执行。

## 使用 `on_event` 创建事件匹配器

要开始响应特定类型的事件，你需要使用 `EventHandlers.on_event()` 来创建一个 `Matcher`。

```python
# 示例：创建一个 Matcher 来监听所有的群消息事件
# priority: Matcher 的优先级，数字越大越先尝试匹配
# rules: 一个 Rule 列表，事件必须满足所有这些规则才能继续
group_message_matcher = EventHandlers.on_event(
    event=EventClassifier.GroupMessageEvent, # 指定监听的事件类型
    priority=5,                             # 设置优先级为 5
    rules=[]                                # 初始规则列表，这里为空，表示所有群消息都初步匹配
)

# group_message_matcher 现在是一个 Matcher 实例
# 你可以用它来注册具体的处理函数
```

**`on_event` 参数:**

*   `event`: **必需**。要监听的事件类型，必须是 `Lib.utils.EventClassifier.Event` 的子类（例如 `EventClassifier.GroupMessageEvent`, `EventClassifier.NoticeEvent` 等）。框架会确保只有此类型或其子类型的事件才会触发这个 `Matcher` 的检查。
*   `priority`: 可选。整数，定义此 `Matcher` 的优先级，默认为 `0`。**数字越大，优先级越高**。当一个事件发生时，高优先级的 `Matcher` 会先于低优先级的 `Matcher` 尝试匹配。
*   `rules`: 可选。一个包含 `Rule` 对象的列表 (`list[Rule]`)。事件必须 **同时满足** 列表中的所有规则，才会被认为通过了此 Matcher 的初步筛选，进而传递给其下的 Handler 进行进一步匹配。如果为空列表 `[]`（默认），则只根据 `event` 类型进行初步筛选。

`on_event` 返回一个 `Matcher` 对象，后续需要使用这个对象来注册处理函数。

## 使用 `Matcher.register_handler` 注册处理函数

获得 `Matcher` 对象后，通过调用其 `register_handler` 方法（通常作为装饰器使用）来注册实际处理事件的函数。

```python
# ... 接上一个例子 ...

# 定义一个规则：仅匹配来自特定群组 (12345) 的消息
# 注意：由于我们已在 on_event 中指定了 GroupMessageEvent，
# event_data 必然有 group_id 属性（如果事件有效）
specific_group_rule = EventHandlers.KeyValueRule("group_id", 12345, model="eq")

# 在 group_message_matcher 上注册一个处理函数
# priority: Handler 在 Matcher 内部的优先级
# rules: Handler 的附加规则，这里要求必须来自群 12345
@group_message_matcher.register_handler(
    priority=10, # 此 Handler 在 group_message_matcher 内部优先级为 10
    rules=[specific_group_rule] # 附加规则：必须匹配 specific_group_rule
)
def handle_specific_group_message(event_data: EventClassifier.GroupMessageEvent):
    """处理来自群 12345 的消息"""
    logger.info(f"收到来自特定群 {event_data.group_id} 的消息: {event_data.raw_message}")

    # 使用 Actions 发送回复
    try:
        Actions.SendMsg(
            group_id=event_data.group_id,
            message=QQRichText.QQRichText(
                QQRichText.Reply(event_data.message_id), # 引用原始消息
                QQRichText.Text("已收到来自特定群组的消息！")
            )
        ).call() # 同步调用 Action 执行发送
    except Exception as e:
        logger.error(f"回复特定群消息失败: {e}")

    # 如果希望阻止当前 Matcher 内优先级更低的 Handler 处理此事件
    # 可以返回 True
    # return True
```

**`register_handler` 参数:**

*   `priority`: 可选。整数，定义此 `Handler` 在其所属 `Matcher` 内部的优先级，默认为 `0`。**数字越大，优先级越高**。在同一个 `Matcher` 内部，高优先级的 `Handler` 会先于低优先级的 `Handler` 尝试匹配和执行。
*   `rules`: 可选。一个包含 `Rule` 对象的列表 (`list[Rule]`)。事件在满足了 `on_event` 定义的初始规则后，还必须 **同时满足** 这个列表中的所有附加规则，这个 `Handler` 函数才会被执行。默认为空列表 `[]`。
*   `*args`, `**kwargs`: 可选。这些额外的参数会原样传递给你定义的 `Handler` 函数，排在 `event_data` 参数之后。

**Handler 函数:**

*   必须是一个 **函数**。MRB2 会在内部的事件传播过程中中调用它。
*   第一个参数 **必须** 是 `event_data`，它就是匹配成功的那个事件对象。其类型与 `on_event` 中指定的 `event` 参数一致（或为其子类），建议使用类型注解（如 `event_data: EventClassifier.GroupMessageEvent`）以获得更好的开发和静态检查体验。
*   可以接收 `register_handler` 中传入的 `*args` 和 `**kwargs`。
*   **返回值:**
    *   返回 `True`: 表示该 Handler 已成功处理此事件。这将**阻止**当前 `Matcher` 内**优先级更低**的 Handler 处理此事件。**注意：** 它 **不会** 阻止其他 `Matcher` (无论是更高优先级、同优先级还是更低优先级) 处理此事件。
    *   返回 `None` (或其他任何非 `True` 的值): 表示事件处理可以继续。事件将有机会被当前 Matcher 内优先级更低的 Handler 或其他 Matcher 处理。

## 内置规则 (`Rule`) 类型

`EventHandlers` 模块提供了一系列方便的内置规则类，它们都继承自 `EventHandlers.Rule` 基类。

### `Rule` (基类)

所有规则的父类，定义了 `match(self, event_data: EventClassifier.Event)` 接口。通常不直接使用，而是使用其子类或自定义继承它。

### `AnyRule`

逻辑或规则。包含一个或多个子规则。只要事件满足其包含的 **任意一个** 子规则，`AnyRule` 就匹配成功。

```python
rule1 = EventHandlers.CommandRule("菜单")
rule2 = EventHandlers.CommandRule("功能")

# 匹配 "菜单" 或 "功能" 命令
# 但是如果要给一个命令绑定多个触发名称不建议使用此方法，
# 而是使用 CommandRule 的 aliases 参数。
menu_or_func_rule = EventHandlers.AnyRule(rule1, rule2)

# 使用方式：
# matcher = EventHandlers.on_event(..., rules=[menu_or_func_rule])
```

**`__init__(self, *rules: Rule)`:** 接收任意数量的 `Rule` 对象作为参数。

### `AllRule`

逻辑与规则。包含一个或多个子规则。事件必须 **同时满足** 其包含的 **所有** 子规则，`AllRule` 才匹配成功。

```python
# 规则1: 必须是群消息 (通过检查 message_type 字段)
is_group_msg = EventHandlers.KeyValueRule("message_type", "group", model="eq")
# 规则2: 消息内容包含 "签到"
contains_checkin = EventHandlers.KeyValueRule("raw_message", "签到", model="in")

# 必须是群消息且内容包含 "签到"
group_checkin_rule = EventHandlers.AllRule(is_group_msg, contains_checkin)

# 使用方式：
# matcher = EventHandlers.on_event(EventClassifier.MessageEvent, rules=[group_checkin_rule])
```

**`__init__(self, *rules: Rule)`:** 接收任意数量的 `Rule` 对象作为参数。

### `KeyValueRule`

键值匹配规则。用于检查 `event_data` 对象的某个属性（键）的值是否符合预期。

```python
# 匹配来自特定用户 (QQ=10001) 的消息
user_rule = EventHandlers.KeyValueRule("user_id", 10001, model="eq")

# 匹配非管理员发送的消息 (假设管理员 user_id 在一个集合里)
admin_ids = {10001, 10002}
not_admin_rule = EventHandlers.KeyValueRule("user_id", admin_ids, model="not in")

# 匹配消息原始文本包含 "紧急"
urgent_keyword_rule = EventHandlers.KeyValueRule("raw_message", "紧急", model="in")

# 匹配通知事件中的群文件上传类型
file_upload_rule = EventHandlers.KeyValueRule("notice_type", "group_upload", model="eq")

# 使用自定义函数判断 group_id 是否为奇数
def is_odd_group(event_value, compare_value):
    # event_value 是 event_data.get("group_id") 的值
    # compare_value 是 KeyValueRule 的第二个参数 value (这里是 None)
    return isinstance(event_value, int) and event_value % 2 != 0

odd_group_rule = EventHandlers.KeyValueRule("group_id", None, model="func", func=is_odd_group)
```

**`__init__(self, key, value, model: Literal["eq", "ne", "in", "not in", "func"], func: Callable[[Any, Any], bool] = None)`:**

*   `key`: `str`，要检查的 `event_data` 中的属性名 (使用 `event_data.get(key)`)。
*   `value`: `Any`，要进行比较的值。
*   `model`: `str`，比较模式：
    *   `"eq"`: 等于 (`event_data.get(key) == value`)
    *   `"ne"`: 不等于 (`event_data.get(key) != value`)
    *   `"in"`: 包含 (`value in event_data.get(key)`)。
    *   `"not in"`: 不包含 (`value not in event_data.get(key)`)。
    *   `"func"`: 使用自定义函数比较。
*   `func`: `Callable`，仅当 `model="func"` 时需要。一个接收两个参数 `(event_value, rule_value)` 的函数，返回 `bool`。`event_value` 是 `event_data.get(key)` 的实际值，`rule_value` 是传递给 `KeyValueRule` 的 `value` 参数。

### `FuncRule`

函数规则。允许你使用一个自定义的 Python 函数来判断事件是否匹配。函数直接接收整个 `event_data` 对象。

```python
# 定义一个函数，判断是否是群主发送的消息
def is_group_owner(event_data: EventClassifier.Event) -> bool:
    # 必须先判断事件是否包含必要的字段 (如 message_type 和 sender)
    return (event_data.get("message_type") == "group" and
            isinstance(event_data.get("sender"), dict) and # 确保 sender 是字典
            event_data.sender.get("role") == "owner")

# 创建 FuncRule
owner_rule = EventHandlers.FuncRule(is_group_owner)

# 或者使用 lambda 表达式，检查是否为特定管理员发送
admin_ids = {10001, 10002}
admin_rule_lambda = EventHandlers.FuncRule(
    lambda event: event.get("user_id") in admin_ids
)
```

**`__init__(self, func: Callable[[Any], bool])`:**

*   `func`: `Callable`，一个接收 `event_data` 作为唯一参数并返回 `bool` (`True` 表示匹配, `False` 表示不匹配) 的函数。函数内部应进行必要的健壮性检查（如 `event.get("key")` 而不是 `event["key"]`）。

### `CommandRule` (极其常用)

专门用于解析和匹配用户输入的命令消息，是编写交互式插件的基础。

**核心功能:**

1.  **智能匹配:**
    *   匹配 `命令起始符 + 命令` (例如 `/help`)
    *   匹配 `命令起始符 + 别名` (例如 `/帮助`，如果 "帮助" 是 "help" 的别名)
    *   如果消息以 `@机器人` 开头，则直接匹配 `命令` 或 `别名` (例如 `@Bot help` 或 `@Bot 帮助`)，此时无需命令起始符。
2.  **自动处理与修改 `event_data`:** 这是 `CommandRule` 最强大的地方。当匹配成功时，它会**直接修改**传递给 Handler 的 `event_data` 对象：
    *   移除消息开头的 `@机器人` (如果存在且匹配)。
    *   移除匹配到的 `命令起始符` (例如 `/`)。
    *   如果匹配的是 `别名`，会自动将其替换为原始的 `命令` 名。
    *   **结果:**
        *   `event_data.message` (`QQRichText` 对象): 更新为处理后的消息。其内容现在以**基础命令名开头**，后面跟着参数（如果有的话）。例如，原始消息 `/echo Hello World`，处理后 `str(event_data.message)` 会是 `"echo Hello World"`。如果原始消息包含回复段 (`QQRichText.Reply`) 且 `reply=True`，回复段会保留在 `message.rich_array` 的开头。
        *   `event_data.raw_message` (`str` 对象): 更新为处理后消息的**纯文本**表示。同样以基础命令名开头，跟着参数文本。**不包含**回复段的文本内容。例如，对于 `/echo Hello World`，处理后 `event_data.raw_message` 会是 `"echo Hello World"`。

**使用示例:**

```python
# 规则1：匹配 "/echo <内容>" 或 "#复读 <内容>"
echo_rule = EventHandlers.CommandRule(
    command="echo",
    aliases={"复读"},
    command_start=["/", "#"], # 指定命令前缀
    reply=True,              # 允许在回复消息时使用此命令
    no_args=False            # 命令后面必须/可以跟参数
)

# 规则2：匹配 "/签到"，不允许任何额外内容
checkin_rule = EventHandlers.CommandRule(
    command="签到",
    # command_start 不指定，则使用全局配置
    no_args=True             # 要求精确匹配，不能有参数
)

# --- 注册 Handler ---
# 假设监听所有消息事件
matcher = EventHandlers.on_event(EventClassifier.MessageEvent)

@matcher.register_handler(rules=[echo_rule])
def handle_echo(event_data: EventClassifier.MessageEvent):
    # CommandRule 已处理 event_data.message 和 event_data.raw_message
    # 它们现在都以 "echo" 开头

    # 提取参数 (注意基础命令名 "echo" 也在里面)
    command_and_args = event_data.raw_message # 使用纯文本进行分割更简单
    parts = command_and_args.split(" ", 1)
    content_to_echo = ""
    if len(parts) > 1:
        content_to_echo = parts[1].strip() # 获取命令后的内容

    if not content_to_echo:
        reply_text = "请告诉我需要复读什么内容，例如：/echo 你好"
    else:
        reply_text = content_to_echo # 直接复读内容

    # 根据消息类型发送回复
    if event_data.message_type == "group":
        # 确保有 group_id
        if "group_id" in event_data:
            Actions.SendMsg(
                group_id=event_data.group_id,
                message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
            ).call()
        else:
             logger.warning(f"处理群聊 echo 命令时缺少 group_id: {event_data}")
    elif event_data.message_type == "private":
         Actions.SendPrivateMsg(
            user_id=event_data.user_id,
            message=QQRichText.QQRichText(reply_text) # 私聊通常不带 Reply 段
        ).call()

@matcher.register_handler(rules=[checkin_rule])
def handle_checkin(event_data: EventClassifier.MessageEvent):
    # 因为 no_args=True, event_data.raw_message 就是 "签到"
    user_id = event_data.user_id
    logger.info(f"用户 {user_id} 进行了签到")
    reply_text = f"用户 {user_id} 签到成功！"

    # 根据消息类型发送回复
    if event_data.message_type == "group":
        if "group_id" in event_data:
            Actions.SendMsg(
                group_id=event_data.group_id,
                message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
            ).call()
        else:
             logger.warning(f"处理群聊签到命令时缺少 group_id: {event_data}")
    elif event_data.message_type == "private":
         Actions.SendPrivateMsg(user_id=user_id, message=reply_text).call()

    # return True # 签到成功后可以阻止后续处理
```

**`CommandRule` 参数:**

*   `command`: `str`, **必需**。基础命令名。**注意:** 命令名本身不能包含 `[` 或 `]` 或任何 `command_start` 中的字符。
*   `aliases`: `set[str]`, 可选。命令的别名集合。
*   `command_start`: `list[str]`, 可选。定义哪些字符可以作为命令的前缀。如果为 `None`（默认），则使用全局配置 `ConfigManager.GlobalConfig().command.command_start`。
*   `reply`: `bool`, 可选。是否允许命令在回复消息（带有 `[CQ:reply]` 段）的情况下也能被触发。默认为 `False`。如果为 `True`，匹配成功后 `event_data.message` 的 `rich_array` 开头会保留 `QQRichText.Reply` 段。
*   `no_args`: `bool`, 可选。是否要求命令后面 **不能** 有任何参数。默认为 `False` (允许有参数)。如果为 `True`，则消息必须精确匹配 `命令起始符 + 命令/别名` 或 `@Bot 命令/别名`，后面不允许有任何其他内容（除了可能的前导空格）。

### `to_me` (预定义规则实例)

这是一个非常有用的、预先定义好的 `FuncRule` 实例。它用于快速判断一个消息事件是否是明确发送给机器人的。

**匹配条件:** (内部实现细节)

*   检查 `event_data.message_type == "private"`。
*   **或者** 检查 `event_data.message_type == "group"` 并且 `event_data.message` 的富文本数组 (`rich_array`) 中包含一个 `QQRichText.At` 段，其 `qq` 数据等于 `event_data.self_id`。

**使用场景:** 通常用于确保命令或交互只在用户直接与机器人沟通时触发，避免响应群内无关的消息。

```python
# 规则：必须是发给我的 "help" 命令
help_rule = EventHandlers.CommandRule("help")

# Matcher: 监听所有消息，初始规则要求是 to_me 和 help 命令
help_matcher = EventHandlers.on_event(
    event=EventClassifier.MessageEvent,
    rules=[EventHandlers.to_me, help_rule] # 先检查 to_me，再检查 help 命令
)

@help_matcher.register_handler()
def handle_direct_help(event_data: EventClassifier.MessageEvent):
    # 这里的 event_data 肯定是私聊或群里 @Bot 的 help 命令
    # ... 处理帮助逻辑 ...
    pass
```

## 执行流程与优先级总结

当 MRB2 接收到一个事件时，处理流程如下：

1.  **事件分类:** 框架将原始数据解析为具体的 `EventClassifier.Event` 子类对象 (`event_data`)，并可能生成多个相关的事件对象（如一个群消息同时是 `GroupMessageEvent` 和 `MessageEvent`）。
2.  **Matcher 筛选:**
    *   对于框架分发的 **每一个** 事件对象（如 `GroupMessageEvent` 实例）：
    *   框架找到所有通过 `on_event` 注册监听了该 **具体事件类型** (`GroupMessageEvent`) 的 `Matcher`。
    *   这些 `Matcher` 按照它们在 `on_event` 中设置的 `priority` **降序** (数字大的优先) 排列。
    *   依次遍历排序后的 `Matcher`：
        *   检查 `event_data` 是否 **同时满足** 该 `Matcher` 在 `on_event` 的 `rules` 参数中定义的所有 **初始规则**。
        *   如果 **全部满足**，则进入该 `Matcher` 的内部 Handler 筛选阶段。
        *   如果不满足，则跳过此 `Matcher`，继续检查（针对当前事件对象的）下一个 `Matcher`。
3.  **Handler 筛选与执行:**
    *   对于通过了初始规则筛选的 `Matcher`，框架获取其下所有通过 `register_handler` 注册的 `Handler` 函数。
    *   这些 `Handler` 按照它们在 `register_handler` 中设置的 `priority` **降序** (数字大的优先) 排列。
    *   依次遍历排序后的 `Handler`：
        *   **重要:** 创建一个 `event_data` 的 **副本** (框架内部处理，通常是浅拷贝，但 `CommandRule` 等规则可能会进行更深层次的修改)。
        *   检查这个 `event_data` 副本是否 **同时满足** 该 `Handler` 在 `register_handler` 的 `rules` 参数中定义的所有 **附加规则**。（注意：如果规则修改了 `event_data`，如 `CommandRule`，修改会作用于这个副本上）。
        *   如果 **全部满足**：
            *   框架将此 `Handler` 函数提交到 **线程池** 中执行，并将（可能已被规则修改过的） `event_data` 副本以及 `*args`, `**kwargs` 传递给它。
            *   等待 Handler 函数执行完成并获取其返回值。
            *   如果 Handler 返回 `True`，则**立即停止**检查和执行**当前 Matcher 内**优先级更低的 Handler。事件处理**不会**传递给当前 Matcher 内后续的 Handler。
            *   如果 Handler 返回 `None` 或其他非 `True` 值，则继续检查当前 `Matcher` 内的下一个 `Handler`。
        *   如果不满足附加规则，则跳过此 Handler，继续检查当前 `Matcher` 内的下一个 `Handler`。
4.  **继续 Matcher 遍历:** **无论** 当前 Matcher 内是否有 Handler 返回 `True`，事件处理流程都会 **继续** 到 **下一个 `Matcher`**（如果还有未检查的、匹配当前事件类型的 Matcher）。
5.  **流程结束:** 当针对某个具体的事件对象（如 `GroupMessageEvent` 实例），所有匹配其类型的 `Matcher` 及其内部所有匹配的 `Handler` 都已检查和执行完毕后，该事件对象的处理流程结束。框架会继续处理由原始数据产生的其他相关事件对象（如对应的 `MessageEvent` 实例）。

**核心要点:**

*   优先级决定顺序：先比 `Matcher` 优先级，再比同一 `Matcher` 内的 `Handler` 优先级。
*   规则层层过滤：`on_event` 规则先过滤，`register_handler` 规则再过滤。
*   `return True` **仅阻断** 当前 Matcher 内后续 Handler 的执行，**不影响** 其他 Matcher。
*   规则（尤其是 `CommandRule`）可能会修改传递给 Handler 的 `event_data` 副本。
*   判断事件来源（群聊/私聊）应检查 `event_data.message_type` 字段。

## 完整示例：群聊复读机与状态查询

```python
from Lib import *
import random

# --- 插件信息 ---
plugin_info = PluginManager.PluginInfo(
    NAME="示例插件",
    AUTHOR="Xiaosu",
    VERSION="1.0",
    DESCRIPTION="演示 EventHandlers 用法，提供复读和状态查询功能",
    HELP_MSG="发送 /repeat <内容> 进行复读\n发送 /status 查询状态 (需@Bot或私聊)"
)

logger = Logger.get_logger()

# --- Matcher 1: 处理复读命令 (仅群聊) ---
# 规则: 命令是 "repeat"，别名 "复读"
repeat_rule = EventHandlers.CommandRule("repeat", aliases={"复读"})
# 匹配器: 监听群消息事件，使用 repeat_rule，优先级 10
repeat_matcher = EventHandlers.on_event(
    EventClassifier.GroupMessageEvent, # 明确只监听群消息
    priority=10,
    rules=[repeat_rule]
)

@repeat_matcher.register_handler() # Handler 默认优先级 0
def handle_repeat(event_data: EventClassifier.GroupMessageEvent):
    """处理复读命令"""
    # 因为 on_event 指定了 GroupMessageEvent，所以这里 event_data 一定是群消息
    command_and_args = event_data.raw_message # CommandRule 处理后的纯文本: "repeat <内容>"
    parts = command_and_args.split(" ", 1)
    content_to_repeat = ""
    if len(parts) > 1:
        content_to_repeat = parts[1].strip()

    if not content_to_repeat:
        reply_msg = QQRichText.QQRichText(
            QQRichText.Reply(event_data.message_id),
            QQRichText.Text("你需要告诉我复读什么内容呀！")
        )
    else:
        # 简单的演示，直接发送 content_to_repeat 纯文本
        reply_msg = QQRichText.QQRichText(
             QQRichText.Reply(event_data.message_id),
             # 加上前缀避免可能的机器人复读循环
             QQRichText.Text(f"复读机:\n{content_to_repeat}")
        )

    try:
        # 明确知道是群消息，直接使用 event_data.group_id
        Actions.SendMsg(group_id=event_data.group_id, message=reply_msg).call()
        logger.info(f"在群 {event_data.group_id} 复读了消息")
    except Exception as e:
        logger.error(f"复读失败: {e}")

    # return True # 可以阻止当前 Matcher 内其他 Handler (如果存在)


# --- Matcher 2: 处理状态查询命令 (私聊或@Bot) ---
# 规则: 命令是 "status"，要求精确匹配，无参数
status_rule = EventHandlers.CommandRule("status", no_args=True)
# 匹配器: 监听所有消息事件，初始规则要求是 to_me 和 status_rule，优先级 5
status_matcher = EventHandlers.on_event(
    EventClassifier.MessageEvent, # 监听所有消息类型
    priority=5,
    rules=[EventHandlers.to_me, status_rule] # 必须是发给我的 status 命令
)

@status_matcher.register_handler()
def handle_status(event_data: EventClassifier.MessageEvent):
    """处理状态查询命令"""
    status_options = ["状态良好！", "正在摸鱼...", "动力满满！", "有点困了 Zzz"]
    current_status = random.choice(status_options)
    reply_text = f"当前状态: {current_status}"

    try:
        # 使用 message_type 判断是群聊还是私聊
        if event_data.message_type == "group":
             # 确保有 group_id (虽然 to_me 规则暗示了它是有效群消息)
            if "group_id" in event_data:
                Actions.SendMsg(
                    group_id=event_data.group_id,
                    message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
                ).call()
            else:
                logger.warning(f"处理状态查询时缺少 group_id: {event_data}")
        elif event_data.message_type == "private":
            Actions.SendPrivateMsg(user_id=event_data.user_id, message=reply_text).call()

        logger.info(f"响应了来自 {event_data.user_id} 的状态查询")
    except Exception as e:
        logger.error(f"回复状态查询失败: {e}")

    return True # 查询完状态后阻止当前 Matcher 内后续 Handler


# --- Matcher 3: 低优先级日志记录 ---
# 匹配器: 监听所有消息，无初始规则，优先级最低 (-10)
# 仅作为演示，实际框架中自带了日志记录，完全没必要写这个
log_matcher = EventHandlers.on_event(EventClassifier.MessageEvent, priority=-10)

@log_matcher.register_handler()
def log_messages(event_data: EventClassifier.MessageEvent):
    """记录收到的消息日志"""
    user_id = event_data.user_id
    msg_text = event_data.raw_message
    source = ""
    # 使用 message_type 判断来源
    if event_data.message_type == "group":
        group_id = event_data.get("group_id", "未知群")
        source = f"[群:{group_id}]"
    elif event_data.message_type == "private":
        source = "[私聊]"
    else:
        source = f"[{event_data.message_type}]" # 其他可能的消息类型

    logger.debug(f"收到消息 {source} 来自 {user_id}: {msg_text}")
    # 不返回 True，日志记录不应阻止其他功能
```
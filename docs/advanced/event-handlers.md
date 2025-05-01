# 事件处理器 (EventHandlers)

`EventHandlers` 模块是 MuRainBot2 (MRB2) 框架的非常重要的组件之一，专为插件开发者设计，用于精确地响应和处理机器人从 OneBot 实现端接收到的各种事件。通过定义规则 (Rule) 和注册处理函数 (Handler)，你可以让你的插件对特定的消息、通知或请求做出反应，并利用内置的状态管理进行更复杂的交互。

该模块位于 `Lib.utils.EventHandlers.py`。

## 核心概念

1.  **事件 (Event):** 由 `Lib.utils.EventClassifier` 定义。当 MRB2 从 Onebot 实现端接收到数据时，会将其解析为标准化的事件对象，例如 `EventClassifier.GroupMessageEvent` (群消息)、`EventClassifier.PrivateMessageEvent` (私聊消息)、`EventClassifier.NoticeEvent` (通知事件) 等。每个事件对象都携带了该事件的详细信息（如 `message_id`、`user_id`、`group_id`、`message_type`、`raw_message`、`message` 等）。
2.  **规则 (Rule):** 一个用于过滤事件的条件。它通常是一个 `EventHandlers.Rule` 的子类实例。规则的核心是一个 `match` 方法，该方法接收一个 `event_data` 对象，并返回 `True` (表示事件符合规则) 或 `False` (表示事件不符合规则)。MRB2 提供了多种内置规则，你也可以创建自定义规则。规则匹配过程中发生的错误会被记录并包含详细的回溯信息。
3.  **匹配器 (Matcher):** 通过 `EventHandlers.on_event()` 函数创建。一个 Matcher 绑定到一个特定的 **事件类型** (如 `EventClassifier.GroupMessageEvent`) 和一组可选的 **初始规则**。只有当一个事件的类型匹配 *并且* 满足所有初始规则时，该事件才会被考虑传递给此 Matcher 下注册的 Handler。Matcher 可以设置优先级，决定其匹配尝试的顺序。
4.  **处理器 (Handler):** 使用 `@Matcher实例.register_handler()` 装饰器注册到 Matcher 上的 **函数**。这是你编写插件核心逻辑的地方。每个 Handler 也可以定义自己的 **附加规则** 和优先级。只有当事件同时满足了 Matcher 的初始规则 *和* Handler 的附加规则时，该 Handler 函数才会被 MRB2 的 **线程池** 调用执行。
5.  **状态管理与依赖注入 (State Management & Dependency Injection):** MRB2 提供了 `Lib.utils.StateManager` 用于在**内存中临时存储**与用户或群组相关的状态。`EventHandlers` 集成了该功能，允许 Handler 函数通过 **特定名称的参数** (如 `state`, `user_state`, `group_state`) 自动接收和操作相应的状态数据。**重要警告：状态数据存储于内存中，会在机器人重启时丢失，需要持久化保存的数据请勿放在里面！**

## 使用 `on_event` 创建事件匹配器

要开始响应特定类型的事件，你需要使用 `EventHandlers.on_event()` 来创建一个 `Matcher`。此函数会自动检测并关联调用它的插件信息，无需手动指定。

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
specific_group_rule = EventHandlers.KeyValueRule("group_id", 12345, model="eq")

# 在 group_message_matcher 上注册一个处理函数
# priority: Handler 在 Matcher 内部的优先级
# rules: Handler 的附加规则，这里要求必须来自群 12345
@group_message_matcher.register_handler(
    priority=10, # 此 Handler 在 group_message_matcher 内部优先级为 10
    rules=[specific_group_rule] # 附加规则：必须匹配 specific_group_rule
)
# 注意：这里没有请求状态注入
def handle_specific_group_message(event_data: EventClassifier.GroupMessageEvent):
    """处理来自群 12345 的消息"""
    logger.info(f"收到来自特定群 {event_data.group_id} 的消息: {event_data.raw_message}")
    # ... (处理逻辑) ...
    # return True # 可以阻止当前 Matcher 内优先级更低的 Handler

# 示例：使用状态注入的 Handler
@group_message_matcher.register_handler(priority=5) # 假设这个 Handler 优先级较低
# 请求 user_state 和 group_state 的注入
def handle_with_state(event_data: EventClassifier.GroupMessageEvent, user_state: dict, group_state: dict):
    """处理群消息并使用状态"""
    # !!! 再次强调：user_state 和 group_state 中的数据是临时的，重启会丢失 !!!
    user_id = event_data.user_id
    group_id = event_data.group_id

    # 访问和修改用户状态 (user_state['data'] 是一个字典)
    user_count = user_state["data"].get("message_count", 0) + 1
    user_state["data"]["message_count"] = user_count
    logger.info(f"用户 {user_id} 在本插件的状态中已发送 {user_count} 条消息")

    # 访问和修改群组状态
    group_active = group_state["data"].get("is_active", False)
    if not group_active:
        group_state["data"]["is_active"] = True
        logger.info(f"群组 {group_id} 首次在本插件状态中标记为活跃")

    # user_state['state_id'] -> "u<user_id>"
    # group_state['state_id'] -> "g<group_id>"
    # user_state['other_plugin_data'] -> 其他插件在此 user_id 上的状态

    Actions.SendMsg(
        group_id=group_id,
        message=f"你在这个群已经发了 {user_count} 条消息啦！"
    ).call()

```

**`register_handler` 参数:**

*   `priority`: 可选。整数，定义此 `Handler` 在其所属 `Matcher` 内部的优先级，默认为 `0`。**数字越大，优先级越高**。在同一个 `Matcher` 内部，高优先级的 `Handler` 会先于低优先级的 `Handler` 尝试匹配和执行。
*   `rules`: 可选。一个包含 `Rule` 对象的列表 (`list[Rule]`)。事件在满足了 `on_event` 定义的初始规则后，还必须 **同时满足** 这个列表中的所有附加规则，这个 `Handler` 函数才会被执行。默认为空列表 `[]`。
*   `*args`, `**kwargs`: 可选。这些额外的参数会**静态地**传递给你定义的 `Handler` 函数，排在 `event_data` 和任何自动注入的参数之后。

**Handler 函数:**

*   必须是一个 **函数**。MRB2 会在内部的事件传播过程中调用它（通常在线程池中执行）。
*   第一个参数 **必须** 是 `event_data`，它就是匹配成功的那个事件对象。其类型与 `on_event` 中指定的 `event` 参数一致（或为其子类），建议使用类型注解（如 `event_data: EventClassifier.GroupMessageEvent`）以获得更好的开发和静态检查体验。
*   **依赖注入 (Dependency Injection):** 你可以通过在函数签名中包含特定名称的参数来请求自动注入状态数据。**【警告】注入的状态数据存储在内存中，重启后会丢失，请勿用于需要持久化的场景！**
    *   `state: dict`: 获取与当前交互最相关的状态。
        *   如果 `event_data` 是 `MessageEvent` 且 `event_data.message_type == "group"`，获取 `g<group_id>_u<user_id>` 的状态。
        *   如果 `event_data` 是 `MessageEvent` 且 `event_data.message_type == "private"`，获取 `u<user_id>` 的状态。
        *   **注意:** 如果事件不是 `MessageEvent` 或 `message_type` 不是 "group" 或 "private"，请求 `state` 会引发 `TypeError`。
    *   `user_state: dict`: 明确获取与当前用户 (`u<user_id>`) 关联的状态。适用于所有 `MessageEvent` 子类。如果事件不是 `MessageEvent`，会引发 `TypeError`。
    *   `group_state: dict`: 明确获取与当前群组 (`g<group_id>`) 关联的状态。仅适用于 `GroupMessageEvent`。如果事件不是 `GroupMessageEvent`，请求此参数会引发 `TypeError`。
    *   **状态对象结构:** 注入的 `state`, `user_state`, `group_state` 都是字典，包含以下键：
        *   `state_id` (`str`): 用于获取此状态的 ID (例如 `"u12345"`, `"g67890"`, `"g67890_u12345"`)。
        *   `data` (`dict`): **实际存储和操作状态数据的字典**。这是你最常使用的部分。它是**可变的**，你可以直接读写这个字典来管理状态。
        *   `other_plugin_data` (`dict`): 一个包含其他插件为相同 `state_id` 存储的状态数据的视图（通常较少直接使用）。
*   可以接收 `register_handler` 中传入的静态 `*args` 和 `**kwargs`。
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
    # 最好先检查 event_value 是否为 int
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
    # 必须先判断事件是否包含必要的字段
    if event_data.get("message_type") != "group":
        return False
    sender = event_data.get("sender")
    # 确保 sender 是字典类型再获取 role
    return isinstance(sender, dict) and sender.get("role") == "owner"

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

    # 提取参数
    command_and_args = event_data.raw_message # "echo <内容>"
    parts = command_and_args.split(" ", 1)
    content_to_echo = parts[1].strip() if len(parts) > 1 else ""

    if not content_to_echo:
        reply_text = "请告诉我需要复读什么内容，例如：/echo 你好"
    else:
        reply_text = content_to_echo # 直接复读内容

    # 根据消息类型发送回复
    if event_data.message_type == "group":
        # 健壮性检查：确保 group_id 存在
        if "group_id" in event_data:
            Actions.SendMsg(
                group_id=event_data.group_id,
                message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
            ).call()
        else:
            logger.warning(f"尝试在非群聊事件中发送群消息 (echo): {event_data}")
    elif event_data.message_type == "private":
         Actions.SendPrivateMsg(
            user_id=event_data.user_id,
            message=QQRichText.QQRichText(reply_text)
        ).call()

@matcher.register_handler(rules=[checkin_rule])
def handle_checkin(event_data: EventClassifier.MessageEvent):
    # event_data.raw_message 就是 "签到"
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
    elif event_data.message_type == "private":
         Actions.SendPrivateMsg(user_id=user_id, message=reply_text).call()

    # return True # 可以阻止当前 Matcher 内后续 Handler
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

*   前提：事件对象是 `MessageEvent` 的实例，否则会日志警告并返回 `False`。
*   事件对象的 `message_type` 为 `"private"`
*   **或者** 事件对象的 `message_type` 为 `"group"`，并且其 `message.rich_array` 中包含一个 `QQRichText.At` 段，其 `qq` 数据等于 `ConfigManager.GlobalConfig().account.user_id`。

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

## 状态管理器 (`StateManager`)

MRB2 提供了一个简单的内存状态管理器 `Lib.utils.StateManager`，允许插件**临时存储**与特定用户、群组或用户-群组组合相关的数据。

::: danger 警告：内存存储，重启丢失
**`StateManager` 中的所有数据都存储在内存中！** 这意味着当机器人程序**重启或关闭**时，**所有状态数据都会丢失**。

**请勿**将需要**持久化保存**的数据（例如用户积分、签到记录、插件配置、开关状态等）存储在 `StateManager` 中。对于需要持久化的数据，请考虑使用插件配置文件 (`PluginConfig`)、数据库或其他外部存储方案。

`StateManager` 主要适用于存储**临时的会话状态**，例如多步操作的当前步骤、用户正在进行的任务、临时的用户偏好等在一次运行期间有效的数据。
:::

**核心特性:**

*   **内存存储:** 所有状态数据存储在内存中，**会在机器人重启时丢失**。
*   **作用域:** 状态与一个 `state_id` (如 `"u12345"`, `"g67890"`, `"g67890_u12345"`) 和 **调用插件的路径** 相关联。不同插件为同一个 ID 存储的状态是隔离的。
*   **主要访问方式:** 通过 `EventHandlers` 的**依赖注入**功能，在 Handler 函数签名中声明 `state`, `user_state`, 或 `group_state` 参数来自动获取。
*   **数据结构:** 通过依赖注入获取的状态是一个字典，其中 `data` 键对应的值是实际存储状态的字典，你可以直接修改它。

**数据结构**

参考：
```python
{
    "state_id": state_id,
    "data": {  # 主要数据的位置
        k1: v1,
        k2: v2
    },
    "other_plugin_data": {  # 不要随意修改这里面的内容，这部分是属于其他插件的该state_id存储的数据
        plugin1_path: {
            "data": {
                k1: v1,
                k2: v2
            },
            "meta": {
                "plugin_data": plugin_data
            }
        },
        plugin2_path: {
            "data": {
                k1: v1,
                k2: v2
            },
            "meta": {
                "plugin_data": plugin_data
            }
        }
    }
}
```

**使用方法 (通过依赖注入):**

这是推荐的使用方式。参考上方 `Matcher.register_handler` -> `Handler 函数` -> `依赖注入` 部分的说明和示例。

```python
# 示例 Handler 使用 user_state
@matcher.register_handler(...)
def my_handler(event_data: EventClassifier.MessageEvent, user_state: dict):
    # !!! 再次提醒：user_state["data"] 中的数据是临时的 !!!
    # 获取或设置用户计数
    count = user_state["data"].get("visit_count", 0) + 1
    user_state["data"]["visit_count"] = count
    # user_state["data"] 现在是 {"visit_count": count} (如果之前为空)

    # ... 其他逻辑 ...
```

**手动访问 (较少使用):**

你也可以在代码的其他地方（如果能确定 `state_id` 和插件上下文）手动调用 `StateManager.get_state`。

```python
from Lib import StateManager
from Lib.core.PluginManager import get_caller_plugin_data # 或者直接传入插件数据

# 假设在某个函数内部
plugin_data = get_caller_plugin_data() # 获取当前插件信息
user_id = 12345
state_id = f"u{user_id}"

# 获取该用户的状态
user_state_manual = StateManager.get_state(state_id, plugin_data)

# 访问数据
if "last_command" in user_state_manual["data"]:
    print(f"用户 {user_id} 上次使用的命令是: {user_state_manual['data']['last_command']}")

# 修改数据 (同样是临时的)
user_state_manual["data"]["last_command"] = "/status"
```

## 执行流程与优先级总结

当 MRB2 接收到一个事件时，处理流程如下：

1.  **事件分类:** 框架将原始数据解析为具体的 `EventClassifier.Event` 子类对象 (`event_data`)，并可能生成多个相关的事件对象（如一个群消息同时是 `GroupMessageEvent` 和 `MessageEvent`）。
2.  **Matcher 筛选:**
    *   对于框架分发的 **每一个** 事件对象（例如，先处理 `GroupMessageEvent` 实例）：
    *   框架找到所有通过 `on_event` 注册监听了该 **具体事件类型** (`GroupMessageEvent`) 的 `Matcher` （这些 Matcher 来自不同的插件文件）。
    *   这些 `Matcher` 按照它们在 `on_event` 中设置的 `priority` **降序** (数字大的优先) 排列。
    *   依次遍历排序后的 `Matcher`：
        *   检查 `event_data` 是否 **同时满足** 该 `Matcher` 在 `on_event` 的 `rules` 参数中定义的所有 **初始规则**。
        *   如果 **全部满足**，则进入该 `Matcher` 的内部 Handler 筛选阶段。
        *   如果不满足，则跳过此 `Matcher`，继续检查（针对当前事件对象的）下一个 `Matcher`。
3.  **Handler 筛选与执行:**
    *   对于通过了初始规则筛选的 `Matcher`，框架获取其下所有通过 `register_handler` 注册的 `Handler` 函数。
    *   这些 `Handler` 按照它们在 `register_handler` 中设置的 `priority` **降序** (数字大的优先) 排列。
    *   依次遍历排序后的 `Handler`：
        *   **创建副本与规则匹配:** 创建一个 `event_data` 的 **副本**。检查这个副本是否 **同时满足** 该 `Handler` 在 `register_handler` 的 `rules` 参数中定义的所有 **附加规则**。规则（如 `CommandRule`）可能会修改这个副本。
        *   如果 **全部满足附加规则**：
            *   **依赖注入:** 检查 Handler 函数签名，如果包含 `state`, `user_state`, 或 `group_state`，则调用 `StateManager.get_state` 获取相应的状态数据，并准备注入。
            *   **执行:** 框架将此 `Handler` 函数提交到 **线程池** 中执行，并将（可能已被规则修改过的） `event_data` 副本、注入的状态数据以及静态 `*args`, `**kwargs` 传递给它。
            *   **处理返回值:** 等待 Handler 函数执行完成并获取其返回值。
                *   如果 Handler 返回 `True`，则**立即停止**检查和执行**当前 Matcher 内**优先级更低的 Handler。处理流程**跳出**当前 Matcher 的内部 Handler 循环。
                *   如果 Handler 返回 `None` 或其他非 `True` 值，则继续检查当前 `Matcher` 内的下一个 `Handler`。
        *   如果不满足附加规则，则跳过此 Handler，继续检查当前 `Matcher` 内的下一个 `Handler`。
4.  **继续 Matcher 遍历:** **无论** 当前 Matcher 内是否有 Handler 返回 `True`，事件处理流程都会 **继续** 到 **下一个 `Matcher`**（如果还有未检查的、匹配当前事件类型的 Matcher）。
5.  **处理其他事件对象:** 当针对某个具体的事件对象（如 `GroupMessageEvent` 实例）的所有匹配 Matcher 都处理完毕后，框架会继续处理由原始数据产生的其他相关事件对象（如对应的 `MessageEvent` 实例），重复步骤 2-4。
6.  **流程结束:** 所有相关的事件对象都处理完毕后，整个事件的处理流程结束。

**核心要点:**

*   优先级决定顺序：先比 `Matcher` 优先级，再比同一 `Matcher` 内的 `Handler` 优先级。
*   规则层层过滤：`on_event` 规则先过滤，`register_handler` 规则再过滤。
*   **`return True` 仅阻断当前 Matcher 内后续 Handler 的执行，不影响其他 Matcher。**
*   规则（尤其是 `CommandRule`）可能会修改传递给 Handler 的 `event_data` 副本。
*   判断事件来源（群聊/私聊）应检查 `event_data.message_type` 字段。
*   Handler 可以通过特定参数名 (`state`, `user_state`, `group_state`) 请求状态注入。
*   **状态是基于 `state_id` 和 插件 的内存存储，重启丢失。**

## 完整示例：带计数器的群聊复读机与状态查询

```python
from Lib import *
from Lib.core import PluginManager
import random

# --- 插件信息 ---
plugin_info = PluginManager.PluginInfo(
    NAME="示例插件Pro",
    AUTHOR="Xiaosu",
    VERSION="1.1",
    DESCRIPTION="演示 EventHandlers 和 StateManager 用法",
    HELP_MSG="发送 /repeat <内容> 进行复读 (会记录次数)\n发送 /status 查询状态 (需@Bot或私聊)"
)

logger = Logger.get_logger()

# --- Matcher 1: 处理复读命令 (仅群聊) ---
repeat_rule = EventHandlers.CommandRule("repeat", aliases={"复读"})
repeat_matcher = EventHandlers.on_event(
    EventClassifier.GroupMessageEvent, # 明确只监听群消息
    priority=10,
    rules=[repeat_rule]
)

# 这个 Handler 请求 'state' (即 g<group_id>_u<user_id> 的状态)
@repeat_matcher.register_handler()
def handle_repeat_with_count(event_data: EventClassifier.GroupMessageEvent, state: dict):
    """处理复读命令并计数"""
    # !!! 再次提醒：state["data"] 中的数据是临时的 !!!
    command_and_args = event_data.raw_message
    parts = command_and_args.split(" ", 1)
    content_to_repeat = parts[1].strip() if len(parts) > 1 else ""

    # 从 state['data'] 中获取或初始化计数
    repeat_count = state["data"].get("repeat_count", 0) + 1
    state["data"]["repeat_count"] = repeat_count # 更新状态

    if not content_to_repeat:
        reply_msg_text = "你需要告诉我复读什么内容呀！"
    else:
        reply_msg_text = f"复读机({repeat_count}):\n{content_to_repeat}"

    reply_msg = QQRichText.QQRichText(
         QQRichText.Reply(event_data.message_id),
         QQRichText.Text(reply_msg_text)
    )

    try:
        Actions.SendMsg(group_id=event_data.group_id, message=reply_msg).call()
        logger.info(f"用户 {event_data.user_id} 在群 {event_data.group_id} 第 {repeat_count} 次使用了复读")
    except Exception as e:
        logger.error(f"复读失败: {e}")

    # return True # 可以阻止当前 Matcher 内其他 Handler (如果存在)


# --- Matcher 2: 处理状态查询命令 (私聊或@Bot) ---
status_rule = EventHandlers.CommandRule("status", no_args=True)
status_matcher = EventHandlers.on_event(
    EventClassifier.MessageEvent, # 监听所有消息类型
    priority=5,
    rules=[EventHandlers.to_me, status_rule] # 必须是发给我的 status 命令
)

# 这个 Handler 请求 user_state
@status_matcher.register_handler()
def handle_status_with_user_state(event_data: EventClassifier.MessageEvent, user_state: dict):
    """处理状态查询命令并记录查询次数"""
    # !!! 再次提醒：user_state["data"] 中的数据是临时的 !!!
    status_options = ["状态良好！", "正在摸鱼...", "动力满满！", "有点困了 Zzz"]
    current_status = random.choice(status_options)

    # 记录用户查询次数
    query_count = user_state["data"].get("status_query_count", 0) + 1
    user_state["data"]["status_query_count"] = query_count

    reply_text = f"当前状态: {current_status}\n(你已查询 {query_count} 次)"

    try:
        if event_data.message_type == "group":
             # 确保有 group_id (虽然 to_me 规则暗示了它是有效群消息)
            if "group_id" in event_data:
                Actions.SendMsg(
                    group_id=event_data.group_id,
                    message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
                ).call()
            else:
                 logger.warning(f"尝试在非群聊事件中发送群聊状态回复: {event_data}")
        elif event_data.message_type == "private":
            Actions.SendPrivateMsg(user_id=event_data.user_id, message=reply_text).call()

        logger.info(f"响应了来自 {event_data.user_id} 的第 {query_count} 次状态查询")
    except Exception as e:
        logger.error(f"回复状态查询失败: {e}")

    return True # 查询完状态后阻止当前 Matcher 内后续 Handler
```

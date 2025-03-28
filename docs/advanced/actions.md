# 操作 (Actions)

`Actions` 模块是 MuRainBot2 (MRB2) 框架中用于与 OneBot V11 API 进行交互的标准方式。它将每一个 OneBot API 调用封装成一个独立的 `Action` 类，提供了统一的调用接口、结果处理、异步执行和回调机制，极大地简化了插件与机器人核心功能的交互。
p.s. 是对 `Lib.core.OnebotAPI.py` 的二次封装。

该模块位于 `Lib.utils.Actions.py`。

## 核心概念

1.  **Action 类:** 每个 OneBot API 端点（如 `send_private_msg`, `get_group_info`）都对应一个 `Action` 的子类（如 `Actions.SendPrivateMsg`, `Actions.GetGroupInfo`）。实例化这些类并配置好参数，就代表了一个准备执行的 API 调用。
2.  **执行 (`.call()`, `.call_async()`, `.call_get_result()`):** Action 对象本身不执行任何操作，直到你调用它的执行方法。
    *   `.call()`: **同步**执行 Action。它会阻塞当前线程，直到 API 调用完成（成功或失败）。
    *   `.call_async()`: **异步**执行 Action。它会将 Action 提交到框架的**线程池**执行，并**立即返回** Action 对象本身，不会阻塞当前线程。
    *   `.call_get_result()`: **同步**执行 Action 并**立即返回结果** (`Result` 对象)。相当于 `.call().get_result()` 的便捷写法。
3.  **结果 (`Result` 对象):** 每次 Action 执行后（无论是同步还是异步完成），其结果都会被包装在一个 `Actions.Result` 对象中。这个对象清晰地表示了 API 调用是成功还是失败。
    *   `result.is_ok`: (`bool`) 如果 API 调用成功，返回 `True`。
    *   `result.is_err`: (`bool`) 如果 API 调用过程中发生异常（如网络错误、API 返回错误码等），返回 `True`。
    *   `result.unwrap()`: 如果 `is_ok` 为 `True`，返回 API 成功的响应数据（通常是一个字典）；如果 `is_err` 为 `True`，则 **引发异常**。
    *   `result.unwrap_err()`: 如果 `is_err` 为 `True`，返回捕获到的异常对象；如果 `is_ok` 为 `True`，则 **引发异常**。
    *   `result.expect(message)`: 类似 `unwrap()`，但在失败时引发带自定义 `message` 的异常。
4.  **获取结果 (`.get_result()`):** 用于获取 Action 执行后的 `Result` 对象。
    *   如果在 `.call()` 或 `.call_get_result()` 之后调用，它会立即返回已存储的 `Result`。
    *   如果在 `.call_async()` 之后调用，它会 **阻塞当前线程**，直到异步任务完成，然后返回 `Result`。
    *   如果 Action 从未被执行过，调用 `.get_result()` 会引发异常。
5.  **回调函数 (`callback`):** 可以在实例化 Action 时传入 `callback` 参数，或之后使用 `.set_callback()` 方法设置。这个函数会在 Action **执行完毕** (无论成功或失败) 后被调用，并接收 `Result` 对象作为参数。回调函数本身会在 Action 执行所在的线程（同步调用在当前线程，异步调用在线程池的某个线程）中执行。
6.  **自动日志:** 当 Action **成功**执行时，其对应的 `logger` 方法会被自动调用，记录一条信息级别的日志（例如，发送了什么消息给谁）。

## 如何使用 Actions

### 1. 实例化 Action

选择你需要的 Action 类，并传入相应的参数来创建实例。

```python
# 准备发送一条私聊消息
action_send = Actions.SendPrivateMsg(
    user_id=123456789,
    message="你好！这是一条来自 MRB2 的消息。"
)

# 准备获取群信息
action_get_group = Actions.GetGroupInfo(
    group_id=987654321,
    no_cache=True # 要求不使用缓存，获取最新信息
)

# 准备发送带图片的消息 (使用 QQRichText 构建)
rich_message = QQRichText.QQRichText(
    QQRichText.Text("看这张图："),
    QQRichText.Image(file="file:///path/to/image.jpg") # 支持本地文件、网络 URL 或 base64（data url）
)
action_send_rich = Actions.SendGroupMsg(
    group_id=987654321,
    message=rich_message
)
```

### 2. 执行 Action 并处理结果

你有多种方式执行 Action：

**方式一：同步执行并检查结果 (最常用)**

```python
# 执行发送私聊消息的操作
result = action_send.call_get_result() # 同步执行并获取 Result

if result.is_ok:
    # API 调用成功
    response_data = result.unwrap() # 获取 API 返回的数据 (通常包含 message_id)
    logger.info(f"消息发送成功！消息 ID: {response_data.get('message_id')}")
else:
    # API 调用失败
    error = result.unwrap_err() # 获取捕获到的异常
    logger.error(f"消息发送失败: {error}")
```

**方式二：同步执行 (不立即处理结果，可用于简单触发)**

```python
# 执行踢人操作，不关心具体结果，只关心是否执行
Actions.SetGroupKick(group_id=gid, user_id=uid).call()
# 注意：虽然不处理 Result，但如果 API 调用失败，错误日志仍会被框架记录。
```

**方式三：异步执行 (不阻塞当前 Handler)**

```python
# 异步发送一条消息，不阻塞当前事件处理流程
action_notify = Actions.SendGroupMsg(group_id=gid, message="正在处理您的请求，请稍候...")
action_notify.call_async() # 提交到线程池，立即返回

# ... 当前 Handler 可以继续执行其他逻辑 ...

# 如果在后续某个点需要知道异步操作的结果
# result = action_notify.get_result() # 这会阻塞，直到异步任务完成
# if result.is_ok:
#     logger.info("异步通知发送完成")
```

**方式四：使用回调函数**

```python
def my_callback(result: Actions.Result):
    """Action 完成后会被调用的函数"""
    if result.is_ok:
        logger.info(f"回调：操作成功，结果: {result.unwrap()}")
    else:
        logger.warning(f"回调：操作失败，错误: {result.unwrap_err()}")

# 实例化时传入回调
action_with_cb = Actions.GetLoginInfo(callback=my_callback)
action_with_cb.call() # 同步执行，执行完后调用 my_callback

# 或者异步执行带回调
action_async_cb = Actions.GetFriendList().set_callback(my_callback) # 先设置回调
action_async_cb.call_async() # 异步执行，执行完后在线程池中调用 my_callback
```

### 3. 方法链式调用

大部分 Action 方法（如 `.call()`, `.call_async()`, `.set_callback()`, `.wait_async()`）返回 Action 对象本身，允许链式调用。

```python
# 异步调用并等待完成，然后获取结果
result = Actions.GetStatus().call_async().wait_async().get_result()

# 同步调用并设置回调
Actions.CleanCache().set_callback(lambda res: logger.info("缓存清理完成")).call()
```

## `Result` 对象详解

`Result` 对象是处理 Action 执行结果的关键。

```python
result = Actions.SomeAction(...).call_get_result()

# 检查成功/失败
if result.is_ok:
    # 安全地获取成功结果
    success_data = result.unwrap()
    print(f"成功: {success_data}")
    try:
        # 尝试获取错误会失败
        error = result.unwrap_err()
    except Exception as e:
        print(f"在 Ok 值上调用 unwrap_err 引发异常: {e}")
elif result.is_err:
    # 安全地获取错误信息
    error_obj = result.unwrap_err()
    print(f"失败: {error_obj}")
    try:
        # 尝试获取成功结果会失败
        data = result.unwrap()
    except Exception as e:
        print(f"在 Err 值上调用 unwrap 引发异常: {e}")

    # 或者使用 expect 获取成功结果，失败时提供自定义消息
    try:
        data = result.expect("API 调用必须成功！")
    except Exception as e:
        print(f"Expect 失败: {e}") # 会打印 "API 调用必须成功！"
```

## 可用的 Actions 列表

请查看 [Onebot11文档](https://github.com/botuniverse/onebot-11/blob/master/api/public.md)

## 完整示例

```python
from Lib import *
import time

# --- 插件信息 ---
plugin_info = PluginManager.PluginInfo(
    NAME="Action示例",
    AUTHOR="Xiaosu",
    VERSION="1.0",
    DESCRIPTION="演示 Actions 模块的各种用法"
)

logger = Logger.get_logger()

# --- Matcher: 监听特定命令 ---
cmd_rule = EventHandlers.CommandRule("action_test")
matcher = EventHandlers.on_event(EventClassifier.MessageEvent, rules=[cmd_rule])

# --- Handler ---
@matcher.register_handler()
def handle_action_test(event_data: EventClassifier.MessageEvent):

    user_id = event_data.user_id
    reply_prefix = QQRichText.Reply(event_data.message_id)

    # --- 示例 1: 同步发送消息并处理结果 ---
    logger.info("示例1：同步发送消息")
    send_result = Actions.SendMsg(
        user_id=user_id if event_data.message_type == 'private' else -1,
        group_id=event_data.get("group_id", -1) if event_data.message_type == 'group' else -1,
        message=QQRichText.QQRichText(reply_prefix, "测试同步发送...")
    ).call_get_result()

    if send_result.is_ok:
        msg_id = send_result.unwrap().get('message_id')
        logger.info(f"同步消息发送成功, msg_id: {msg_id}")
        # --- 示例 2: 延迟撤回消息 (异步) ---
        logger.info("示例2：5秒后异步撤回消息")
        Actions.DeleteMsg(message_id=msg_id).call_async() # 提交异步撤回，但不等待
        # 这里需要注意，如果希望准确在5秒后撤回，需要更精确的定时机制
        # 简单的演示是直接异步调用
    else:
        logger.error(f"同步消息发送失败: {send_result.unwrap_err()}")

    # --- 示例 3: 异步获取信息并使用回调 ---
    logger.info("示例3：异步获取群列表并使用回调")
    def group_list_callback(result: Actions.Result):
        if result.is_ok:
            groups = result.unwrap()
            group_count = len(groups)
            logger.info(f"回调：成功获取群列表，共 {group_count} 个群")
            # 在回调中再次发起 Action (例如通知用户)
            Actions.SendMsg(
                user_id=user_id if event_data.message_type == 'private' else -1,
                group_id=event_data.get("group_id", -1) if event_data.message_type == 'group' else -1,
                message=f"我加入了 {group_count} 个群聊哦！"
            ).call() # 在回调中通常也使用同步调用，因为它已在线程池中
        else:
            logger.error(f"回调：获取群列表失败: {result.unwrap_err()}")

    Actions.GetGroupList(callback=group_list_callback).call_async()

    # --- 示例 4: 同步获取信息并处理 ---
    logger.info("示例4：同步获取登录信息")
    login_info_result = Actions.GetLoginInfo().call_get_result()
    try:
        login_info = login_info_result.unwrap() # 如果失败会抛出异常
        logger.info(f"当前登录账号：{login_info.get('nickname')} ({login_info.get('user_id')})")
    except Exception as e:
        logger.error(f"获取登录信息失败: {e}") # e 就是 Result.unwrap_err() 的内容

    # Handler 结束，异步任务可能仍在后台执行
```

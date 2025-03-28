# QQ 富文本 (QQRichText)

`QQRichText` 模块是 MuRainBot2 (MRB2) 框架中用于处理和构建复杂 QQ 消息内容的核心工具。QQ 消息不仅仅是纯文本，还可以包含图片、@某人、表情、语音、XML/JSON 卡片等多种元素。`QQRichText` 模块提供了一套面向对象的接口，让插件开发者能够方便地创建、解析和操作这些包含多种元素的消息。

该模块位于 `Lib.utils.QQRichText.py`。

## 核心概念

1.  **富文本 (Rich Text):** 指包含多种类型内容（如文本、图片、@等）的消息。
2.  **消息段 (Segment):** 构成富文本消息的基本单元。每个消息段代表一种特定类型的内容（如 `Text` 代表文本，`Image` 代表图片，`At` 代表@某人）。`QQRichText` 模块为每种 OneBot v11 标准消息段类型都提供了一个对应的 Python 类（如 `QQRichText.Text`, `QQRichText.Image` 等），它们都继承自基类 `QQRichText.Segment`。
3.  **CQ Code (字符串格式):** OneBot v11 使用的一种文本表示格式来描述富文本消息。例如：`[CQ:at,qq=12345] Hello [CQ:face,id=178]`。
4.  **消息段数组 (Array 格式):** OneBot v11 定义的另一种表示富文本消息的格式，是一个列表 (`list`)，其中每个元素是一个字典 (`dict`)，描述一个消息段。例如：`[{'type': 'at', 'data': {'qq': '12345'}}, {'type': 'text', 'data': {'text': ' Hello '}}, {'type': 'face', 'data': {'id': '178'}}]`。**这是 MRB2 框架内部（尤其是 `Actions` 模块发送消息时）主要使用的格式。**
5.  **`QQRichText` 对象:** 这是本模块的核心类。它封装了一个消息段列表（内部存储为 `Segment` 对象的列表 `rich_array`），并提供了方便的方法来创建、组合和转换富文本消息。它可以从 CQ Code 字符串、消息段数组、单个或多个 `Segment` 对象等多种形式进行初始化。

## `QQRichText` 类

这是用于创建和操作富文本消息的主要类。

### 创建 `QQRichText` 对象

`QQRichText` 的构造函数 (`__init__`) 非常灵活，可以接受多种类型的输入来初始化富文本内容：

1.  **单个 CQ Code 字符串:**
    ```python
    cq_string = "[CQ:at,qq=123] 你好 [CQ:image,file=abc.jpg]"
    rich_text = QQRichText.QQRichText(cq_string)
    ```

2.  **单个 `Segment` 对象:**
    ```python
    text_segment = QQRichText.Text("这是一段文本。")
    rich_text = QQRichText.QQRichText(text_segment)

    at_segment = QQRichText.At(123456789)
    rich_text_at = QQRichText.QQRichText(at_segment)
    ```

3.  **多个 `Segment` 对象作为参数:**
    ```python
    rich_text = QQRichText.QQRichText(
        QQRichText.Text("回复 "),
        QQRichText.At(987654321),
        QQRichText.Text("：收到！"),
        QQRichText.Face(178) # QQ 表情
    )
    ```

4.  **`Segment` 对象的列表或元组:**
    ```python
    segments_list = [
        QQRichText.Text("结果："),
        QQRichText.Image(file="file:///path/to/result.png")
    ]
    rich_text = QQRichText.QQRichText(segments_list)
    ```

5.  **消息段数组 (List of Dicts):**
    ```python
    array_format = [
        {'type': 'reply', 'data': {'id': '12345'}},
        {'type': 'text', 'data': {'text': '好的，已处理。'}}
    ]
    rich_text = QQRichText.QQRichText(array_format)
    ```

6.  **混合类型的列表或元组:** (包含 CQ Code 字符串、`Segment` 对象、字典等)
    ```python
    mixed_input = [
        QQRichText.Reply(event_data.message_id), # 假设 event_data 已定义
        "请看这张图：",                         # 字符串会被解析
        QQRichText.Image(file="http://example.com/img.jpg"),
        {'type': 'face', 'data': {'id': '10'}} # 字典格式
    ]
    rich_text = QQRichText.QQRichText(mixed_input)
    ```

7.  **另一个 `QQRichText` 对象:** (相当于复制)
    ```python
    existing_rich_text = QQRichText.QQRichText("原始内容")
    new_rich_text = QQRichText.QQRichText(existing_rich_text)
    ```

内部实现会将所有这些输入统一转换成一个 `Segment` 对象的列表，存储在 `self.rich_array` 中。

### 主要方法和属性

*   **`get_array() -> list[dict]`**:
    *   **极其重要的方法！** 返回符合 OneBot v11 标准的消息段数组格式 (`list[dict]`)。
    *   **主要用途:** 将构建好的 `QQRichText` 对象传递给 `Actions` 模块进行发送 (例如 `Actions.SendMsg(message=rich_text.get_array())`)。虽然 `Actions` 的 `message` 参数可以直接接受 `QQRichText` 对象（内部会自动调用 `get_array()`），但了解这个方法有助于理解数据流。
    ```python
    message_to_send = QQRichText.QQRichText(...)
    array_for_api = message_to_send.get_array()
    # Actions.SendMsg(..., message=array_for_api).call()
    # 或者更简洁：
    Actions.SendMsg(..., message=message_to_send).call()
    ```

*   **`__str__() -> str` / `__repr__() -> str`**:
    *   将内部的 `Segment` 列表转换回 **CQ Code 字符串** 格式。
    *   **主要用途:** 日志记录、调试打印、发送消息、或需要 CQ Code 字符串表示的场景。
    ```python
    rich_text = QQRichText.QQRichText(QQRichText.At(123), " Hello")
    cq_code = str(rich_text) # cq_code == "[CQ:at,qq=123] Hello"
    print(f"将要发送的消息 (CQ Code): {rich_text}")
    ```

*   **`render(group_id: int | None = None) -> str`**:
    *   生成一个 **人类可读** 的字符串表示形式，尝试将 `@` 显示为昵称（如果 `group_id` 提供且能在缓存中找到），将图片/语音等显示为 `[类型: 描述]`。
    *   **主要用途:** 在控制台或日志中更直观地显示消息内容，**不适用于** 机器人发送消息。
    *   `group_id`: 可选参数，提供群号有助于 `@` 消息段渲染出正确的群昵称。
    ```python
    rich_text = QQRichText.QQRichText(QQRichText.At(123), " 发送了图片 ", QQRichText.Image("abc.jpg"))
    # 假设在群 456 中，123 的昵称是 "张三"
    readable_string = rich_text.render(group_id=456)
    # readable_string 可能类似于 "@张三: 123 发送了图片 [图片: abc.jpg]" (具体取决于 QQDataCacher)
    logger.info(f"收到的消息内容: {rich_text.render(event_data.get('group_id'))}")
    ```

*   **`add(*segments: str | dict | list | tuple | Segment | QQRichText) -> QQRichText`**:
    *   向当前 `QQRichText` 对象的末尾追加一个或多个消息段。接受的参数类型与构造函数类似。
    *   返回 `self`，支持链式调用。
    ```python
    rich_text = QQRichText.QQRichText("开始：")
    rich_text.add(QQRichText.Text("添加文本 "), QQRichText.Face(1))
    rich_text.add("[CQ:at,qq=all]") # 也可以添加 CQ Code
    print(rich_text) # 输出：开始：添加文本 [CQ:face,id=1][CQ:at,qq=all]
    ```

*   **`rich_array: list[Segment]`**:
    *   实例属性，存储内部的 `Segment` 对象列表。可以直接访问和操作（但不推荐直接修改，除非明确知道后果）。

### 操作符重载

*   **`+` (加法):** 连接两个 `QQRichText` 对象或一个 `QQRichText` 对象与其他可接受的输入类型，返回一个新的 `QQRichText` 对象。
    ```python
    rt1 = QQRichText.QQRichText("Part 1 ")
    rt2 = QQRichText.QQRichText(QQRichText.At(123))
    combined_rt = rt1 + rt2 + " Part 3" # "Part 3" 会被自动转为 Text 段
    print(combined_rt) # 输出: Part 1 [CQ:at,qq=123] Part 3
    ```
*   **`==` (等于):** 比较两个 `QQRichText` 对象的内部 `Segment` 列表是否完全相同。

## `Segment` 类及其子类

`Segment` 是所有消息段类的基类。插件开发者通常直接使用其子类来构建消息。

### 通用基类 `Segment`

*   `segment_type`: 类属性，标识该段的类型（如 `"text"`, `"image"`）。
*   `array`: 实例属性，存储该段对应的 OneBot 消息段字典 (`{'type': ..., 'data': ...}`)。
*   `cq`: 实例属性，该段对应的 CQ Code 字符串。
*   `data`: 实例属性 (通过 `__init__` 或 `array` 间接访问)，包含该段的具体数据 (如 `Text` 的 `text` 内容，`Image` 的 `file` 链接等)。
*   `render()`: 提供默认的 `[类型: CQ码]` 渲染，通常被子类覆盖。
*   `set_data(k, v)`: 修改 `data` 字典中的项。

### 常用 `Segment` 子类列表

以下是常用的消息段类及其构造函数：

*   **`Text(text: str)`**: 纯文本。
    *   `text`: 文本内容。
    *   `set_text(text)`: 修改文本内容。
    *   `render()`: 直接返回文本内容。

*   **`Face(face_id: int | str)`**: QQ 表情 (小黄脸)。
    *   `face_id`: 表情 ID (数字或字符串)。
    *   `set_id(face_id)`: 修改表情 ID。
    *   `render()`: 返回 `[表情: id]`。

*   **`At(qq: int | str)`**: @某人。
    *   `qq`: 要 @ 的 QQ 号码。特殊值 `"all"` 或 `0` 表示 @全体成员 (需机器人有权限)。
    *   `set_id(qq_id)`: 修改 QQ 号码。
    *   `render(group_id)`: 尝试渲染为 `@昵称: qq` 或 `@全体成员`。

*   **`Image(file: str)`**: 图片。
    *   `file`: 图片来源。可以是：
        *   **本地文件路径:** 会被自动转换为 `file://` URL (如 `"/home/user/img.png"` -> `"file:///home/user/img.png"`)。
        *   **网络 URL:** 如 `"http://example.com/image.jpg"`。
        *   **Base64 编码:** 如 `"base64://..."`。
        *   `file://` URL。
    *   `set_file(file)`: 修改图片来源 (同样会自动转换路径)。
    *   `render()`: 返回 `[图片: file]`。

*   **`Record(file: str)`**: 语音。
    *   `file`: 语音来源 (格式同 `Image`)。
    *   `set_file(file)`: 修改语音来源。
    *   `render()`: 返回 `[语音: file]`。

*   **`Video(file: str)`**: 短视频。
    *   `file`: 视频来源 (格式同 `Image`)。
    *   `set_file(file)`: 修改视频来源。
    *   `render()`: 返回 `[视频: file]`。

*   **`Reply(message_id: int | str)`**: 回复消息。通常放在消息的最前面。
    *   `message_id`: 要回复的那条消息的 ID。
    *   `set_message_id(message_id)`: 修改回复的消息 ID。
    *   `render()`: 返回 `[回复: message_id]`。

*   **`Node(name: str, user_id: int, message: str | list | tuple | dict | Segment | QQRichText, message_id: int = None)`**: 合并转发节点。用于 **构建** 合并转发消息。
    *   **用法1 (自定义内容):** 提供 `name` (发送者昵称), `user_id` (发送者QQ), `message` (该节点的消息内容)。
    *   **用法2 (引用消息):** 提供 `message_id` (要转发的某条历史消息的 ID)，此时 `name`, `user_id`, `message` 参数将被忽略。
    *   `set_name(name)`, `set_user_id(user_id)`, `set_message(message)`: 修改节点内容。
    *   **注意:** 合并转发消息本身需要通过特定的 API 发送（OneBot v11 标准未定义，通常是扩展 API，如 `send_group_forward_msg` 或在 `SendGroupMsg` / `SendPrivateMsg` 中使用 `[CQ:forward,id=...]` 类型的 `Forward` 段）。`Node` 段本身是用于构建合并转发内容的。

*   **`Forward(forward_id: str)`**: 合并转发消息段 (用于 **发送** 已存在的合并转发记录)。
    *   `forward_id`: 通过 `get_forward_msg` API 获取到的合并转发 ID，或者由某些 OneBot 实现（如 go-cqhttp）在 `SendMsg` 返回的 `message_id` 中特殊标记。
    *   `set_forward_id(forward_id)`: 修改 ID。
    *   `render()`: 返回 `[合并转发: forward_id]`。

*   **`Share(url: str, title: str, content: str = "", image: str = "")`**: 链接分享。
    *   `url`: 点击分享后跳转的 URL。
    *   `title`: 分享标题。
    *   `content`: (可选) 内容描述。
    *   `image`: (可选) 预览图片的 URL。

*   **`Music(type_: str, id_: int | str)`**: 音乐分享 (通过平台 ID)。
    *   `type_`: 音乐平台类型，如 `"qq"`, `"163"` (网易云), `"xm"` (虾米)。
    *   `id_`: 对应平台的音乐 ID。

*   **`CustomizeMusic(url: str, audio: str, title: str, content: str = "", image: str = "")`**: 自定义音乐分享 (通过 URL)。
    *   `url`: 点击跳转的 URL。
    *   `audio`: 音乐文件的 URL。
    *   `title`: 歌曲标题。
    *   `content`: (可选) 歌手或描述。
    *   `image`: (可选) 封面图片的 URL。

*   **`XML(data: str)`**: XML 消息 (卡片消息)。
    *   `data`: XML 代码字符串。

*   **`JSON(data: str)`**: JSON 消息 (卡片消息)。
    *   `data`: JSON 代码字符串。
    *   `get_json()`: 尝试将内部 `data` 字符串解析为 Python 对象。

*   **其他不常用段:** `Rps` (猜拳), `Dice` (骰子), `Shake` (窗口抖动), `Poke` (戳一戳), `Anonymous` (匿名标记，用于发送匿名消息), `Contact` (推荐好友/群), `Location` (位置)。(构造函数请参考代码或 [OneBot v11 文档](https://github.com/botuniverse/onebot-11/blob/master/message/segment.md))。

## 工具函数

模块内还包含一些底层转换函数，通常由 `QQRichText` 和 `Segment` 内部调用，但也可以直接使用：

*   **`cq_decode(text: str, in_cq: bool = False) -> str`**: 解码 CQ Code 中的特殊字符 (`&amp;`, `&#91;`, `&#93;`, `&#44;`)。
*   **`cq_encode(text: str, in_cq: bool = False) -> str`**: 编码特殊字符为 CQ Code 兼容格式。
*   **`cq_2_array(cq: str) -> list[dict]`**: 将 CQ Code 字符串解析为消息段数组。
*   **`array_2_cq(cq_array: list | dict) -> str`**: 将消息段数组转换为 CQ Code 字符串。
*   **`convert_to_fileurl(input_str: str) -> str`**: 尝试将本地路径、URL 或 base64 字符串统一转换为适用于 OneBot 的文件引用格式（优先转为 `file://` URL）。如果输入已经是有效 URL 或 base64，则直接返回。

## 完整示例：构建并发送复杂消息

```python
from Lib import *

logger = Logger.get_logger()

# --- Matcher & Handler (假设) ---
cmd_rule = EventHandlers.CommandRule("rich_test")
matcher = EventHandlers.on_event(EventClassifier.GroupMessageEvent, rules=[cmd_rule])

@matcher.register_handler()
def handle_rich_test(event_data: EventClassifier.GroupMessageEvent):
    user_id = event_data.user_id
    group_id = event_data.group_id
    sender_nickname = event_data.sender.get("card") or event_data.sender.get("nickname", str(user_id))

    logger.info("开始构建富文本消息...")

    # 1. 使用构造函数和 add 方法逐步构建
    message = QQRichText.QQRichText(
        QQRichText.Reply(event_data.message_id), # 回复原始消息
        QQRichText.At(user_id),                  # @ 发送者
        f" 你好, {sender_nickname}！\n"           # f-string 自动转为 Text
    )
    message.add(
        "这是一条包含多种元素的消息：\n",
        QQRichText.Face(178),                    # QQ表情
        QQRichText.Image("https://www.example.com/logo.png"), # 网络图片
        "\n这是本地图片：",
        QQRichText.Image("/path/to/your/local/image.jpg") # 本地图片 (路径需存在)
    )

    # 2. 添加一个分享链接
    share = QQRichText.Share(
        url="https://github.com/Xiaosu-Development-Team/MuRainBot",
        title="MuRainBot V2 - 高性能 QQ 机器人框架",
        content="欢迎 Star 和 Fork！",
        image="https://avatars.githubusercontent.com/u/104340129?s=200&v=4"
    )
    message.add("\n分享一个项目：", share)

    # 3. 准备发送
    logger.info(f"构建完成的消息 (CQ Code): {message}") # 打印 CQ Code 用于调试
    logger.info(f"构建完成的消息 (Rendered): {message.render(group_id)}") # 打印可读版本

    try:
        # 使用 Actions 发送，直接传递 QQRichText 对象
        result = Actions.SendMsg(
            group_id=group_id,
            message=message
        ).call_get_result()

        if result.is_ok:
            logger.info("富文本消息发送成功！")
        else:
            logger.error(f"富文本消息发送失败: {result.unwrap_err()}")

    except Exception as e:
        logger.exception(f"发送富文本消息时发生意外错误: {e}")

```

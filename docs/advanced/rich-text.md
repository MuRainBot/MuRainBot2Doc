# QQ 富文本 (QQRichText)

`QQRichText` 模块是 MuRainBot2 框架中用于处理和构建复杂 QQ 消息内容的核心工具。无论是简单的文本，还是包含图片、@某人、表情、语音、卡片分享的消息，都可以通过 `QQRichText` 模块轻松创建和操作。

## 快速上手：构建一条复杂消息

让我们从一个具体的例子开始。假设我们想让机器人在收到特定指令后，回复一条包含多种元素的消息：回复原消息、@发送者、发送文字、表情、网络图片和本地图片，并附带一个链接分享。

```python
# 假设在你的插件 __init__.py 文件中
from murainbot import QQRichText, CommandManager
from murainbot.core import PluginManager

plugin_info = PluginManager.PluginInfo(...) # 插件信息

# 创建命令匹配器
matcher = CommandManager.on_command("rich_test")

@matcher.register_command("") # 无需额外参数
def handle_rich_test(event: CommandManager.CommandEvent):
    # 1. 创建一个 QQRichText 对象，并开始构建消息
    # 构造函数可以接受任意数量的消息段对象或字符串
    message_to_send = QQRichText.QQRichText(
        QQRichText.Reply(event.message_id),  # 回复触发命令的消息
        QQRichText.At(event.user_id),        # @ 发送者
        " 你好！这是一条包含多种元素的消息：\n[CQ:video,file=https://www.example.com/video.mp4]", # 字符串会自动按照CQCode 格式解析为消息段
        QQRichText.Face(178),                # QQ 系统表情
        QQRichText.Image("https://www.example.com/logo.png") # 网络图片
    )

    # 2. 使用加法操作符 (+) 继续添加内容
    message_to_send += QQRichText.QQRichText(
        "\n这是本地图片：",
        QQRichText.Image("/path/to/your/local/image.jpg") # 本地图片
    )

    # 3. 创建一个分享消息段，并添加到消息末尾
    share_segment = QQRichText.Share(
        url="https://github.com/MuRainBot/MuRainBot2",
        title="MuRainBot2 - 轻量级 OneBot v11 框架",
        content="简洁、高效，支持命令系统和依赖注入。",
        image="https://avatars.githubusercontent.com/u/104340129?s=200&v=4"
    )
    message_to_send.add("\n分享一个项目：", share_segment)

    # 4. 使用 event.reply() 发送构建好的消息
    # QQRichText 对象可以直接用于发送，框架会自动处理
    event.reply(message_to_send)
```

这个例子几乎展示了 `QQRichText` 模块的所有核心功能：
-   使用 `QQRichText.QQRichText` 类来封装整条消息。
-   使用 `QQRichText.Reply`, `At`, `Image`, `Face`, `Share` 等子类来创建具体的消息段 (Segment)。
-   灵活地组合这些消息段，无论是通过构造函数、加法操作符(`+`)还是 `add()` 方法。
-   将构建完成的 `QQRichText` 对象直接传递给 `event.reply()` 进行发送。

接下来，我们将详细解析这些组件。

## 核心概念

1.  **消息段 (Segment)**: 构成一条完整 QQ 消息的基本单元。每个消息段代表一种特定类型的内容，例如一段文本、一张图片或一个@提醒。在 `QQRichText` 模块中，每种消息段都对应一个 Python 类（如 `QQRichText.Text`, `QQRichText.Image`），它们都继承自基类 `QQRichText.Segment`。

2.  **`QQRichText` 对象**: 整个模块的核心，可以看作是一个“消息容器”。它内部维护一个消息段（`Segment` 对象）的列表，并提供了丰富的方法来创建、组合和转换这条消息。

3.  **CQ Code (字符串格式)**: OneBot v11 协议使用的一种文本格式来表示富文本消息，例如 `[CQ:at,qq=12345] Hello [CQ:face,id=178]`。`QQRichText` 对象可以被轻松地转换为这种格式。

4.  **消息段数组 (Array 格式)**: OneBot v11 协议的另一种消息表示格式，是一个 `list`，其中每个元素是一个 `dict`。这是 MRB2 框架内部与 OneBot 实现端通信时**主要使用的格式**。`QQRichText` 对象也可以被轻松转换为这种格式。

## `QQRichText` 类：消息容器

这是用于创建和操作富文本消息的主要类。

### 创建 `QQRichText` 对象

如开篇示例所示，`QQRichText` 的构造函数非常灵活，可以接受多种类型的输入：

-   **单个或多个 `Segment` 对象**: `QQRichText(QQRichText.Text("你好"), QQRichText.At(123))`
-   **字符串**: 会被自动按 CQ Code 解析: `QQRichText("[CQ:at,qq=123] 你好")` 目前 MRB2 的 CQ Code 解析器非常严格，请注意格式，不推荐使用，并且如果输入内容可能不安全，且仅需文本，请使用 `QQRichText.Text()` 来创建。
-   **`Segment` 对象的列表或元组**: `QQRichText([QQRichText.Text("..."), ...])`
-   **消息段数组**: `QQRichText([{'type': 'text', 'data': {'text': '...'}}, ...])`
-   **混合以上所有类型**: `QQRichText(QQRichText.Reply(123), "请看图：", [CQ:image,...])`
-   **另一个 `QQRichText` 对象**: 相当于复制一份。

### 主要方法和属性

-   **`add(*segments)`**:
    -   向当前 `QQRichText` 对象的末尾追加一个或多个消息段，同时返回self，可以链式调用。
    -   `message.add(QQRichText.Text("..."), QQRichText.Face(1)).add(QQRichText.At(1))`

-   **`__str__()`**:
    -   将 `QQRichText` 对象转换为 **CQ Code 字符串**。非常适合用于日志记录和调试。
    -   `print(f"将发送: {message_to_send}")`

-   **`get_array() -> list[dict]`**:
    -   **重要方法**。返回符合 OneBot 标准的消息段数组格式。
    -   当你需要手动调用底层 API 时，这个方法非常有用。不过，通常情况下，`event.reply/send` 和 `CommandManager` 会自动处理转换，你只需传递 `QQRichText` 对象即可。

-   **`render(group_id=None)`**:
    -   生成一个**人类可读**的字符串，会尝试将 `@` 显示为昵称，将图片/语音等显示为 `[类型: 描述]`。
    -   **主要用于日志和控制台输出，不同于CQ Code，不可用于发送消息和反向转换**。
    -   其的目的主要是为了解决 CQ Code 的各种转码导致你想打开图片都得加载转码的问题。
    -   `logger.info(f"收到消息: {event.message.render(event.group_id)}")`
-   **`strip()`**:
    -   移出像消息段开头和结尾的可能的Text消息段开头和结尾的空格和换行，然后返回一个新的 `QQRichText` 对象。

### 操作符重载

-   **`+` (加法)**: 连接两个 `QQRichText` 对象，或一个 `QQRichText` 对象与字符串/Segment，返回一个**新的** `QQRichText` 对象。
    ```python
    rt1 = QQRichText.QQRichText("Part 1 ")
    rt2 = QQRichText.QQRichText(QQRichText.At(123))
    combined_rt = rt1 + rt2 + " Part 3"
    ```
-   **`==` (等于)**: 比较两个 `QQRichText` 对象的内部消息段列表是否完全相同。
-   **`[index]` (索引)**: 返回索引处的消息段。
-   **bool**: 如果 `QQRichText` 对象为空，则返回 False。否则返回 True。

## `Segment` 类：消息的基本单元

插件开发者通常直接使用 `Segment` 的子类来构建消息。以下是常用子类的简要介绍：

*   **`Text(text: str)`**: 纯文本。

*   **`Image(file: str)`**: 图片。`file` 参数可以是：
    *   本地绝对路径: `"/home/user/img.png"` (会自动转为 `file:///...`)
    *   网络 URL: `"http://example.com/image.jpg"`
    *   Base64 编码: `"base64://..."`，需要注意的是部分实现段对消息段长度有限制，Base64可能过长导致发送失败

*   **`At(qq: int | str)`**: @某人。`qq` 参数可以是 QQ 号，或 `"all"` (需机器人有权限)。

*   **`Reply(message_id: int | str)`**: 回复指定消息。通常放在消息的最前面。

*   **`Face(face_id: int | str)`**: QQ 系统表情 (小黄脸)。

*   **`Record(file: str)`**: 语音 (用法同 `Image`)。

*   **`Video(file: str)`**: 短视频 (用法同 `Image`)。

*   **`Share(url: str, title: str, content: str = "", image: str = "")`**: 链接分享卡片。

*   **`Music(type_: str, id_: int | str)`**: 音乐平台分享 (如 `type_="qq"`, `id_=12345`)。

*   **`CustomizeMusic(...)`**: 自定义音乐分享。

*   **`Node(...)`**: 用于构建合并转发消息的节点。

*   **`Forward(forward_id: str)`**: 用于发送已存在的合并转发记录。

*   **`XML(data: str)`** / **`JSON(data: str)`**: XML/JSON 卡片消息。

剩余的封装请看 [Onebot11协议原文](https://github.com/botuniverse/onebot-11/blob/master/message/segment.md)和MRB2代码

## 工具函数

模块内还包含一些底层转换函数，一般由框架内部调用，了解即可：

*   `cq_decode(text)` / `cq_encode(text)`: CQ Code 特殊字符编解码。
*   `cq_2_array(cq_str)`: CQ Code 字符串转为消息段数组。
*   `array_2_cq(cq_array)`: 消息段数组转为 CQ Code 字符串。
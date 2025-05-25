# MRB2 多协议适配指南：构建通用兼容层与插件扩展

## 1. 引言：MRB2 与多协议支持的需求

MRB2 作为一个强大的 Chatbot 框架，其核心基于 OneBot v11 协议。这使得它能够与大量支持该协议的机器人客户端（如 Go-CQHttp, OneBot-Go 等）无缝集成。然而，在实际应用中，用户可能面临需要与 **不直接支持 OneBot v11 协议** 的平台（例如：Telegram, Discord, 钉钉，或某些自定义的企业内部系统）进行交互的需求。

传统的做法是为每个新协议开发一个独立的机器人框架或在现有框架中深度集成。但这会导致代码耦合度高、维护成本增加。为了优雅地解决这一问题，本指南将详细阐述一种**通过构建“兼容层”并结合 MRB2 自身插件扩展机制**来实现多协议适配的方案。

## 2. 核心思想：兼容层（Compatibility Layer）

### 2.1 什么是兼容层？

兼容层是一个独立的应用程序或服务，它充当了 **MRB2 框架** 与 **非 OneBot v11 协议平台** 之间的“翻译官”和“代理”。它的主要职责是将非 OneBot v11 协议的通信内容（API 调用、事件）转换为标准的 OneBot v11 格式，反之亦然。

### 2.2 兼容层的工作原理

MRB2 使用 **HTTP POST** 来接收事件，并使用 **HTTP** 来发送 API 请求。基于此，兼容层的工作原理如下：

1.  **事件转换与上报：**
    *   当外部平台发生事件（如收到消息、用户上线等）时，兼容层会监听并捕获这些事件。
    *   兼容层解析这些事件的原始数据，并将其**转换、封装**成标准的 OneBot v11 事件格式（例如 `message`、`notice`、`request` 等）。
    *   如果外部协议有 OneBot v11 不包含的独特事件（例如“机器人上线”），兼容层会将其转换为 OneBot v11 的扩展事件格式（例如 `notice` 类型下的自定义 `notice_type`，或 `meta_event` 类型下的自定义 `meta_event_type`）。
    *   转换后的 OneBot v11 事件通过 **HTTP POST** 请求的方式**上报**给 MRB2 框架，上报地址即 MRB2 `config.yml` 中 `server` 部分配置的监听地址。

2.  **API 转换与响应：**
    *   当 MRB2 框架需要调用外部平台的功能（如发送消息、获取群成员列表等）时，它会向兼容层发送标准的 OneBot v11 API 请求。
    *   MRB2 会将这些 API 请求发送到 `config.yml` 中 `api` 部分配置的兼容层地址。
    *   兼容层接收到 OneBot v11 API 请求（通过 HTTP GET 或 POST）后，解析其 `action` 和 `params`。
    *   兼容层将这些 OneBot v11 API 请求**转换**成外部平台对应的原生 API 调用（例如调用 Telegram Bot API 的 `sendMessage` 方法）。
    *   兼容层执行原生 API 调用，并将结果（成功或失败、返回数据）**转换**回 OneBot v11 的响应格式（通常是 JSON），然后通过 HTTP 响应返回给 MRB2。
    *   如果 OneBot v11 标准中不包含的扩展 API（例如“上传图片到指定相册”），兼容层会识别这些自定义 `action` 名称，并将其转换为外部平台对应的原生 API 调用。

### 2.3 兼容层的功能与职责

*   **协议适配器：** 对接特定协议（如 Telegram Bot API, Discord API 等），处理其认证、连接、消息收发等细节。
*   **数据转换器：** 实现双向的数据结构转换逻辑（OneBot v11 <-> 外部协议）。
*   **状态管理（可选）：** 如果外部协议需要维护会话状态、用户/群组信息缓存等，兼容层可以负责这部分管理。
*   **错误处理与日志：** 捕获并记录协议转换或通信过程中发生的错误。
*   **扩展点暴露：** 为 OneBot v11 未覆盖的事件和 API 预留扩展接口，供 MRB2 插件调用。

### 2.4 实现兼容层时需要考虑的技术点

*   **编程语言：** 任何你熟悉的语言都可以，Python, Node.js, Go, Java 等。
*   **通信方式：**
    *   **HTTP POST Server：** 兼容层需要实现一个 HTTP Server，监听来自 MRB2 的 API 调用请求（作为 MRB2 `api` 配置的地址）。
    *   **HTTP POST Client：** 兼容层需要能够作为 HTTP Client，向 MRB2 `server` 配置的地址发送事件上报请求。
*   **OneBot v11 规范：** 熟悉 OneBot v11 的事件类型、消息段、API 动作、HTTP API 规范等。
*   **外部协议 API 文档：** 详细阅读目标协议的 API 文档，了解其请求/响应格式、认证方式、速率限制等。

## 3. MRB2 的配置与连接

MRB2 使用 `config.yml` 进行配置。为了连接到你的兼容层，你需要确保以下两点：

1.  **MRB2 知道向哪个地址发送 OneBot API 请求：** 这通过 `api` 部分配置。
2.  **MRB2 知道监听哪个地址以接收事件上报：** 这通过 `server` 部分配置。

你的兼容层需要：
*   **充当 OneBot API 服务器：** 监听一个 HTTP 端口，接收来自 MRB2 `api` 配置的请求。
*   **充当 OneBot 事件上报客户端：** 在事件发生时，向 MRB2 `server` 配置的 HTTP POST 地址发送事件数据。

**`config.yml` 示例配置:**

```yaml
# 核心API、插件等配置
# ...

api:  # MRB2 向兼容层发送 OneBot API 请求的地址
  host: '127.0.0.1' # 兼容层监听的地址
  port: 5700        # 兼容层监听的端口
  access_token: ""  # 如果兼容层需要认证，请在此填写Access Token

server:  # MRB2 监听来自兼容层事件上报的地址
  host: '127.0.0.1' # MRB2 自身监听的地址，兼容层将事件 POST 到这里
  port: 5701        # MRB2 自身监听的端口
  server: 'werkzeug' # 使用的服务器（werkzeug或waitress）
  max_works: 4      # 最大工作线程数
  secret: ""        # 上报数据签名密钥（如果兼容层需要签名，与兼容层保持一致）
```

**配置说明：**

*   **`api` 部分：** MRB2 将其生成的 OneBot v11 API 请求发送到 `host:port` 所指示的兼容层地址。例如，当你调用 `Actions.SendMsg(...)` 时，MRB2 会向 `http://127.0.0.1:5700/send_msg` 发送 HTTP 请求。你的兼容层需要在此地址处理这些请求。
*   **`server` 部分：** MRB2 会启动一个 HTTP 服务器，监听 `host:port`。你的兼容层在捕获到外部协议的事件并将其转换为 OneBot v11 格式后，需要向 `http://127.0.0.1:5701/` 发送一个 HTTP POST 请求，将事件数据作为请求体。

## 4. MRB2 插件扩展机制：处理非 OneBot11 标准内容

虽然兼容层将外部协议转换为 OneBot v11，但 OneBot v11 本身是标准化的，无法包含所有外部协议的独特功能（例如 Lagrange 的商城表情、机器人上线通知等）。为了让 MRB2 的业务逻辑能够感知并利用这些独特功能，我们需要在 MRB2 内部编写**扩展插件**。

### 4.1 为什么要扩展？

*   **识别自定义事件：** 当兼容层将外部协议的独特事件转换为 OneBot v11 的扩展事件类型（例如 `notice` 下的自定义 `notice_type`）时，MRB2 需要一个机制来识别并处理这些事件。
*   **调用自定义 API：** 当业务逻辑需要调用外部协议独有的功能时（例如上传特定类型的文件、发送特定格式的消息），MRB2 需要一个统一的接口来调用这些 API，并让兼容层知道如何处理。
*   **处理自定义消息段：** 外部协议可能支持 OneBot v11 `message` 消息段中没有的富文本类型（如 Lagrange 的商城表情）。MRB2 需要能够解析这些消息段并构建相应的消息对象。

### 4.2 扩展方式概述

MRB2 提供了 `Actions` (API), `Events` (事件), `Segments` (消息段) 的扩展点，让开发者能够以模块化的方式支持这些非标准内容。

### 4.3 案例分析：参考 Lagrange 实现端扩展插件

以下我们以您提供的 Lagrange 扩展插件为例，详细说明如何在 MRB2 中实现这些扩展。

#### 4.3.1 插件结构

通常，一个扩展插件会组织成一个包，包含 `__init__.py` (插件信息和导入)、`Actions.py` (扩展 API)、`Events.py` (扩展事件) 和 `Segments.py` (扩展消息段)。

```
plugins/
└── MyProtocolExtension/                 # 你的自定义协议扩展插件目录
    ├── __init__.py                      # 插件入口
    ├── Actions.py                       # 扩展 API 接口定义
    ├── Events.py                        # 扩展事件定义
    └── Segments.py                      # 扩展消息段定义
```

**`plugins/MyProtocolExtension/__init__.py`**

```python
#   __  __       ____       _         ____        _
#  |  \/  |_   _|  _ \ __ _(_)_ __   | __ )  ___ | |_
#  | |\/| | | | | |_) / _` | | '_ \  |  _ \ / _ \| __|
#  | |  | | |_| |  _ < (_| | | | | | | |_) (_) | |_
#  |_|  |_|\__,_|_|_| \__/_|_| |_| |____/ \___/ \__|

"""
MyProtocol实现端扩展插件
本插件用于支持与 {你的协议名称} 兼容层交互时产生的扩展消息段和操作。
请注意，此处定义的API、事件和消息段仅为MRB2内部识别和调用，
实际的协议转换由外部兼容层负责。
"""

from Lib.core import PluginManager

plugin_info = PluginManager.PluginInfo(
    NAME="MyProtocolExtension",
    AUTHOR="YourName",
    VERSION="1.0.0",
    DESCRIPTION="用于支持与 MyProtocol 兼容层交互时的扩展功能。",
    HELP_MSG="此插件定义了 MyProtocol 特有的API、事件和消息段。",
    IS_HIDDEN=True # 通常这种协议扩展插件是内部使用的，可以隐藏
)

# 导入具体的扩展定义，以便MRB2核心能够加载它们
# 这里的导入会触发 Actions, Segments, Events 文件中的注册装饰器
from plugins.MyProtocolExtension import Actions, Segments, Events
```

#### 4.3.2 扩展 API 接口 (Actions)

这部分定义了 MRB2 如何向兼容层发送 OneBot v11 标准中不包含的自定义 API 请求。兼容层会识别这些自定义 `action` 名称并将其转换为目标协议的原生 API。

**`plugins/MyProtocolExtension/Actions.py`**

```python
"""
MyProtocol的拓展API接口
这些API由兼容层提供，MRB2通过OnebotAPI调用。
Tips: 这里的定义仅为示例，实际的API名称和参数取决于你的兼容层设计。
"""

from typing import Callable

from Lib.core import OnebotAPI # 用于调用OneBot协议的API
from Lib import Actions       # 继承Actions.Action
from Lib.utils import Logger

logger = Logger.get_logger()

# 示例：上传图片（假设这是OneBot v11标准之外的特殊上传方式）
class UploadImage(Actions.Action):
    """
    上传图片到 MyProtocol 平台的指定方式
    （假设这里的 'file' 参数可能包含特定协议的URL或标识符）
    """
    # call_func 方法是 Action 的核心，它定义了如何向 OnebotAPI 发送请求
    def call_func(self, file: str):
        # OnebotAPI.api.get 或 .send 都是通用的 OneBot API 调用方法。
        # 这里我们使用 "upload_image" 作为自定义的 action 名称。
        # 兼容层需要识别并处理这个 "upload_image" action。
        # MRB2 会向 config.yml 中 api 配置的地址发送 POST 请求，如 http://127.0.0.1:5700/upload_image
        return OnebotAPI.api.get("upload_image", {"file": file})

    def __init__(self, file: str, callback: Callable[[Actions.Result], ...] = None):
        """
        Args:
            file: 图片文件路径或URL，具体格式取决于兼容层定义。
            callback: 回调函数，用于处理API调用结果。
        """
        super().__init__(file=file, callback=callback)

    def logger(self, result, file: str):
        """
        为这个 Action 定义日志输出。
        """
        if result.success:
            logger.info(f"上传图片成功, file: {file}, 结果: {result.data}")
        else:
            logger.error(f"上传图片失败, file: {file}, 错误: {result.message}")

# ... 更多自定义 Actions
```
**解释：** 当你在 MRB2 插件中调用 `MyProtocolExtension.Actions.UploadImage("path/to/image.jpg").send()` 时，MRB2 会通过 `OnebotAPI.api.get("upload_image", {"file": "path/to/image.jpg"})` 向兼容层发起一个 OneBot v11 HTTP 请求。MRB2 会将这个请求发送到 `config.yml` 中 `api` 部分配置的地址（例如 `http://127.0.0.1:5700/upload_image`）。兼容层接收到这个请求后，会解析 `action` 为 `"upload_image"`，然后根据其内部逻辑调用目标协议的上传图片 API。

#### 4.3.3 扩展事件 (Events)

这部分定义了 MRB2 如何识别和处理兼容层上报的 OneBot v11 标准中不包含的自定义事件。兼容层会将目标协议的独特事件转换为 OneBot v11 的 `notice` 或 `meta_event` 并在其 `notice_type` 或 `meta_event_type` 字段中携带自定义标识。

**`plugins/MyProtocolExtension/Events.py`**

```python
"""
MyProtocol的一些拓展事件
这些事件由兼容层上报，MRB2通过事件分类器识别。
"""
from typing import TypedDict

from Lib.utils import EventClassifier, Logger
from Lib.core import Event

logger = Logger.get_logger()

# 示例：机器人上线事件
# 使用 EventClassifier.register_event 装饰器注册事件。
# 当 MRB2 收到一个类型为 "notice" 且 notice_type 为 "bot_online" 的事件时，
# 会自动实例化 BotOnLineEvent 类。
@EventClassifier.register_event("notice", notice_type="bot_online")
class BotOnLineEvent(EventClassifier.NoticeEvent): # 继承 NoticeEvent
    def __init__(self, event_data: TypedDict):
        super().__init__(event_data)
        # 从 event_data 中提取自定义的字段
        self.reason: str = event_data.get("reason", "未知原因")
        self.account_id: int = event_data.get("self_id") # 兼容OneBot标准的机器人ID

    def logger(self):
        logger.info(f"MyProtocol 机器人上线: {self.account_id} - {self.reason}")

# 示例：自定义协议消息事件
# 假设 MyProtocol 有一种特殊的富媒体消息类型，兼容层将其包装为 OneBot v11 的 message，
# 但message_type是自定义的 "my_protocol_rich_message"
@EventClassifier.register_event("message", message_type="my_protocol_rich_message")
class MyProtocolRichMessageEvent(EventClassifier.MessageEvent):
    def __init__(self, event_data: TypedDict):
        super().__init__(event_data)
        # 根据实际情况从event_data中提取更多自定义信息
        self.rich_content: dict = event_data.get("raw_message_data", {}) # 假设兼容层把原始富媒体数据放在这里

    def logger(self):
        logger.info(f"收到 MyProtocol 特殊富媒体消息：来自 {self.sender.user_id}，内容片段：{str(self.rich_content)[:50]}")

# ... 更多自定义 Events
```
**解释：** 当兼容层检测到目标协议的“机器人上线”事件时，它会构造一个类似 `{ "post_type": "notice", "notice_type": "bot_online", "self_id": 123456, "time": ..., "reason": "初始化完成" }` 的 OneBot v11 事件。然后，兼容层将这个事件数据作为 HTTP POST 请求的体，发送到 MRB2 `config.yml` 中 `server` 部分配置的地址（例如 `http://127.0.0.1:5701/`）。MRB2 的 `EventClassifier` 就会根据 `@EventClassifier.register_event("notice", notice_type="bot_online")` 的注册信息，将这个原始事件数据解析并实例化为 `BotOnLineEvent` 对象，供你的业务逻辑插件消费。

#### 4.3.4 扩展消息段 (Segments)

这部分定义了 MRB2 如何识别和处理兼容层上报的 OneBot v11 消息体中不包含的自定义消息段，以及 MRB2 如何构造并发送这些自定义消息段。

**`plugins/MyProtocolExtension/Segments.py`**

```python
"""
MyProtocol的拓展消息段
用于处理 OneBot v11 标准中没有的自定义消息段。
"""

from Lib.utils import QQRichText # 消息段通常继承自QQRichText.Segment

# 示例：商城表情消息段（参考Lagrange）
class MFace(QQRichText.Segment):
    """
    MyProtocol 平台的商城表情消息段
    """
    segment_type = "mface" # 定义消息段类型，兼容层需要识别并转换

    def __init__(self, emoji_package_id: int, emoji_id: int, key: str, summary: str, url: str = None):
        """
        Args:
            emoji_package_id: 表情包 ID
            emoji_id: 表情 ID
            key: 表情 Key
            summary: 表情说明
            url: 表情 Url(可选)
        """
        # Segment 内部通常使用一个字典来存储消息段数据
        data = {
            "emoji_package_id": emoji_package_id,
            "emoji_id": emoji_id,
            "key": key,
            "summary": summary
        }
        if url:
            data["url"] = url
        # 调用父类的构造函数，传入消息段类型和数据
        super().__init__({"type": self.segment_type, "data": data})

        self.emoji_package_id = emoji_package_id
        self.emoji_id = emoji_id
        self.key = key
        self.summary = summary
        self.url = url

    # 可以为消息段添加便捷的设置方法
    def set_url(self, url: str):
        self.url = url
        self.array["data"]["url"] = url # 更新内部数据结构

    def set_emoji_id(self, emoji_id: int):
        self.emoji_id = emoji_id
        self.array["data"]["emoji_id"] = emoji_id

    def set_emoji_package_id(self, emoji_package_id: int):
        self.emoji_package_id = emoji_package_id
        self.array["data"]["emoji_package_id"] = emoji_package_id

    def set_key(self, key: str):
        self.key = key
        self.array["data"]["key"] = key

    # render 方法用于在调试或日志中显示消息段的字符串表示
    def render(self, group_id: int | None = None):
        return f"[mface: {self.summary}({self.emoji_package_id}:{self.emoji_id}:{self.key}):{self.url or '无URL'}]"

# 示例：自定义投票消息段
class PollSegment(QQRichText.Segment):
    """
    MyProtocol 平台的投票消息段
    """
    segment_type = "poll"

    def __init__(self, poll_id: str, question: str, options: list[str]):
        data = {
            "poll_id": poll_id,
            "question": question,
            "options": options
        }
        super().__init__({"type": self.segment_type, "data": data})
        self.poll_id = poll_id
        self.question = question
        self.options = options

    def render(self, group_id: int | None = None):
        return f"[poll: ID={self.poll_id}, Q='{self.question}', Opts={','.join(self.options)}]"

# ... 更多自定义 Segments
```
**解释：**
*   **接收：** 当兼容层收到目标协议带有特殊表情的消息时，它会将其转换为 OneBot v11 消息，并在消息体 `message` 数组中包含 `{ "type": "mface", "data": { ... } }` 这样的消息段。兼容层将整个消息数据作为 HTTP POST 请求的体，上报到 MRB2 `server` 配置的地址。MRB2 内部的消息解析器会识别 `type` 为 `mface`，然后根据 `MFace` 类中定义的 `segment_type = "mface"` 将其解析为 `MFace` 对象。
*   **发送：** 当你的 MRB2 业务逻辑需要发送一个商城表情时，你可以创建 `MFace` 实例，例如 `MFace(123, 456, "key", "说明")`，并将其作为消息列表的一部分传递给 `send_msg`。MRB2 会将此 `MFace` 对象转换为 `{ "type": "mface", "data": { ... } }` 结构，作为 OneBot v11 `send_msg` API 请求的一部分，发送到 `config.yml` 中 `api` 配置的兼容层地址。兼容层收到后会解析 `type` 为 `mface`，然后将 `data` 中的内容转换为目标协议的商城表情格式进行发送。

## 5. 开发流程与最佳实践

1.  **协议分析：** 深入了解目标协议（如 Telegram Bot API、Discord API）的文档。明确其认证方式、消息结构、事件类型、API 调用方式等。
2.  **兼容层开发：**
    *   **模块化设计：** 将协议适配部分、OneBot v11 转换部分、HTTP Server/Client 部分分离。
    *   **事件映射：** 列出所有需要从目标协议转换为 OneBot v11 事件的类型，并决定如何映射 OneBot v11 标准事件，以及如何定义扩展事件（使用 `notice_type` 或 `meta_event_type` 的自定义值）。**确保兼容层能够通过 HTTP POST 将事件数据上报到 MRB2 `server` 配置的地址。**
    *   **API 映射：** 列出所有需要从 OneBot v11 转换为目标协议 API 的动作，包括标准 OneBot API 和自定义扩展 API（自定义 `action` 名称）。**确保兼容层能够启动一个 HTTP 服务器，监听 MRB2 `api` 配置的地址，并正确处理接收到的 OneBot API 请求。**
    *   **消息段转换：** 确定 OneBot v11 消息段如何与目标协议的消息内容相互转换，特别是自定义消息段。
    *   **错误处理：** 确保兼容层能够捕获并向上报协议通信或转换错误。
3.  **MRB2 插件开发：**
    *   **定义扩展类：** 按照上述 `Actions.py`, `Events.py`, `Segments.py` 的结构，定义对应目标协议的扩展类。
    *   **注册扩展：** 确保使用 `@EventClassifier.register_event` 注册事件，以及通过继承 `Actions.Action` 和 `QQRichText.Segment` 来让 MRB2 识别和管理你的扩展。
4.  **测试与迭代：**
    *   **单元测试：** 分别测试兼容层的事件转换和 API 转换逻辑。
    *   **集成测试：** 将 MRB2 与兼容层完整连接，发送消息、触发事件、调用扩展 API，验证整个流程是否顺畅。
    *   **日志：** 充分利用 MRB2 和兼容层的日志功能，帮助调试。

## 6. 总结

通过构建一个独立且功能强大的“兼容层”，并结合 MRB2 框架自身的 `Actions`、`Events`、`Segments` 插件扩展机制，您可以轻松地实现 MRB2 对任何非 OneBot v11 协议的适配。这种架构不仅能够清晰地分离关注点，降低代码耦合，还能极大地增强 MRB2 的灵活性和可扩展性，使其能够成为一个真正的多平台、通用型聊天机器人框架。

**总而言之，你需要按照以下步骤操作即可实现：**

1.  **开发一个独立的服务作为“兼容层”：**
    *   该服务能够与你目标适配的协议（如 Telegram、Discord）进行原生通信。
    *   将该协议的**事件**转换为 OneBot v11 事件格式（对于 OneBot v11 中不包含的，自行扩展 `notice_type` 或 `meta_event_type` 等）。然后通过 **HTTP POST** 请求上报到 MRB2 的 `server` 地址。
    *   将来自 MRB2 的 OneBot v11 **API 请求**转换为该协议的原生 API 调用（对于 OneBot v11 中不包含的，自行定义 `action` 名称）。然后通过 **HTTP Server** 接收 MRB2 `api` 配置的请求，并返回 OneBot v11 格式的响应。
2.  **配置 MRB2 的 `config.yml`：**
    *   将 `api` 部分的 `host` 和 `port` 指向你兼容层服务的 API 监听地址。
    *   确保 `server` 部分的 `host` 和 `port` 是 MRB2 自身监听事件的地址，并告知你的兼容层将事件 POST 到此地址。
3.  **为 MRB2 编写一个“扩展插件”（例如 `MyProtocolExtension`）：**
    *   在 `Actions.py` 中，定义 OneBot v11 标准中不包含的、需要通过兼容层调用的自定义 API 接口。
    *   在 `Events.py` 中，定义兼容层上报的 OneBot v11 标准中不包含的自定义事件类型，并使用 `@EventClassifier.register_event` 进行注册。
    *   在 `Segments.py` 中，定义 OneBot v11 消息体中不包含的自定义消息段类型，以便 MRB2 能够正确解析和构造这些消息。
    *   在插件的 `__init__.py` 中，正确设置 `PluginInfo` 并导入 `Actions`, `Events`, `Segments` 模块。

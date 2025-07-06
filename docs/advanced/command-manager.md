# 命令系统 (CommandManager)

`CommandManager` 是 MuRainBot2 最核心和强大的功能之一。它借鉴了现代 Web 框架（如 FastAPI）和命令行工具库（如 Typer）的设计思想，通过**声明式**的参数定义和**依赖注入**，将复杂命令的解析过程变得前所未有的简单和直观。

## 与 `EventHandlers` 的关系

在深入了解 `CommandManager` 之前，理解它与 `EventHandlers` 的关系至关重要。

**`CommandManager` 是构建在 `EventHandlers` 之上的一个高度封装的应用层。**

`CommandManager.on_command()` 本质上是一个特殊的 `EventHandlers.on_event()`，它预设了监听 `CommandManager.CommandEvent` 事件，并内置了一个 `EventHandlers.CommandRule`。它的主要职责是作为一个**高效的初步过滤器**，快速将可能匹配的命令消息路由到对应的 `CommandMatcher`，而忽略完全无关的消息。

当消息通过 `on_command` 的初步筛选后，真正的魔法发生在 `register_command` 中。它使用了一套独立的、更强大的解析引擎来匹配精确的命令结构并提取参数，这套引擎远比 `CommandRule` 更加强大和灵活。

## 快速上手：一个多功能邮件模拟插件

让我们通过一个稍微复杂但非常实用的例子，来直观感受 `CommandManager` 的强大。我们将创建一个 `/mail` 命令，它拥有 `send`、`check`、`delete` 三个子功能。

```python
# 假设在你的插件 __init__.py 文件中
from murainbot import CommandManager, QQRichText, IntArg, GreedySegments, OptionalArg
from murainbot.core import PluginManager

plugin_info = PluginManager.PluginInfo(
    NAME="MailSimulator",
    AUTHOR="你的名字",
    VERSION="1.0.0",
    DESCRIPTION="一个模拟邮件收发的命令插件",
    HELP_MSG="使用 /mail send/check/delete 来管理你的模拟邮件"
)

# 1. 使用 on_command 创建一个初步过滤器，捕获所有以 "mail" 或 "邮件" 开头的命令
matcher = CommandManager.on_command("mail", aliases={"邮件"})

# 2. 使用 register_command 定义完整的命令结构和对应的处理器

# 定义命令 "mail send <id> <message>"
@matcher.register_command(f"mail send {IntArg('email_id')} {GreedySegments('message')}")
def handle_send_mail(event: CommandManager.CommandEvent, email_id: int, message: QQRichText.QQRichText):
    # 框架已自动将参数注入，并转换好了类型
    event.reply(f"正在向 ID: {email_id} 发送邮件：\n{message.render()}")

# 定义命令 "mail check [id]"
@matcher.register_command(f"mail check {OptionalArg(IntArg('email_id'), default=0)}")
def handle_check_mail(event: CommandManager.CommandEvent, email_id: int):
    if email_id == 0:
        event.reply("正在检查您的所有邮件...")
    else:
        event.reply(f"正在检查 ID 为 {email_id} 的邮件...")

# 定义命令 "mail delete <id>"
@matcher.register_command(f"mail delete {IntArg('email_id')}")
def handle_delete_mail(event: CommandManager.CommandEvent, email_id: int):
    event.reply(f"已删除 ID: {email_id} 的邮件！")

# 定义命令 "mail" (无任何参数时)
@matcher.register_command("mail")
def handle_mail_default(event: CommandManager.CommandEvent):
    event.reply("邮件系统帮助：\n/mail send <ID> <内容>\n/mail check [ID]\n/mail delete <ID>")
```

## 核心概念解析

### 1. 两步走的注册：`on_command` 与 `register_command`

`CommandManager` 的工作模式分为两步，由两个核心装饰器完成，理解它们的区别至关重要：

-   **`CommandManager.on_command(name, aliases={...})`**:
    -   **作用**：这是一个**高级过滤器和分组器**。
    -   **行为**：它创建一个 `CommandMatcher` 对象，其唯一职责是：快速判断一条消息**是否可能**是我们要处理的命令（基于命令名和别名），如果是，就将消息交给这个 `Matcher` 内部的解析引擎；如果不是，就立刻忽略。
    -   **比喻**：它就像一个邮局的总分拣员，看到收件地址是“北京市”，就把信件都扔进“北京”的筐里。它不关心具体的街道和门牌号。

-   **`@matcher.register_command(full_command_string)`**:
    -   **作用**：在已经被 `on_command` 筛选过的消息中，定义一个**精确、完整的命令蓝图**，并绑定一个处理器函数。
    -   **行为**：它接收一个描述了**从头到尾完整命令结构**的字符串。`CommandManager` 的核心解析引擎会用这个“蓝图”去精确匹配和解析用户的输入。
    -   **关键点**：**`register_command` 的字符串必须包含完整的命令，包括 `on_command` 中声明的根命令名。**
    -   **比喻**：它就像“北京”筐里的区域投递员，他拿到一封信后，会根据“海淀区中关村大街1号”这样的**完整地址**，来决定具体送到哪个大楼。

### 2. 参数定义字符串：命令的蓝图

`register_command` 的参数是一个使用 f-string 构建的字符串，它就像一个微型语言，用于描述命令的结构。

```python
# f"mail send {IntArg('email_id')} {GreedySegments('message')}"
#  ▲    ▲     ▲                    ▲
#  │    │     │                    └─ 第 2 个参数: 贪婪捕获所有剩余内容，命名为 'message'
#  │    │     └─ 第 1 个参数: 必须是整数，命名为 'email_id'
#  │    └─ 固定的子命令关键字 "send"
#  └─ 根命令 "mail"
```
框架会从左到右依次解析用户输入，与这个“蓝图”进行匹配。

### 3. 参数类型 (`BaseArg` 的子类)

`CommandManager` 提供了多种内置的参数类型，用于定义不同种类和行为的参数。

| 参数类                     | 作用                                          | 示例 (`f-string` 内)                |
|-------------------------|---------------------------------------------|----------------------------------|
| `Literal(name)`         | 匹配一个固定的文本关键字。通常直接写字符串即可。                    | `"send"` (等效于 `Literal('send')`) |
| `TextArg(name)`         | 匹配一个不含空格的文本单词。                              | `{TextArg('username')}`          |
| `IntArg(name)`          | 匹配一个整数，并自动转换类型。                             | `{IntArg('user_id')}`            |
| `GreedySegments(name)`  | **(常用)** 贪婪地捕获所有剩余的消息内容，返回 `QQRichText` 对象。 | `{GreedySegments('content')}`    |
| `AnySegmentArg(name)`   | 匹配任意一个消息段 (文本、图片、@等)。                       | `{AnySegmentArg('any')}`         |
| `ImageSegmentArg(name)` | 仅匹配一个图片消息段。                                 | `{ImageSegmentArg('photo')}`     |
| `AtSegmentArg(name)`    | 仅匹配一个 `@` 消息段。                              | `{AtSegmentArg('target_user')}`  |

#### 特殊包装器

| 包装器                              | 作用                                                                     | 示例 (`f-string` 内)                                       |
|----------------------------------|------------------------------------------------------------------------|---------------------------------------------------------|
| `OptionalArg(arg, default=None)` | **(常用)** 将一个参数标记为可选。如果用户未提供，则使用 `default` 值。                           | `{OptionalArg(IntArg('page'), default=1)}`              |
| `EnumArg(name, [Literal...])`    | 限制参数必须是预定义列表中的一个。                                                      | `{EnumArg('color', [Literal('red'), Literal('blue')])}` |
| `SkipOptionalArg(...)`           | 更宽松的可选参数，如果匹配失败则跳过而不是报错，使用默认值，但它也不算是可选参数，它仍然必须提供，因此可以与OptionalArg共同使用。 | `{SkipOptionalArg(IntArg('level'), default=10)}`        |

### 4. 依赖注入：从解析到函数参数

这是 `CommandManager` 最神奇的部分。

1.  当一条命令被触发时，框架会根据你定义的参数字符串进行解析。
2.  解析成功后，它会得到一个包含所有参数名和对应值的字典，例如 `{'email_id': 12345, 'message': <QQRichText object>}`。
3.  接着，框架会检查你的处理器函数（如 `handle_send_mail`）的**函数签名**。
4.  它会像一个聪明的助手，将字典中的值，按照参数名，准确地传递给函数的同名参数。
5.  `event` 对象是默认注入的，包含了事件的全部信息。

这个过程就是**依赖注入**。它让你无需在函数体内编写任何解析代码，只需声明你需要什么，框架就会为你准备好。

### 5. `CommandEvent` 事件对象

所有通过 `CommandManager` 触发的处理器，接收到的第一个参数都是 `CommandEvent` 对象。它是一个特殊的消息事件，除了拥有标准消息事件的所有属性（如 `user_id`, `group_id`, `message_id`, `message` 等）外，还提供了几个便捷方法：

-   `event.send(message)`: 向消息来源（群或私聊）发送消息。
-   `event.reply(message)`: 引用并回复触发命令的消息。

这两个方法极大地简化了回复操作。
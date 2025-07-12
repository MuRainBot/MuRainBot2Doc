# 编写你的第一个插件

## 开始之前

在开始编写插件之前，你需要对 MRB2 的插件系统有一些了解。

MRB2 的插件都存放在项目根目录下的 `/plugins` 文件夹中。一个插件既可以是一个独立的 Python 文件（例如 `echo.py`），也可以是一个 Python 包（一个包含 `__init__.py` 文件的文件夹）。

详情可以查看 [PluginManager文档](/advanced/plugin-manager)。

现在，请在你的项目 `/plugins` 目录下创建一个名为 `Echo` 的文件夹，并在其中创建一个 `__init__.py` 文件。我们接下来的所有代码都将在这个文件中编写。

我们将要实现的插件功能是：当用户发送 `echo <内容>` 时，机器人将同样回复 `<内容>`。

## 开始编写

### 1. 导入框架并声明插件信息

首先，在 `__init__.py` 文件中，我们需要导入 `murainbot` 框架，并声明插件的基本信息。

**请务必将 `plugin_info` 的声明紧跟在 import 语句之后**，这是框架识别插件信息的关键。

```python
from murainbot import CommandManager, QQRichText, QQDataCacher
from murainbot.core import PluginManager

plugin_info = PluginManager.PluginInfo(
    NAME="Echo",
    AUTHOR="你的名字",
    VERSION="1.0.0",
    DESCRIPTION="一个简单的复读插件",
    HELP_MSG="发送 echo <内容>，我会复读你的话"
)
```

::: tip
在一个python包格式的插件中，plugin_info只需要声明一次，推荐放在__init__.py中声明

如果不在__init__.py内，请确保可以通过<插件名称>.plugin_info访问到你的plugin_info
:::

### 2. 创建命令匹配器

接下来，我们需要创建一个“匹配器” (Matcher) 来监听特定的命令。我们使用 `CommandManager.on_command()` 来实现。

```python
# 监听 "echo" 命令，并设置别名为 "复读"
matcher = CommandManager.on_command("echo", aliases={"复读"})
```

::: tip **on_command 做了什么？**

`on_command()` 是一个非常方便的工具，它为你处理了大部分繁琐的命令判断工作：

1.  **自动匹配命令**：
    *   它会自动匹配 `命令起始符 + 命令` (如 `/echo`) 和 `命令起始符 + 别名` (如 `/复读`)。默认的命令起始符是 `/`，可在 `config.yml` 中修改。
    *   在群聊中，如果消息以 `@机器人` 开头，那么后面的命令无需加起始符（如 `@机器人 echo ...`）。

2.  **自动预处理**：
    *   它会自动剥离消息中的 `@机器人` 和命令起始符，让你能专注于处理核心的命令内容。

这使得你的插件代码可以更加简洁和清晰。
:::

### 3. 编写命令处理器

有了匹配器，我们还需要一个“处理器” (Handler) 函数来处理匹配到的命令。这通过装饰器 `@matcher.register_command()` 来实现。

我们的命令格式是 `echo <内容>`，其中 `<内容>` 是我们需要的参数。我们可以使用 `CommandManager` 提供的参数类型来定义它。

```python
# 使用 f-string 定义命令的参数部分
# CommandManager.GreedySegments('text') 会捕获所有剩余的内容
@matcher.register_command(f"echo {CommandManager.GreedySegments('text')}")
def handler(event: CommandManager.CommandEvent, text: QQRichText.QQRichText):
    # 获取用户信息
    if event.is_private:
        user = QQDataCacher.get_user_info(event.user_id)
    else:
        # 说一下为什么group_id需要使用event["group_id"]的语法而非event.group_id，
        # 因为CommandEvent本质是对MessageEvent的封装，MessageEvent分为私聊和群聊两种，
        # 因为user_id是共有的，所以可以直接写成属性，但group_id只有群聊有，
        # 而获取键的语法是直接相当于从事件中取，所以需要这么写
        user = QQDataCacher.get_group_member_info(event["group_id"], event.user_id)
    # 生成回复文本
    message = QQRichText.QQRichText(QQRichText.Text(f"{user.get_nickname()} 发送了："), text)
    # 使用 event.reply() 可以快速回复消息
    event.reply(message)
```

这段代码是新版框架的核心！让我们来解析一下：

-   `@matcher.register_command(...)`: 这个装饰器将下面的 `handler` 函数注册为 `echo` 命令的具体处理器。
    -   `echo`: 这是必须的，框架需要完整的命令定义，必须包含名称。
    -   `CommandManager.GreedySegments('text')`: 这是一个特殊的参数类型，意思是“**贪婪地捕获所有剩余的消息段，并将其命名为 `text`**”。
-   `def handler(event: CommandManager.CommandEvent, text: QQRichText.QQRichText):`:
    -   **`event: CommandManager.CommandEvent`**: 这是框架传入的事件对象，它继承自消息事件，并增加了一些命令相关的便捷方法，比如 `reply()`。
    -   **`text: QQRichText.QQRichText`**: 这就是**依赖注入**的魔力！框架看到处理器需要一个名为 `text` 的参数，它会自动将上面 `GreedySegments('text')` 捕获到的内容作为 `QQRichText` 对象传递给这个参数。你无需手动解析消息。
-   `event.is_private`: 判断消息是否为私聊
-   `QQDataCacher.get_user_info(event.user_id)`：从事件中拿出 `user_id`，然后通过 `QQDataCacher` 来获取用户信息
-   `message = QQRichText.QQRichText(QQRichText.Text(f"{user.get_nickname()} 发送了："), text)`：使用 `QQRichText` 创建回复文本，它非常强大，可以传入多种类型的消息段，直接提供文本会被自动进行CQ解析，所以为了避免被注入攻击，所以此处需要使用 `QRichText.Text`，这个消息段是仅文本的，会进行转义（在被转换为cq码时）。
-   `event.reply(message)`: `CommandEvent` 对象提供的便捷方法，可以直接引用并回复触发该命令的消息。

### 4. 最终代码

整合起来，你的 `plugins/Echo/__init__.py` 文件内容应该是这样的：

```python
from murainbot import CommandManager, QQRichText, QQDataCacher
from murainbot.core import PluginManager

# 1. 声明插件信息
plugin_info = PluginManager.PluginInfo(
    NAME="Echo",
    AUTHOR="你的名字",
    VERSION="1.0.0",
    DESCRIPTION="一个简单的复读插件",
    HELP_MSG="发送 /echo <内容>，我会复读你的话"
)

# 2. 创建命令匹配器
matcher = CommandManager.on_command("echo", aliases={"复读"})

# 3. 注册命令处理器并定义参数
@matcher.register_command(f"echo {CommandManager.GreedySegments('text')}")
def handler(event: CommandManager.CommandEvent, text: QQRichText.QQRichText):
    """
    处理 echo 命令, text 参数由框架通过依赖注入自动传入
    """
    # 4. 获取用户信息
    if event.is_private:
        user = QQDataCacher.get_user_info(event.user_id)
    else:
        # 说一下为什么group_id需要使用event["group_id"]的语法而非event.group_id，
        # 因为CommandEvent本质是对MessageEvent的封装，MessageEvent分为私聊和群聊两种，
        # 因为user_id是共有的，所以可以直接写成属性，但group_id只有群聊有，
        # 而获取键的语法是直接相当于从事件中取，所以需要这么写
        user = QQDataCacher.get_group_member_info(event["group_id"], event.user_id)
    # 5. 生成回复文本
    message = QQRichText.QQRichText(QQRichText.Text(f"{user.get_nickname()} 发送了："), text)
    # 6. 执行回复操作
    event.reply(message)
```

至此，恭喜你已经完成了第一个插件的编写！现在可以启动 MRB2，然后对你的机器人发送 `/echo 你好世界` 或者 `/复读 你好世界` 来测试效果了。

### 更进一步

你可以尝试阅读侧边栏 **深入** 板块的内容，以更好地了解每个模块如何使用；或者一边阅读 [**API文档**](https://mrb2api.xiaosu.icu)，一边开始你下一个插件的开发。祝你玩得开心！
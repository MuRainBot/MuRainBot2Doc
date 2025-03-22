# 编写你的第一个插件

## 开始之前

在开始编写插件之前，你需要对 MRB2 的插件系统有一些了解

MRB2 的插件放在 `/plugins` 目录下，每个插件既可以是一个文件夹（ python 库，必须有 `__init__.py` 文件）也可以是一个 python 文件（.py文件）。

所以，你可以先在 `/plugins` 目录下创建一个名为 HelloWorld 的文件夹，并添加一个 `__init__.py` 的文件，下面的所有代码都是在这个文件内编写的作为你的第一个插件。

在这个插件里，你需要实现收到 hello 回复 HelloWorld! 的功能。

## 开始编写

首先，导入 MRB2 的 Lib。

```python
from Lib import *
```

然后声明一下这个插件的一些信息（请一定一定一定把 plugin_info 放在插件导入完 Lib 后的最前面）：

```python
from Lib.core import PluginManager

plugin_info = PluginManager.PluginInfo(
    NAME="插件名称",
    AUTHOR="作者",
    VERSION="版本号",
    DESCRIPTION="描述",
    HELP_MSG="帮助文本"
)
```

随后你需要创建一个 `matcher`，用来匹配事件，这里匹配`EventClassifier.MessageEvent`事件。

为了实现命令回复的效果，所以需要先创建一个 `Rule` 来约束 `matcher` 匹配的事件。

```python
rule = EventHandlers.CommandRule("hello", aliases={"你好"})
```

上方 `Rule` 的意思是，是判断 message 是否是 `hello`，同时设置了一个别名 `你好`。

::: tip
**CommandRule 快速说明**

1. **自动匹配命令**
   - 默认匹配：`命令起始符 + 命令` 和 `命令起始符 + 别名`。  
   - 若消息前带有 `@bot` 时，可直接匹配 **命令本身** 和 **别名**，无需命令起始符。

2. **自动处理**
   - 自动移除消息中的 `@bot` 和命令起始符，同时会自动将 **别名** 替换为 **命令本身**，以简化插件处理逻辑。

3. **避免误判**
   - 在 `matcher` 的 `rules` 中添加 `EventClassifier.to_me` 规则，限制仅匹配群消息 `@bot` 或私聊 bot 的消息。  
   - 确保 `EventClassifier.to_me` 放在 `CommandRule` 前，以正确识别顺序。
:::

然后使用 `Rule` 创建 `matcher`。

```python
matcher = EventHandlers.on_event(EventClassifier.GroupMessageEvent, rules=[rule])
```

接下来，要为这个`matcher`创建一个`handler`用于处理这个事件。

```python
@matcher.register_handler()
def handler(event: EventClassifier.GroupMessageEvent):
    ...
```

随后，需要将 HelloWorld 消息发送出去。

众所周知，在 QQ 中，不止有纯文本消息，一个消息内可以包含图片、语音等，所以你需要使用 `QQRichText` 模块来将构建消息。

`QQRichText` 模块内包含了全部 Onebot11 协议内的消息段并将它们封装成了类，在现在这个插件中，我们只需要使用 `QQRichText.Text` 来构建纯文本消息。

在 MRB2 中，发送消息等这类操作被称为 `Action`，MRB2 将 Onebot11 协议中所有的 API 都封装成了 Action ，你只需要实例化他们并 `.call()` 调用即可。

顺带一提，`Action` 不止可以 `.call()` 调用，还有许多种调用方法，但这些就留到后面的章节再讲吧。

由于发送群消息和发送私聊消息并不是一个操作，所以你需要加一个判断。

```python
@matcher.register_handler()
def handler(event: EventClassifier.GroupMessageEvent):
    # [!code focus:4]
    Actions.SendMsg(
        group_id = event.group_id,
        message = QQRichText.QQRichText(QQRichText.Text("HelloWorld!"))
    ).call()
```

至此，恭喜你已经完成了你第一个插件的编写，你现在可以启动 MRB2 来尝试一下效果。


::: tip
此处我们监听的是群消息事件，所以只能在群聊中触发这个对话
:::


### 更进一步：你可以尝试边阅读[APIDoc](https://mrb2api.xiaosu.icu)，边开始你下个插件的开发

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
此处的 `CommandRule` 会自动判断消息前面是否带 at 并且 at 的是自己，也就是说如果，消息是
```text
@bot 你好
```
也会触发，为了方便开发者，Rule 会直接删除 at 的部分，

同时， `CommandRule` 会所匹配所有命令前缀，而在 MRB2 的默认配置下也就是说
```text
/hello
```
也会触发。

如果你觉得直接匹配全部这样的命令非常容易误判，你可以在下面的 `matcher` 的 rules 内添加一个 EventClassifier.to_me 的 `Rule` 来约束，
`EventClassifier.to_me` 会只匹配群消息内 @bot 的消息，或对 bot 的私聊消息。

不过这里有需要提醒的一点， Rule 的判断顺序是根据列表的顺序，由于 `CommandRule` 会自动删除 at， 所以你需要将 `EventClassifier.to_me` 放在 `CommandRule` 的前面才能正确识别。
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
    if event.message_type == "group": # [!code focus:10]
        Actions.SendMsg(
            group_id = event.group_id,
            message = QQRichText.QQRichText(QQRichText.Text("HelloWorld!"))
        ).call()
    else:
        Actions.SendMsg(
            user_id = event.user_id,
            message = QQRichText.QQRichText(QQRichText.Text("HelloWorld!"))
        ).call()
```

至此，恭喜你已经完成了你第一个插件的编写，你现在可以启动 MRB2 来尝试一下效果。

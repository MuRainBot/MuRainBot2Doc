# 快速开始

::: warning 警告
在阅读本文档之前默认您已经了解以下内容：

 - [python3 的基本使用](https://docs.python.org/zh-cn/3/tutorial/index.html)
 - [pip 的基本使用](https://www.runoob.com/w3cnote/python-pip-install-usage.html)
 - [onebot v11 协议的基本概念](https://11.onebot.dev)

:::

好↑的↓ 相信你已经了解了以上内容，那么开始吧！

::: tip 必看提示
如果使用时遇到问题，请按以下步骤操作：

1.  将框架版本更新到最新版 (`pip install --upgrade murainbot`)，或尝试 `dev` 分支。
2.  将 `config.yml` 中的 `debug.enable` 设置为 `true`。
3.  复现您遇到的 Bug。
4.  **检查 Onebot 实现端的日志**，确认问题是否源于实现端本身。如果是，请向您使用的实现端反馈。
5.  如果问题确认在 MRB2 框架：
    *   请准备**完整**的 MRB2 日志文件 (`logs` 目录下)。您可以自行遮挡日志中的 QQ 号、群号等敏感信息。
    *   提供清晰的错误描述、复现步骤。
    *   如果开启了 `save_dump` 且生成了 dump 文件，可以一并提供。（不强制，但是推荐提供，不过需要注意可以检查一下是否包含apikey等敏感信息）
    *   将以上信息提交到项目的 [**Issues**](https://github.com/MuRainBot/MuRainBot2/issues/new/choose) 页面。

---

如果不遵守以上的步骤，开发者可能会无视或直接删除你的 Issues。

:::

## 1. 安装 MuRainBot 框架

### 1.1 环境要求
::: warning 警告
由于框架使用了较新的 Python 语法，请确保你的 **Python 版本 ≥ 3.12**。

若 Python 版本不满足要求，可尝试自行搜索教程以更新 Python。
:::

### 1.2 使用 venv 虚拟环境 (可选，但强烈推荐)
为了避免污染你全局的 Python 环境，建议为你的机器人项目创建一个独立的虚拟环境。

创建虚拟环境：
```bash
python3 -m venv .venv
```

激活虚拟环境：
::: code-group
```bash [linux/macOS]
source .venv/bin/activate
```
```bash [windows]
.venv\Scripts\activate
```
:::
后续所有命令都请在该虚拟环境中执行。

### 1.3 安装框架
现在，你可以通过 `pip` 直接安装 MuRainBot2 框架：
```bash
pip install murainbot
```

::: tip
如果下载速度过慢，可以尝试使用国内镜像源：
```bash
pip install murainbot -i https://pypi.tuna.tsinghua.edu.cn/simple
```
:::

## 2. 创建你的机器人项目

安装完框架后，使用我们提供的命令行工具来初始化你的项目。

```bash
murainbot init my_cool_bot
```
执行后，你会看到类似以下的输出：
```
✨ 正在 '/path/to/your/folder' 目录下创建新项目: my_cool_bot
    - 📂 目录结构创建成功。
    - 🧩 内置插件 (Helper, LagrangeExtension) 安装成功。
    - 📄 默认 `config.yml` 创建成功。
    - 🕶️ 默认 `.gitignore` 创建成功。

🎉 项目 'my_cool_bot' 创建成功! 🎉

接下来，请执行以下步骤:

1. 进入项目目录:
   cd my_cool_bot

2. 编辑配置文件:
   打开 config.yml 文件，根据你的需求进行修改。

3. 启动你的机器人:
   murainbot run
```

这个命令会为你创建一个名为 `my_cool_bot` 的文件夹，并自动生成标准的目录结构、默认配置文件和基础插件。

## 3. 配置

### 3.1 配置 MuRainBot
首先，进入我们刚刚创建的项目目录：
```bash
cd my_cool_bot
```
MRB2 的主配置文件是 `config.yml`。用你喜欢的编辑器打开它，默认内容如下：

```yaml
# MuRainBot2配置文件
account:  # 账号相关
  user_id: 0  # QQ账号（留空则自动获取）
  nick_name: ""  # 昵称（留空则自动获取）
  bot_admin: []

api:  # Api设置(Onebot HTTP通信)
  host: '127.0.0.1'
  port: 5700
  access_token: ""  # HTTP的Access Token

server:  # 监听服务器设置（Onebot HTTP POST通信）
  host: '127.0.0.1'
  port: 5701
  server: 'werkzeug'  # 使用的服务器（werkzeug或waitress）
  max_works: 4  # 最大工作线程数
  secret: ""  # 上报数据签名密钥

thread_pool:  # 线程池相关
  max_workers: 10  # 线程池最大线程数

qq_data_cache:  # QQ数据缓存设置
  enable: true  # 强烈建议开启
  expire_time: 300  # 缓存过期时间（秒）
  max_cache_size: 500  # 最大缓存数量

debug:  # 调试模式
  enable: false  # 生产环境建议关闭
  save_dump: true  # 是否在发生异常时保存dump文件

auto_restart_onebot:  # 在Onebot实现端状态异常时自动重启（需开启心跳包）
  enable: true  # 是否启用自动重启

command:  # 命令相关
  command_start: ["/"]  # 命令起始符
```
你需要将 `api` 和 `server` 部分的 `host` 和 `port` 修改为与你的 OneBot 实现端匹配的设置。其余配置项通常保持默认即可。

### 3.2 安装/配置 Onebot 实现端

市面上的 OneBot v11 实现端有很多，目前主流的有：
- [Lagrange.OneBot](https://github.com/LagrangeDev/Lagrange.Core)
- [LLOneBot](https://github.com/LLOneBot/LLOneBot)
- [NapCat](https://github.com/NapNeko/NapCatQQ)

这里以 **Lagrange.OneBot** 作为示例：

1.  根据 Lagrange.OneBot 的文档，下载并运行它。
2.  打开其配置文件 `appsettings.json`，找到 `Implementations` 字段，确保它包含了与 MRB2 `config.yml` 匹配的 `Http` 和 `HttpPost` 配置。这通常意味着端口号需要对应。
    ***记得删注释***
    ```json
    "Implementations": [
            {
                "Type": "HttpPost", // 对应 MRB2 的 server 配置
                "Host": "127.0.0.1",
                "Port": 5701,      // 必须和 MRB2 的 server.port 一致
                "Suffix": "/",
                "HeartBeatInterval": 5000,
                "AccessToken": ""
              },
              {
                "Type": "Http",    // 对应 MRB2 的 api 配置
                "Host": "127.0.0.1",
                "Port": 5700,      // 必须和 MRB2 的 api.port 一致
                "AccessToken": ""
              }
        ]
    ```

3.  配置完成后，运行 Lagrange.OneBot，并登录你的机器人 QQ 账号。

## 4. 启动

现在，一切准备就绪！确保你仍处于项目目录 (`my_cool_bot`) 下，并已激活 venv 虚拟环境（如果使用了的话）。

运行以下命令来启动你的机器人：

```bash
murainbot run
```
如果一切正常，你将看到 MRB2 的启动 Banner 和日志信息。

::: tip
如果你希望使用python来启动框架，你可以新建一个mian.py，写入如下内容
```python
import os
from murainbot.main import start

start(os.getcwd())
```
之后你就可以使用
```bash
python main.py
```
来启动 MRB2 了。
:::


至此，你的机器人已经成功运行。你可以开始编写自己的插件，或者使用社区的插件了！

ℰ𝓃𝒿ℴ𝓎
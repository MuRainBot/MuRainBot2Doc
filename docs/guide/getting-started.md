# 快速开始

::: warning 警告
在阅读本文档之前默认您已经了解以下内容：

 - [python3 的基本使用](https://docs.python.org/zh-cn/3/tutorial/index.html)
 - [pip 的基本使用](https://www.runoob.com/w3cnote/python-pip-install-usage.html)
 - [onebot11 协议的基本概念](https://11.onebot.dev)

:::

好↑的↓ 相信你已经了解了以上内容，那么开始吧！


::: tip
如果使用时遇到问题，请将 `config.yml` 的`debug.enable`设置为`true`，然后复现 bug，
并检查该问题是否是你使用的 Onebot 实现端的问题（可查看实现端的日志检查是否有异常）

如果是，请自行在你使用的 Onebot 实现端进行反馈。

如果不是，将完整 完整 完整的将日志信息（部分对于问题排查不重要的敏感信息（如 QQ 群号、 QQ 号等）可自行遮挡） 和错误描述发到 [issues](https://github.com/MuRainBot/MuRainBot2/issues/new/choose)。
:::

## 1.安装

### 1.1 下载仓库
```bash
git clone https://github.com/MuRainBot/MuRainBot2.git
```
::: tip
如果不想要使用 git 也可以下载 zip 包
[点击这里](https://codeload.github.com/MuRainBot/MuRainBot2/zip/refs/heads/master)

下载完毕后，解压到任意位置即可。
:::

完成后，进入到项目根目录即可。

### 1.2 安装依赖

::: warning 警告
由于框架使用了 f-string 等高版本 python 才引入的语法，请确保你的 python 版本大于等于 3.12

若python版本不满足要求，可尝试自行搜索教程以更新 python。
:::

### 1.2.1 使用 venv 虚拟环境(可选)
为了避免干扰系统的 python 环境，可以使用 venv 虚拟环境来安装依赖。

创建虚拟环境
```bash
python3 -m venv .venv
```

激活虚拟环境
::: code-group
```bash [linux/macOS]
source .venv/bin/activate
```
```bash [windows]
.venv\Scripts\activate
```
:::

### 1.2.2 安装依赖
```bash
pip install -r requirements.txt
```

::: tip
如果下载过慢，可以尝试使用国内镜像源
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```
:::

## 2.配置

相信你已经成功安装并下载了项目所需的依赖，接下来开始配置

MRB2的配置文件位于 `config.yml` 文件内

默认配置文件如下：
```yaml
# MuCloud Bot Python配置文件
account:  # 账号相关
  user_id: 0  # QQ账号（留空则自动获取）
  nick_name: ""  # 昵称（留空则自动获取）
  bot_admin: []

api:  # Api设置
  host: '127.0.0.1'
  port: 5700

server:  # 监听服务器设置
  host: '127.0.0.1'
  port: 5701

thread_pool:  # 线程池相关
  max_workers: 10  # 线程池最大线程数

qq_data_cache:  # QQ数据缓存设置
  enable: true  # 是否启用缓存
  expire_time: 300  # 缓存过期时间（秒）
  max_cache_size: 500  # 最大缓存数量（设置过大可能会导致报错）


debug:  # 调试模式，若启用框架的日志等级将被设置为debug，同时部分异常处理将关闭，由于无异常处理，所以可能会导致意外中断运行，所以不建议在生产环境开启
  enable: false  # 是否启用调试模式

auto_restart_onebot:  # 在Onebot实现端状态异常时自动重启Onebot实现端（需开启心跳包）
  enable: true  # 是否启用自动重启
```

需要将Api设置和监听服务器设置都修改到空余的端口上。

其余配置项默认配置一般就可以满足普通需求，如果你有特殊需求可以根据注释自行修改。

## 3.安装/配置 Onebot 实现端

那么，如何安装 Onebot 实现端？首先你要知道市面上的 Onebot 实现端有很多，目前主流的有(被划掉意味基本不可用/已停止维护):
- [Lagrange.Onebot](https://github.com/LagrangeDev/Lagrange.Core)
- [LLOneBot](https://github.com/LLOneBot/LLOneBot)
- [NapCat](https://github.com/NapNeko/NapCatQQ)
- [~~OpenShamrock~~](https://github.com/whitechi73/OpenShamrock)
- [~~go-cqhttp~~](https://github.com/Mrs4s/go-cqhttp)

这里以 Lagrange.Onebot 作为示例：

根据 Lagrange.Onebot 的文档，下载编译好的二进制文件。

随后需要将 Lagrange.Onebot 的配置文件( `appsettings.json` )中的 `Implementations` 字段修改为以下内容（此为默认配置，若修改了监听服务器端口，请修改此处端口）:
```json
"Implementations": [
        {
            "Type": "HttpPost",
            "Host": "127.0.0.1",
            "Port": 5701,
            "Suffix": "/",
            "HeartBeatInterval": 5000,
            "AccessToken": ""
          },
          {
            "Type": "Http",
            "Host": "127.0.0.1",
            "Port": 5700,
            "AccessToken": ""
          }
    ]
```

配置完成后，运行 Lagrange.Onebot，登录账号即可。

## 4.启动

::: tip
如果你使用了 venv 虚拟环境请先激活环境。
:::

进入到 MRB2 根目录下。

```bash
python main.py
```

没错，就这么简单

至此， MRB2 已经安装并配置完毕，你可以开始使用了！
ℰ𝓃𝒿ℴ𝓎!

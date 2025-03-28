# QQ 数据缓存 (QQDataCacher)

`QQDataCacher` 模块是 MuRainBot2 (MRB2) 框架的一个用于获取QQ信息工具。它的主要目的是缓存通过 OneBot API 获取的用户信息、群信息和群成员信息，以减少对 OneBot 实现端 的重复 API 调用，从而提高响应速度并降低 API 调用频率，并提供方便的接口，供开发者使用。

该模块位于 `Lib.utils.QQDataCacher.py`。

## 核心概念

1.  **缓存 (Caching):** 将从 API 获取的数据（如用户昵称、群名称、群成员列表等）存储在内存中，以便后续快速访问，避免再次调用 API。
2.  **懒加载 (Lazy Loading):** 缓存数据并非在程序启动时全部加载，而是在 **首次访问** 特定数据（如某个用户的昵称）时，如果缓存中没有或已过期，才会触发一次 API 调用来获取并缓存。
3.  **自动刷新与过期 (Expiration & Refresh):** 缓存的数据有一个配置的 **过期时间** (`expire_time`)。当访问一个已缓存但超过过期时间的数据项时，模块会自动尝试通过 API 调用来 **刷新** 该数据。
4.  **数据对象 (`UserData`, `GroupData`, `GroupMemberData`):** 缓存的数据被封装在特定的对象中，提供了面向对象的属性访问方式。例如，获取用户信息会得到一个 `UserData` 对象，可以通过 `user_data.nickname` 访问其昵称。
5.  **访问函数 (`get_user_info`, `get_group_info`, `get_group_member_info`):** 这是插件开发者与缓存交互的主要入口。通过调用这些函数并传入相应的 ID，可以获取对应的缓存数据对象。
6.  **垃圾回收 (Garbage Collection):** 为了防止内存无限增长，模块内置了一个后台线程，会定期清理长时间未被使用或超出最大缓存大小限制的缓存项。
7.  **配置驱动:** 缓存的行为（是否启用、过期时间、最大大小）可以通过 MRB2 的全局配置文件进行调整。

## 如何使用 QQDataCacher

使用缓存非常简单，主要是通过三个核心函数来获取数据对象，然后像访问普通 Python 对象属性一样访问所需信息。

### 1. 获取用户信息 (`get_user_info`)

```python
# 在你的 Handler 或其他插件逻辑中
user_id_to_get = 123456789

# 获取该用户的 UserData 缓存对象
user_data = QQDataCacher.get_user_info(user_id_to_get)

# 访问用户信息属性
# 注意：第一次访问某个属性 (如 nickname) 时，如果缓存不存在或已过期，
#       这里可能会阻塞，直到 API 调用完成并刷新缓存。
nickname = user_data.nickname
sex = user_data.sex
age = user_data.age
is_friend = user_data.is_friend # 检查是否是好友 (可能触发 friend_list API 调用)
remark = user_data.remark       # 好友备注 (仅好友存在)

# 获取显示名称 (优先使用好友备注，否则使用昵称)
display_name = user_data.get_nickname()

# 如果 API 调用失败或数据确实不存在，属性可能返回 None
if nickname:
    logger.info(f"获取到用户 {user_id_to_get} 的昵称: {display_name}")
else:
    logger.warning(f"未能获取到用户 {user_id_to_get} 的昵称")

# 也可以在获取时提供初始数据 (通常来自事件对象)，减少首次 API 调用
# event_sender = event_data.sender # 假设这是包含 user_id, nickname 等的字典
# user_data_with_init = QQDataCacher.get_user_info(event_sender['user_id'], **event_sender)
# nickname_init = user_data_with_init.nickname # 可能直接使用初始数据 (如果未过期)
```

**`get_user_info(user_id: int, *args, **kwargs) -> UserData`**

*   `user_id`: 要获取信息的用户 QQ 号。
*   `*args`, `**kwargs`: (可选) 可以传入初始数据字典。如果缓存中没有该用户，会使用这些数据初始化 `UserData` 对象，可以避免首次访问时的 API 调用（只要数据未过期）。通常可以将事件中的 `sender` 字典直接传入。
*   返回一个 `UserData` 对象。

### 2. 获取群信息 (`get_group_info`)

```python
group_id_to_get = 987654321

# 获取该群的 GroupData 缓存对象
group_data = QQDataCacher.get_group_info(group_id_to_get)

# 访问群信息属性 (同样具有懒加载和自动刷新特性)
group_name = group_data.group_name
member_count = group_data.member_count
max_member_count = group_data.max_member_count

if group_name:
    logger.info(f"获取到群 {group_id_to_get} 的名称: {group_name} ({member_count}/{max_member_count})")
else:
    logger.warning(f"未能获取到群 {group_id_to_get} 的名称")

# 访问群成员列表 (首次访问会触发 get_group_member_list API)
# member_list 是 GroupMemberData 对象的列表
# member_list = group_data.group_member_list
# if member_list:
#    logger.info(f"群 {group_name} 的部分成员:")
#    for member in member_list[:5]: # 打印前5个
#        logger.info(f"  - {member.get_nickname()} ({member.user_id})")
```

**`get_group_info(group_id: int, *args, **kwargs) -> GroupData`**

*   `group_id`: 要获取信息的群号。
*   `*args`, `**kwargs`: (可选) 可以传入初始数据字典。
*   返回一个 `GroupData` 对象。

### 3. 获取群成员信息 (`get_group_member_info`)

```python
group_id_context = 987654321
user_id_in_group = 111222333

# 获取指定群内指定成员的 GroupMemberData 缓存对象
member_data = QQDataCacher.get_group_member_info(group_id_context, user_id_in_group)

# 访问群成员信息属性
card = member_data.card           # 群名片
nickname = member_data.nickname    # QQ 昵称 (如果群名片为空时备用)
role = member_data.role           # 角色 (owner, admin, member)
title = member_data.title         # 头衔
join_time = member_data.join_time   # 入群时间戳
last_sent_time = member_data.last_sent_time # 最后发言时间戳

# 获取显示名称 (优先使用群名片，否则使用QQ昵称)
display_name = member_data.get_nickname()

if display_name:
    logger.info(f"获取到群 {group_id_context} 成员 {user_id_in_group} 的名称: {display_name} (角色: {role})")
else:
    logger.warning(f"未能获取到群 {group_id_context} 成员 {user_id_in_group} 的信息")

# 同样可以传入初始数据 (如事件中的 sender)
# event_sender = event_data.sender # 假设是群消息事件的 sender
# member_data_init = QQDataCacher.get_group_member_info(
#     event_data.group_id, event_sender['user_id'], **event_sender
# )
# card_init = member_data_init.card # 可能直接使用初始数据
```

**`get_group_member_info(group_id: int, user_id: int, *args, **kwargs) -> GroupMemberData`**

*   `group_id`: 群号。
*   `user_id`: 成员 QQ 号。
*   `*args`, `**kwargs`: (可选) 可以传入初始数据字典。
*   返回一个 `GroupMemberData` 对象。

## 数据对象属性详解

当你通过 `get_...` 函数获取到数据对象后，可以通过属性访问具体信息。

### `UserData` 对象属性

*   `user_id`: QQ 号 (int)
*   `nickname`: QQ 昵称 (str | None)
*   `sex`: 性别 (`male`, `female`, `unknown` | None)
*   `age`: 年龄 (int | None)
*   `is_friend`: 是否为好友 (bool | None) - 访问此属性可能触发 `get_friend_list` API 调用。
*   `remark`: 好友备注 (str | None) - 仅当 `is_friend` 为 `True` 时可能有值。访问此属性可能触发 `get_friend_list` API 调用。
*   **`get_nickname() -> str`**: 方法，优先返回 `remark`，如果 `remark` 为空则返回 `nickname`。如果两者都无法获取，可能返回空字符串或 `None` (取决于底层API结果)。

### `GroupData` 对象属性

*   `group_id`: 群号 (int)
*   `group_name`: 群名称 (str | None)
*   `member_count`: 当前成员数 (int | None)
*   `max_member_count`: 最大成员数 (int | None)
*   `group_member_list`: 群成员列表 (list[GroupMemberData] | None) - **首次访问此属性会触发 `get_group_member_list` API 调用，可能耗时较长且返回大量数据。因此慎用。**

### `GroupMemberData` 对象属性

*   `group_id`: 群号 (int)
*   `user_id`: 成员 QQ 号 (int)
*   `nickname`: 成员 QQ 昵称 (str | None)
*   `card`: 群名片 (群昵称) (str | None) - 可能为空字符串。
*   `sex`: 性别 (`male`, `female`, `unknown` | None)
*   `age`: 年龄 (int | None)
*   `area`: 地区 (str | None)
*   `join_time`: 入群时间戳 (int | None)
*   `last_sent_time`: 最后发言时间戳 (int | None)
*   `level`: 等级 (str | None)
*   `role`: 角色 (`owner`, `admin`, `member` | None)
*   `unfriendly`: 是否不良记录成员 (bool | None)
*   `title`: 头衔 (str | None)
*   `title_expire_time`: 头衔过期时间戳 (int | None) - `-1` 表示不过期。
*   `card_changeable`: 是否允许修改群名片 (bool | None)
*   **`get_nickname() -> str`**: 方法，优先返回 `card` (群名片)，如果 `card` 为空则返回 `nickname` (QQ昵称)。

**重要提示:**

*   所有属性的访问都可能因为懒加载或缓存刷新而触发 **阻塞** 的 API 调用。
*   如果 API 调用失败（网络问题、权限不足、目标不存在等），对应的属性值可能返回 `None`。插件代码应进行适当的检查。
*   `UserData` 的 `is_friend` 和 `remark` 以及 `GroupData` 的 `group_member_list` 属性，访问时触发的 API 调用可能比其他属性更耗时或消耗更多资源。

## 缓存机制 (内部细节)

*   **`NotFetched`**: 一个特殊的内部哨兵对象，表示数据从未被获取过。
*   **`last_update`**: 每个缓存项记录了最后一次成功从 API 刷新数据的时间戳。
*   **`last_use`**: 每个缓存项记录了最后一次被访问（读取属性）的时间戳，用于垃圾回收。
*   **`expire_time`**: (来自配置) 缓存的有效期（秒）。访问数据时，如果 `当前时间 - last_update > expire_time`，则认为缓存过期，触发刷新。如果 `expire_time` 为 `0`，则每次访问都会尝试刷新。
*   **`refresh_cache()`**: 每个数据对象内部的方法，负责调用对应的 OneBot API (`get_stranger_info`, `get_group_info`, `get_group_member_info`) 来更新自身数据。如果 API 调用失败，会记录警告日志，数据可能保持 `NotFetched` 或旧状态。
*   **`__getattr__`**: Python 的特殊方法，在访问对象不存在的属性时被调用。`QQDataCacher` 利用它实现了懒加载和自动刷新逻辑。
*   **锁 (`threading.Lock`):** 用于保护全局缓存字典 (`user_info`, `group_info`, `group_member_info`) 在多线程环境下的访问安全。
*   **垃圾回收 (`garbage_collection`, `scheduled_garbage_collection`):** 后台线程每隔一段时间（默认约1-4分钟，或缓存超限时更频繁）会检查缓存项。它会移除：
    *   整个群的成员缓存，如果该群所有成员的 `last_use` 都已超过 `expire_time * 2`。
    *   超过 `max_cache_size` 限制时，优先移除 `last_use` 最早的缓存项，直到缓存大小符合限制。

## 配置选项

缓存行为可以通过修改 MRB2 的全局配置文件(`config.yaml`) 中的 `qq_data_cache` 部分来调整：

*   **`enable`**: 如果设置为 `false`，`QQDataCacher` 将完全禁用，所有 `get_...` 调用都会直接触发 API 请求。
*   **`expire_time`**: 控制数据多久被视为“过时”。较短时间意味着数据更新更及时，但 API 调用更频繁；较长时间反之。
*   **`max_cache_size`**: 控制内存中缓存项的数量上限，防止内存占用过高。

## 完整示例：在事件响应中使用缓存

```python
from Lib import *

# --- 插件信息 ---
plugin_info = PluginManager.PluginInfo(NAME="Cache示例")
logger = Logger.get_logger()

# --- Matcher: 监听所有群消息 ---
matcher = EventHandlers.on_event(EventClassifier.GroupMessageEvent)

@matcher.register_handler()
def handle_group_message(event_data: EventClassifier.GroupMessageEvent):
    group_id = event_data.group_id
    user_id = event_data.user_id

    # --- 使用 QQDataCacher 获取信息 ---
    # 1. 获取群信息
    group_data = QQDataCacher.get_group_info(group_id)
    group_name = group_data.group_name or f"群{group_id}" # 提供默认值

    # 2. 获取发送者群成员信息 (可以传入事件中的 sender 数据作为初始值)
    # 这样如果缓存有效，可以避免第一次访问 nickname 等属性时的 API 调用
    sender_data = QQDataCacher.get_group_member_info(group_id, user_id, **event_data.sender)
    sender_display_name = sender_data.get_nickname() or f"用户{user_id}" # 获取显示名

    # 3. 获取发送者的全局用户信息 (可选)
    user_data = QQDataCacher.get_user_info(user_id)
    user_nickname = user_data.nickname or f"用户{user_id}"

    # --- 使用获取到的信息 ---
    log_message = (
        f"在群 '{group_name}' ({group_id}) 中, "
        f"成员 '{sender_display_name}' ({user_id}, QQ昵称: {user_nickname}) "
        f"发送了消息: {event_data.raw_message}"
    )
    logger.info(log_message)

    # 示例：根据用户角色进行回复
    sender_role = sender_data.role
    reply_text = ""
    if sender_role == "owner":
        reply_text = f"群主 {sender_display_name} 好！"
    elif sender_role == "admin":
        reply_text = f"管理员 {sender_display_name} 在！"
    else:
        # 对普通成员不做特殊回复
        pass # 可以添加其他逻辑

    if reply_text:
        try:
            Actions.SendMsg(
                group_id=group_id,
                message=QQRichText.QQRichText(QQRichText.Reply(event_data.message_id), reply_text)
            ).call()
        except Exception as e:
            logger.error(f"回复时出错: {e}")

```

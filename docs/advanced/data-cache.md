# QQ数据缓存

在编写插件的时候，时常会需要使用来自实现端（QQ）的一些数据，但是每次都从实现端获取显然不是最优解。
于是 MRB2 提供了一个模块用于让插件方便的获取 QQ 的数据。

## 使用

此处以获取群 114514 内的QQ号为 1919810 的群成员信息为例

```python
data = QQDataCacher.qq_data_cache.get_group_member_info(114514, 1919810)
```

QQDataCacher 会自动判断缓存是否存在与是否过期，你只需要这样获取就可以了，此处我们尝试获取此人的群昵称

```python
print(data.card)
```

但是这里会有一个问题，如果此人未设置群昵称输出的就是一个空值，那么此时我们可以调用 `get_nickname()` 方法来自动判断此人是否有群昵称，如果有就返回群昵称，否则返回昵称。

```python
print(data.get_nickname())
```

获取群信息就是

```python
data = QQDataCacher.qq_data_cache.get_group_info(114514)
print(data.name)
```

用户信息就是

```python
data = QQDataCacher.qq_data_cache.get_user_info(1919810)
print(data.nickname)
```

具体用法可以查看源码或API文档：[QQDataCacher](https://mrb2api.xiaosu.icu/Lib/utils/QQDataCacher.html)

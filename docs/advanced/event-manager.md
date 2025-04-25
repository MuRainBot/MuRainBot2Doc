# 事件管理器 (EventManager)

`EventManager` 模块是 MuRainBot (MRB2) 框架的基础设施之一，负责管理事件的定义、监听器的注册与注销，以及事件的触发和分发。它提供了一个灵活的发布-订阅模式，允许框架的不同部分或插件之间通过事件进行解耦通信。

该模块位于 `Lib.core.EventManager.py`。

**常用导入 (在插件或框架内部):**

```python
# 通常由框架核心或需要定义/监听自定义事件的模块导入
from Lib.core import EventManager

# 导入特定的事件类 (如果是监听预定义事件)
# from Lib.EventClassifier import SomeSpecificEvent
```

## 核心概念

1.  **事件 (Event):** 代表系统中发生的某件事情。在 MRB2 中，所有自定义事件都应继承自 `EventManager.Event` 类。事件对象通常携带与该事件相关的数据作为其属性。
2.  **事件监听器 (Event Listener):** 一个普通的 Python 函数，通过 `@EventManager.event_listener` 装饰器注册，用于响应特定类型的事件。当一个事件被触发时，所有注册监听该事件类型的函数都会被调用。
3.  **优先级 (Priority):** 每个监听器可以关联一个整数优先级。当一个事件触发多个监听器时，优先级 **高的** (数值大的) 监听器会 **先** 被执行。默认优先级为 0。
4.  **钩子 (Hook):** `EventManager.Hook` 是一种特殊的内部事件类型。在 `EventManager.Event` 的 `call()` 方法执行普通监听器 **之前**，会先触发一个针对该监听器的 `Hook` 事件。这提供了一种机制，允许其他监听器（通常是框架级的，如 `EventHandlers`）介入并决定是否 **跳过** 即将执行的原始事件监听器。插件开发者通常不需要直接与 `Hook` 事件交互，除非需要实现非常高级的拦截逻辑。
5.  **事件触发 (`call()`, `call_async()`):** 事件对象通过调用其 `call()` 或 `call_async()` 方法来触发其对应的所有监听器。

## 创建自定义事件

要定义自己的事件类型，只需创建一个继承自 `EventManager.Event` 的类。通常，你会在 `__init__` 方法中添加该事件需要携带的数据作为实例属性。

```python
from Lib.core import EventManager
from typing import Any

# 示例：定义一个插件加载完成的事件
class PluginLoadedEvent(EventManager.Event):
    def __init__(self, plugin_name: str, success: bool, message: str = ""):
        super().__init__() # 建议调用父类构造函数
        self.plugin_name = plugin_name
        self.success = success
        self.message = message

# 示例：定义一个简单的计数器事件
class CounterEvent(EventManager.Event):
    def __init__(self, count: int):
        super().__init__()
        self.count = count

# 示例：定义一个包含动态数据的任务结束事件
class TaskEndEvent(EventManager.Event):
    def __init__(self, task_id: str, success: bool, result: Any = None, need_cleanup: bool = False):
        super().__init__()
        self.task_id = task_id
        self.success = success
        self.result = result
        self.need_cleanup = need_cleanup # 动态数据作为属性
```

## 注册事件监听器 (`@event_listener`)

使用 `@EventManager.event_listener` 装饰器将一个函数注册为特定事件类型的监听器。

```python
from Lib.core import EventManager
from Lib import Logger # 假设需要日志

# (假设上面的事件类已定义)

logger = Logger.get_logger()

# 监听上面定义的 PluginLoadedEvent
@EventManager.event_listener(PluginLoadedEvent, priority=10, extra_info="Static Info") # 传入静态 kwargs
def on_plugin_loaded(event: PluginLoadedEvent, extra_info: str): # 函数接收事件对象和静态 kwargs
    """当插件加载完成时调用"""
    if event.success:
        logger.info(f"插件 '{event.plugin_name}' 加载成功。")
    else:
        logger.error(f"插件 '{event.plugin_name}' 加载失败: {event.message}")
    # 访问静态 kwargs
    logger.debug(f"附加静态信息: {extra_info}")

# 监听 CounterEvent，设置不同优先级
@EventManager.event_listener(CounterEvent, priority=5)
def on_counter_low_priority(event: CounterEvent):
    print(f"[Listener P5] Counter reached {event.count}")

@EventManager.event_listener(CounterEvent, priority=100)
def on_counter_high_priority(event: CounterEvent):
    print(f"[Listener P100] Counter reached {event.count}")

# 监听 TaskEndEvent，并从事件对象获取动态数据
@EventManager.event_listener(TaskEndEvent, priority=5)
def on_task_end_cleanup(event: TaskEndEvent):
    if event.need_cleanup: # 从事件对象读取动态数据
        logger.info(f"[Listener P5 Cleanup] 任务 '{event.task_id}' 结束，执行清理...")
    else:
        logger.info(f"[Listener P5 NoCleanup] 任务 '{event.task_id}' 结束，无需清理。")
```

**`@event_listener` 参数:**

*   `event_class`: **必需**。要监听的事件类（必须是 `EventManager.Event` 的子类）。
*   `priority`: 可选。整数，监听器的优先级，默认为 `0`。数字越大，优先级越高，越先执行。
*   `**kwargs`: 可选。任意数量的关键字参数。这些参数是 **静态** 的，在注册监听器时定义，并会原样传递给你定义的监听器函数（监听器函数需要定义对应的参数来接收它们）。它们通常用于向监听器传递配置或固定的上下文信息，**不用于** 传递随每次事件触发而变化的动态数据。

**监听器函数签名:**

*   第一个参数 **必须** 是触发该监听器的事件对象（类型为你监听的 `event_class`）。
*   可以包含额外的参数，用于接收 `@event_listener` 中定义的静态 `**kwargs`。

## 触发事件 (`event.call()`, `event.call_async()`)

创建事件对象后，调用其 `call()` 或 `call_async()` 方法来通知所有监听器。

```python
# (假设上面的事件类和监听器已定义)

# 1. 创建事件实例
plugin_load_success_event = PluginLoadedEvent(plugin_name="MyAwesomePlugin", success=True)
counter_event = CounterEvent(count=10)
# 创建 TaskEndEvent 时传入动态数据
task_end_event_needs_cleanup = TaskEndEvent("TASK-001", True, "完成", need_cleanup=True)
task_end_event_no_cleanup = TaskEndEvent("TASK-002", False, "错误", need_cleanup=False)


# 2. 触发事件

# --- 同步触发 ---
# call() 方法会按优先级顺序，依次在当前线程执行所有监听器。
# 它会阻塞，直到所有监听器（或被Hook跳过前的监听器）执行完毕。
print("--- 同步触发 PluginLoadedEvent ---")
plugin_load_success_event.call() # on_plugin_loaded 会收到 extra_info="Static Info"

print("\n--- 同步触发 CounterEvent ---")
counter_event.call() # 会先打印 P100，再打印 P5

print("\n--- 同步触发 TaskEndEvent (需要清理) ---")
task_end_event_needs_cleanup.call() # on_task_end_cleanup 会根据 event.need_cleanup 打印清理日志

print("\n--- 同步触发 TaskEndEvent (无需清理) ---")
task_end_event_no_cleanup.call() # on_task_end_cleanup 会打印无需清理日志


# --- 异步触发 ---
# call_async() 方法会将事件的同步 call() 提交到框架的线程池执行。
# 它会立即返回，不会阻塞当前线程 (Fire and Forget)。
# 监听器的执行顺序仍然按优先级，但在线程池的某个线程中进行。
print("\n--- 异步触发 CounterEvent (无等待) ---")
counter_event_async = CounterEvent(count=20)
future = counter_event_async.call_async() # 提交异步任务
print("异步事件已提交，主程序继续执行...")
# (异步执行的打印可能会在后面出现)

# 如果需要等待异步任务完成 (不常用，因为 call_async 设计为非阻塞)
# print("等待异步任务完成...")
# future.result() # 等待线程池任务完成
# print("异步任务已完成")
```

*   **`event.call()`**: 同步执行所有监听器（考虑优先级和 Hook）。阻塞当前线程。
*   **`event.call_async()`**: 将 `event.call()` 提交到线程池异步执行。**不**阻塞当前线程。返回一个 `Future` 对象 (来自 `ThreadPool`)，可以用于等待任务完成（但不推荐，违背了异步设计的初衷）。

## `Hook` 机制 (内部与高级用法)

`EventManager.Event` 在调用每个监听器 `listener` 之前，会内部创建一个 `Hook(self, listener)` 事件实例并调用其 `call()` 方法。这个 `Hook` 事件允许其他专门监听 `Hook` 事件的函数进行干预。

*   **监听 `Hook` 事件:** 你可以像监听普通事件一样监听 `Hook` 事件。
*   **`Hook` 事件对象属性:**
    *   `event`: 原始事件对象 (如 `PluginLoadedEvent` 实例)。
    *   `listener`: 即将要被执行的 `EventListener` 数据类实例 (包含原始监听器的 `func`, `priority`, `kwargs`)。
*   **`Hook` 监听器的返回值:** 如果一个 `Hook` 监听器返回 `True`，则原始事件 (`hook.event`) 的那个特定监听器 (`hook.listener`) 将被 **跳过**，不会执行。

**主要用途:** 这个机制主要被框架内部使用，例如 `Lib.EventHandlers` 可能使用它来拦截 OneBot 事件，应用自己的规则，并在规则不匹配时返回 `True` 来阻止后续的低优先级 `EventManager` 监听器（如果存在的话）执行。插件开发者通常 **不需要** 主动监听 `Hook` 事件。不过，对于一些例如统一的群管理插件，`Hook` 系统就变得很有用了，但是也需要谨慎的编写相关逻辑。

```python
# (假设 CounterEvent 和 on_counter_low_priority 已定义)
from Lib.core import EventManager
from Lib import Logger

logger = Logger.get_logger()

# 示例：监听 Hook 事件以跳过特定监听器 (通常不建议插件这样做)
@EventManager.event_listener(EventManager.Hook)
def intercept_counter_event(hook: EventManager.Hook):
    # 检查是否是 CounterEvent，并且是低优先级的那个监听器
    if (isinstance(hook.event, CounterEvent) and
            hook.listener.func == on_counter_low_priority):
        logger.warning(f"Hook: 拦截并跳过监听器 {hook.listener.func.__name__} "
                       f"对于事件 CounterEvent(count={hook.event.count})")
        return True # 返回 True 表示跳过 on_counter_low_priority 的执行
    return False # 返回 False 或 None 表示不干预

print("\n--- 同步触发 CounterEvent (带 Hook 拦截) ---")
counter_event_hooked = CounterEvent(count=30)
counter_event_hooked.call() # 现在只会打印 P100 的消息
```

## 取消注册监听器 (`unregister_listener`)

如果你需要动态地移除一个事件监听器，可以使用 `EventManager.unregister_listener` 函数。

```python
from Lib.core import EventManager
from Lib import Logger
# (假设 MyCustomEvent 和 my_listener_func 已定义并注册)

logger = Logger.get_logger()

# ... 在某个时候需要取消监听 ...
try:
    # 需要提供事件类和原始的函数对象
    EventManager.unregister_listener(MyCustomEvent, my_listener_func)
    logger.info(f"成功取消注册监听器 {my_listener_func.__name__} for {MyCustomEvent.__name__}")
except ValueError as e:
    # 如果事件或函数从未注册过，会抛出 ValueError
    logger.warning(f"取消注册监听器失败: {e}")
except TypeError as e:
    logger.error(f"取消注册时类型错误: {e}")

# 注意：此函数会移除所有与给定函数对象匹配的、针对该事件的监听器实例。
# 如果同一个函数被多次注册（例如用不同的优先级或kwargs），它们都会被移除。
```

**`unregister_listener(event_class: type[T], func: Callable[[T, ...], Any])`**

*   `event_class`: 要取消监听的事件类。
*   `func`: 要取消注册的监听器函数对象本身。
*   如果找不到对应的监听器，会引发 `ValueError`。

## 执行流程总结

1.  **事件实例化:** 创建一个 `EventManager.Event` 子类的实例 (`event = MyEvent(...)`)，包含所有需要传递的数据作为属性。
2.  **触发:** 调用 `event.call()` 或 `event.call_async()`。
3.  **(对于 `call_async`, 转入线程池)**
4.  **获取监听器:** `EventManager` 找到所有注册监听 `event.__class__` 的 `EventListener` 对象。
5.  **排序:** 按 `priority` **降序** (大优先) 对监听器列表进行排序。
6.  **遍历监听器:** 按排序后的顺序依次处理每个 `listener`：
    a.  **触发 Hook:** 创建 `hook = Hook(event, listener)` 并调用 `hook.call()`。
    b.  **检查 Hook 结果:**
        *   如果任何 `Hook` 监听器返回 `True`，则 **跳过** 当前 `listener` 的执行 (步骤 c)，继续下一个 `listener` (步骤 6)。
        *   如果所有 `Hook` 监听器都返回 `False` 或 `None` (或没有 `Hook` 监听器)，则继续执行步骤 c。
    c.  **执行监听器:** 调用 `listener.func(event, **listener.kwargs)`。捕获并记录函数内发生的异常。
7.  **完成:** 所有监听器处理完毕（或被跳过）。

## 完整示例

```python
from Lib.core import EventManager, ThreadPool
from Lib import Logger
from typing import Any
import time

# --- 初始化 (如果独立运行) ---
# ThreadPool.init() # 假设框架会负责初始化
logger = Logger.get_logger()

# --- 1. 定义事件 ---
class TaskStartEvent(EventManager.Event):
    def __init__(self, task_id: str, task_type: str):
        self.task_id = task_id
        self.task_type = task_type

class TaskProgressEvent(EventManager.Event):
    def __init__(self, task_id: str, progress: float):
        self.task_id = task_id
        self.progress = progress

class TaskEndEvent(EventManager.Event):
    def __init__(self, task_id: str, success: bool, result: Any = None, need_cleanup: bool = False):
        self.task_id = task_id
        self.success = success
        self.result = result
        self.need_cleanup = need_cleanup

# --- 2. 注册监听器 ---
@EventManager.event_listener(TaskStartEvent, priority=100)
def on_task_start_log(event: TaskStartEvent):
    logger.info(f"[Listener P100] 任务 '{event.task_id}' ({event.task_type}) 开始执行...")

@EventManager.event_listener(TaskProgressEvent)
def on_task_progress(event: TaskProgressEvent, **kwargs):
    print(f"\r[Listener P0] 任务 '{event.task_id}' 进度: {event.progress:.1%}", end="")
    if event.progress >= 1.0:
        print() # 进度 100% 后换行

@EventManager.event_listener(TaskEndEvent, priority=5)
def on_task_end_cleanup(event: TaskEndEvent):
    if event.need_cleanup:
        logger.info(f"[Listener P5 Cleanup] 任务 '{event.task_id}' 结束，执行清理...")
    else:
        logger.info(f"[Listener P5 NoCleanup] 任务 '{event.task_id}' 结束，无需清理。")

@EventManager.event_listener(TaskEndEvent, priority=10)
def on_task_end_notify(event: TaskEndEvent):
    status = "成功" if event.success else "失败"
    result_info = f" 结果: {event.result}" if event.result is not None else ""
    logger.info(f"[Listener P10 Notify] 任务 '{event.task_id}' 执行{status}。{result_info}")

# --- 模拟任务执行与事件触发 ---
def run_task(task_id: str, task_type: str, steps: int, requires_cleanup: bool):
    # 触发任务开始事件
    TaskStartEvent(task_id, task_type).call()

    success = True
    result = None
    try:
        for i in range(steps + 1):
            progress = i / steps
            # 触发进度事件
            TaskProgressEvent(task_id, progress).call_async() # 进度可以异步发
            time.sleep(0.2) # 模拟耗时
        result = f"共处理 {steps} 步"
    except Exception as e:
        success = False
        result = str(e)
        logger.error(f"任务 '{task_id}' 执行出错: {e}")

    # 触发任务结束事件，并将动态数据放入事件对象
    TaskEndEvent(task_id, success, result, need_cleanup=requires_cleanup).call()

# --- 执行任务 ---
if __name__ == "__main__":
    # 确保线程池初始化 (如果不在框架内运行)
    ThreadPool.init()

    print("--- 开始执行 TASK-001 ---")
    run_task("TASK-001", "数据处理", 5, requires_cleanup=True)
    print("-" * 20)
    print("--- 开始执行 TASK-002 ---")
    run_task("TASK-002", "文件下载", 3, requires_cleanup=False)
    print("-" * 20)
    # 等待异步进度事件完成打印 (仅为演示，实际框架中不需要这样手动等待)
    print("等待可能的异步任务完成...")
    time.sleep(1)
    print("示例结束")
```

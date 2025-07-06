# 插件管理器 (PluginManager)

`PluginManager` 模块是 MuRainBot (MRB2) 框架的核心组件，负责发现、加载、管理和存储框架中的所有插件。它定义了插件的基本结构、元数据表示方式，并提供了插件间依赖管理的功能。

该模块位于 `murainbot.core.PluginManager.py`。

**常用导入 (在插件文件中):**

```python
# 导入 PluginManager 以定义 plugin_info 或声明依赖
from murainbot.core import PluginManager

# 通常也需要导入其他 murainbot 组件
from murainbot import *
```

## 核心概念

1.  **插件结构:** MRB2 的插件位于项目根目录下的 `/plugins` 文件夹中。一个插件可以是：
    *   一个单独的 Python 文件 (例如 `my_plugin.py`)。
    *   一个包含 `__init__.py` 文件的 Python 包（文件夹，例如 `MyPluginFolder/` 里面有 `__init__.py`)。
2.  **插件发现:** MRB2 启动时会自动扫描 `/plugins` 目录，识别有效的插件文件和包。
3.  **插件加载:** 框架尝试导入找到的插件代码。加载成功的关键在于插件内部正确定义了 `plugin_info`。
4.  **`PluginInfo` 对象:** 每个插件 **必须** 在其代码文件的顶层（通常在 `import` 语句之后）定义一个名为 `plugin_info` 的变量，它是 `PluginManager.PluginInfo` 类的一个实例。这个对象包含了插件的元数据。
5.  **插件依赖:** 一个插件可以声明它依赖于另一个插件，确保依赖项在需要时被正确加载。
6.  **全局插件列表 (`plugins`):** `PluginManager` 维护一个全局列表 `plugins`，其中存储了所有 **已成功加载** 的插件信息（包括插件模块对象、`PluginInfo` 等）。

## 定义插件信息 (`PluginInfo`)

每个插件都需要通过 `PluginManager.PluginInfo` 类来声明其元数据。这个定义 **必须** 放在插件文件的靠前位置，紧跟在 `import` 语句之后。

```python
from murainbot.core import PluginManager
# 其他导入...

plugin_info = PluginManager.PluginInfo(
    NAME="我的插件名称",        # 插件的唯一名称，通常与文件名或文件夹名一致
    AUTHOR="你的名字",          # 插件作者
    VERSION="1.0.0",          # 插件版本号 (建议遵循 SemVer)
    DESCRIPTION="这个插件用来做什么", # 插件功能的简短描述
    HELP_MSG="如何使用这个插件的说明文本", # 当用户查询此插件帮助时显示的信息
    ENABLED=True,             # (可选) 插件是否默认启用，默认为 True
    IS_HIDDEN=False,          # (可选) 是否在全局 /help 命令中隐藏此插件，默认为 False
    extra={}                  # (可选) 一个字典，用于存储任意自定义信息，方便插件间通信或扩展
)

# --- 插件的其他代码 ---
# from murainbot import Actions, EventHandlers, ...
# ... matcher 定义 ...
# ... handler 定义 ...
```

**`PluginInfo` 字段详解:**

*   `NAME` (str): **必需**。插件的名称，应具有唯一性。
*   `AUTHOR` (str): **必需**。插件作者的名称或标识。
*   `VERSION` (str): **必需**。插件的版本号。
*   `DESCRIPTION` (str): **必需**。对插件功能的简要描述，会显示在全局帮助信息中。
*   `HELP_MSG` (str): **必需**。详细的帮助信息，当用户使用如 `/help 插件名称` 查询时显示。
*   `ENABLED` (bool, 可选): 控制插件是否加载。如果设置为 `False`，`PluginManager` 在加载过程中会跳过此插件，并引发内部的 `NotEnabledPluginException`，插件不会被添加到 `plugins` 列表，其代码也不会被执行。默认为 `True`。
*   `IS_HIDDEN` (bool, 可选): 如果设置为 `True`，该插件将不会出现在全局 `/help` 命令的插件列表中，但仍然可以通过 `/help 插件名称` 查询其帮助。默认为 `False`。
*   `extra` (dict | None, 可选): 一个字典，允许插件开发者存储任意附加数据。其他插件可以通过约定的 `extra` 字典键名来读取这些信息，实现插件间的信息共享或功能扩展。默认为 `None`，在初始化时会自动转换为空字典 `{}`。

**重要:** 正确定义 `plugin_info` 是插件被 MRB2 识别和加载的前提。

## 插件加载过程

1.  **发现:** MRB2 启动时扫描 `/plugins` 目录，找到所有 `.py` 文件和包含 `__init__.py` 的目录，将它们记录在内部的 `found_plugins` 列表中。
2.  **导入:** 遍历 `found_plugins`，计算每个插件的 Python 导入路径 (例如 `plugins.MyPluginFolder` 或 `plugins.my_plugin`)，并使用 `importmurainbot.import_module` 尝试导入插件模块。
3.  **获取 `plugin_info`:** 从导入的模块中查找 `plugin_info` 属性。
4.  **实例化 `PluginInfo`:** 如果找到 `plugin_info`，框架会访问它（这会触发 `PluginInfo` 的 `__post_init__`）。
5.  **检查 `ENABLED`:** `PluginInfo.__post_init__` 检查 `ENABLED` 字段。如果为 `False`，则抛出 `NotEnabledPluginException`，加载流程对该插件终止。
6.  **存储:** 如果插件启用且加载无误，插件的模块对象和 `PluginInfo` 实例等信息会被存储在全局列表 `PluginManager.plugins` 中。
7.  **错误处理:** 加载过程中的任何错误（导入失败、`plugin_info` 缺失或格式错误、插件内部代码错误等）都会被捕获并记录日志，该插件将被跳过。

插件开发者通常不需要关心加载的具体细节，只需确保插件结构正确并定义了有效的 `plugin_info` 即可。

## 插件依赖 (`requirement_plugin`)

MuRainBot2 插件化系统的设计使得插件之间可以功能独立、各司其职，我们可以更好地维护和扩展插件。但是，有时候我们可能需要在不同插件之间调用功能。MuRainBot2 生态中就有一类插件，它们专为其他插件提供功能支持，如：针对某些实现端的拓展插件、数据存储插件等。这时候我们就需要在插件之间进行插件依赖。

### 声明插件依赖

对于这种情况，MuRainBot2 提供了一个方法 `PluginManager.requirement_plugin` 来在插件内声明对其他插件的依赖。这可以确保依赖项在需要时被正确加载，并避免了重复加载或加载顺序的问题。

假设我们有一个插件 `plugin_a`，它需要依赖另一个插件 `plugin_b` 提供的功能，那么我们可以在 `plugin_a` 的代码中（通常在 `plugin_info` 定义之后，实际使用依赖功能之前）声明依赖关系：

```python
from murainbot.core import PluginManager
# 其他导入...

plugin_info = PluginManager.PluginInfo(...) # plugin_a 的信息

# --- 声明对 plugin_b 的依赖 ---
try:
    # requirement_plugin 会尝试加载 plugin_b (如果尚未加载)
    # 并返回包含 plugin_b 信息的字典
    plugin_b_data = PluginManager.requirement_plugin("plugin_b")
    # 或者，如果 plugin_b 是单个文件:
    # plugin_b_data = PluginManager.requirement_plugin("plugin_b.py")

    # 依赖加载成功后，可以安全地导入和使用 plugin_b
    import plugins.plugin_b # 对于包形式的插件
    # from plugins import plugin_b # 另一种导入方式
    # from plugins.plugin_b_file import some_function # 对于文件形式的插件

    logger.info(f"插件 plugin_a 成功依赖并加载了 plugin_b v{plugin_b_data['info'].VERSION}")

except FileNotFoundError:
    logger.error("依赖错误：找不到插件 plugin_b！插件 plugin_a 的部分功能可能无法使用。")
    # 可以选择在这里抛出异常阻止 plugin_a 加载，或让其带有限功能运行
except Exception as e:
    logger.error(f"加载依赖插件 plugin_b 时发生错误: {e}。插件 plugin_a 的部分功能可能无法使用。")
    # 同上，处理错误

# --- plugin_a 的其他代码 ---
# def some_function_using_b():
#     plugins.plugin_b.do_something()
```

**`requirement_plugin(plugin_name: str) -> dict`**

*   **参数:**
    *   `plugin_name` (str): **必需**。被依赖插件的名称。规则如下：
        *   如果依赖的是 **包形式** 的插件（文件夹），则传入 **文件夹的名称** (例如 `"plugin_b"`)。
        *   如果依赖的是 **文件形式** 的插件（单个 `.py` 文件），则传入 **文件的名称，包含 `.py` 后缀** (例如 `"plugin_b.py"`)。
*   **行为:**
    1.  检查 `plugin_name` 是否在 `found_plugins` 中。如果不存在，抛出 `FileNotFoundError`。
    2.  检查该插件是否已经在 `plugins` 列表中（即已加载）。如果是，则直接返回该插件的信息字典。
    3.  如果插件存在但未加载，则调用内部的 `load_plugin` 函数尝试加载它。
    4.  加载过程中会检查被依赖插件的 `ENABLED` 状态。如果被依赖插件被禁用，会记录错误并抛出异常。
    5.  如果加载过程中发生其他错误，会记录错误并抛出异常。
    6.  如果加载成功，将被依赖插件的信息添加到 `plugins` 列表，并返回该插件的信息字典。
*   **返回值:**
    *   成功时返回一个字典，包含被依赖插件的信息，结构类似于：`{'name': str, 'plugin': module, 'info': PluginInfo, 'file_path': str, 'path': str}`。
*   **异常:**
    *   `FileNotFoundError`: 如果找不到名为 `plugin_name` 的插件。
    *   `Exception`: 如果被依赖的插件被禁用 (`ENABLED=False`) 或在加载过程中发生其他错误。

**最佳实践:**

*   在插件的早期阶段（如 `import` 语句之后）声明所有依赖，然后再使用import加载他们。
*   使用 `try...except` 块来处理依赖加载可能出现的错误，并根据情况决定插件是否应该继续加载或运行。

## 获取调用者插件信息 (`get_caller_plugin_data`)

这是一个工具函数，用于确定当前代码执行点的调用者属于哪个插件。它通过检查 Python 的调用栈来实现。

```python
from murainbot.core import PluginManager

def utility_function():
    # 这个函数可能被不同的插件调用
    caller_plugin_data = PluginManager.get_caller_plugin_data()
    if caller_plugin_data:
        caller_name = caller_plugin_data['info'].NAME if caller_plugin_data.get('info') else caller_plugin_data['name']
        logger.debug(f"utility_function 被插件 '{caller_name}' 调用。")
        # 可以根据调用者插件执行不同的逻辑
    else:
        logger.debug("utility_function 从非插件代码调用。")

# 在插件 A 中调用:
# utility_function() -> 日志会显示被插件 A 调用

# 在插件 B 中调用:
# utility_function() -> 日志会显示被插件 B 调用
```

**`get_caller_plugin_data() -> dict | None`**

*   **行为:** 向上遍历调用栈，检查每个帧的文件路径是否位于 `/plugins` 目录下，并与 `found_plugins` 中的插件路径进行匹配。
*   **返回值:**
    *   如果找到了调用者所属的插件，返回该插件在 `found_plugins` 中的信息字典。
    *   如果没有找到（例如调用来自框架核心代码或其他非插件目录），返回 `None`。

**主要用途:** 这个函数主要被框架内部的其他工具（例如 `murainbot.utils.PluginConfig` 可能用它来确定配置文件的名称）或需要根据调用插件上下文提供不同行为的共享库使用。普通插件开发者直接使用它的场景可能不多。

## 已弃用的 `run_plugin_main`

代码中存在 `run_plugin_main` 函数及其通过 `EscalationEvent` 触发的包装器 `run_plugin_main_wrapper`。这似乎是一种较旧的插件执行模式，即插件定义一个 `main(event_data, work_path)` 函数，由框架在收到特定事件（`EscalationEvent`，可能是所有事件的基类或转发器）时调用。

**当前状态:**

*   该模式在代码注释和现代 MRB2 设计（以 `EventHandlers` 为主）中已被视为 **弃用**。
*   **不推荐** 新插件使用定义 `main` 函数的方式来响应事件。应优先使用 `EventManager` (用于自定义内部事件) 或 `EventHandlers` (用于响应 OneBot 事件) 来注册事件处理器。

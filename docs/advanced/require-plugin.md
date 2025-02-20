# 插件依赖

MuRainBot2 插件化系统的设计使得插件之间可以功能独立、各司其职，我们可以更好地维护和扩展插件。
但是，有时候我们可能需要在不同插件之间调用功能。
MuRainBot2 生态中就有一类插件，它们专为其他插件提供功能支持，如：针对某些实现端的拓展插件、数据存储插件等。
这时候我们就需要在插件之间进行插件依赖。

## 声明插件依赖

对于这种情况，MuRainBot2提供了一种方法来在插件内声明插件依赖，以避免插件之间重复加载之类的问题。
此方法就是 `core.PluginManager.requirement_plugin`

假设我们有一个插件 `plugin_a`，它需要依赖另一个插件 `plugin_b`，那么我们可以在 `plugin_a` 中声明依赖关系：
```python
from Lib.core import PluginManager
PluginManager.requirement_plugin("plugin_b")
import plugins.plugin_b
```
不过，需要注意，对于插件的名称 ，如果依赖的是库形式的插件则是库文件夹的名称，如果依赖的是文件形式则是插件文件的名称（文件名称包含后缀）。

声明依赖后，就可以直接import 依赖的插件了。

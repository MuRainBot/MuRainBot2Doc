# 插件配置文件

在插件中，难免会有需要配置的内容，这时直接写在代码内显然不是最优的方案，MuRainBot2 提供了一个插件配置的类以帮助开发者编写插件的配置文件。

## 使用
首先我们需要实例化插件配置类
```python
config = PluginConfig.PluginConfig()
```
这样，PluginConfig 就会自动获取插件名称，并拼接路径，默认的插件配置存储路径在 `./plugin_config/<插件名称>.yaml` 下。

如果需要设置插件的默认配置文件以在插件没有配置文件的情况下自动生成需要在实例化时填如 `default_config` 字段
```python
config = PluginConfig.PluginConfig(default_config="""# 插件xxx配置文件
""")
```

上面是str格式的默认配置文件，也可以填入 dict 格式的配置文件，不过这样就不会有注释了

如果需要获取其中的某个字段可以使用 `get` 方法

```python
config.get("key")
```

具体用法可以查看源码或API文档：[PluginConfig](https://mrb2api.xiaosu.icu/murainbot/utils/PluginConfig.html)

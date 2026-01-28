# Memio 扩展

[English](./README.md) | 简体中文

本仓库包含了 [Moment](https://play.google.com/store/apps/details?id=com.cpacm.memio) 应用的所有可用扩展目录。这是一个用于获取站点信息的组件库。

<a href='https://play.google.com/store/apps/details?id=com.cpacm.memio'><img alt='Get it on Google Play' src='https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png' width='320'/></a>

## 第三方扩展源

目前第三方的扩展仓库可以在[Community Extensions](https://github.com/memio-app/community-extensions) 仓库中查看。
如果你自己开发或拓展了扩展源，欢迎提交到 [Community Extensions](https://github.com/memio-app/community-extensions) 仓库中。

## 开发

想要对某一个站点进行开发扩展之前，或许你可以看看有没有相对应的 Rss 订阅，或者已经有对应的网站扩展，这样您可以直接使用它们而节省开发的时间。

每一个扩展都有一个独一无二的 key 值，在确定你开发的扩展KEY时可以先确认一下是否已经有相同 key 值的扩展存在。

在教程的示例中，我们会通过制作一个普通网站的扩展来展示整个过程。更详细的参数和API 可以在 [数据结构](/cn/docs/base) 中查看。

### 开发流程

1. 克隆或下载 [Memio Extensions](https://github.com/memio-app/memio-extensions) 代码仓库；
2. 进入仓库的目录下，通过 `npm install` 命令行安装依赖项；
3. 在 app 目录下，您可以开始创建或修改您的站点扩展；
4. 在 __test__ 目录下验证您的站点是否可行；
5. 修改 rollup.config.mjs 文件，将输入文件路径指向您正在开发的扩展文件，然后使用 `rollup -c` 命令进行打包；
6. 在 dist 目录下找到您新生成的站点扩展，将其导入 Memio 应用中。

### 生成json文件

可以使用 `scripts/generate-json.mjs` 将 app 下的所有扩展信息生成json，方便将其导入 Memio 应用中。


## ⚠️ 免责声明

**本仓库所有扩展插件仅供学习交流使用。** 开发者不拥有源网站版权，也不对第三方网站内容的合法性负责。使用者应当遵守相关法律法规，尊重原始内容创作者的知识产权。请勿将这些扩展用于任何商业用途或非法活动。
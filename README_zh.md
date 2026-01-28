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

1. 克隆或下载 [Memio Extensions](https://github.com/Moment-Box/extensions) 代码仓库；
2. 进入仓库的目录下，通过 `npm install` 命令行安装依赖项；
3. 在 app 目录下，您可以开始创建或修改您的站点扩展；
4. 在 __test__ 目录下验证您的站点是否可行；
5. 修改 rollup.config.mjs 文件，将输入文件路径指向您正在开发的扩展文件，然后使用 `rollup -c` 命令进行打包；
6. 在 dist 目录下找到您新生成的站点扩展，将其导入 Memio 应用中。

## 提交扩展

```markdown
  
### 🔗 Involved Issue / 该 PR 相关 Issue

Close #

### ✍️ description / 该站点的描述

| Name | Value |

| :--: | :--: |

| Name | |

| Url | |

| Key | |

| Lang | |

### ✅ Checklist / 自查清单


- [ ] New Extension / 新的扩展

- [X] Extension Type / 扩展类型

	- [ ] Article / 文章
	
	- [ ] Picture / 图片
	
	- [ ] Video / 视频
	
	- [ ] Audio / 音频
	
	- [ ] Novel / 小说

- [ ] Is login required? / 是否需要登录

	- [ ] Force / 强制

- [ ] Is configuration required? / 是否需要参数配置

	- [ ] Force / 强制

- [ ] Are unit tests included? / 是否包含单元测试

- [ ] Is there a chapters or index? / 是否有章节目录

- [ ] Parse content(Media) after load? / 正文（媒体）解析是否是页面加载后

  

### 📝 Note / 说明

```

### Issue 相关

您可以在此处填写此 PR 相关的 Issue 编号。如果没有相关的 Issue，请将其留空。如果您的 PR 被合并，相关的 Issue 将自动关闭。如果您想关闭多个 Issue，请添加另一个以空格或逗号分隔的 `Close #`。例如，`Close #123, Close #456` 或 `Close #123 Close #456`。

### 描述相关

提供该站点的扩展信息，包括标题，url链接，一个独一无二的key值和支持的语言。

### 自查列表

该检查表可以方便确定此扩展中所包含的一些信息特征，请根据自己的扩展勾选相应的选项，方便审查人员快速检查内容。

> 要勾选项目，请将 `[ ]` 修改为 `[x]`.

### 说明

此部分包含您想要分享的任何附加信息或评论。


## ⚠️ 免责声明

**本仓库所有扩展插件仅供学习交流使用。** 开发者不拥有源网站版权，也不对第三方网站内容的合法性负责。使用者应当遵守相关法律法规，尊重原始内容创作者的知识产权。请勿将这些扩展用于任何商业用途或非法活动。
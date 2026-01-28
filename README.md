# Memio Extensions

English | [简体中文](./README_zh.md)

This repository contains the available extension catalogues for the [Memio](https://play.google.com/store/apps/details?id=com.cpacm.memio) app. It is a component library for fetching site information.

<a href='https://play.google.com/store/apps/details?id=com.cpacm.memio'><img alt='Get it on Google Play' src='https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png' width='200'/></a>

## Third-party Extension Sources

Currently, third-party extension repositories can be found in the [Community Extensions](https://github.com/memio-app/community-extensions) repository.
If you have developed or extended an extension source, you are welcome to submit it to the [Community Extensions](https://github.com/memio-app/community-extensions) repository.

## Development

Before developing an extension for a site, you might want to check if there is a corresponding RSS feed or an existing site extension. This can save you development time by allowing you to use them directly.

Each extension has a unique key. When choosing a key for your extension, please first confirm that an extension with the same key does not already exist.

In the tutorial example, we will demonstrate the entire process by creating an extension for a regular website. More detailed parameters and APIs can be found in the [Data Structure](/en/docs/base) documentation.

### Development Process

1.  Clone or download the [Memio Extensions](https://github.com/Moment-Box/extensions) code repository;
2.  Navigate to the repository's directory and install dependencies using the `npm install` command;
3.  In the `app` directory, you can start creating or modifying your site extension;
4.  In the `__test__` directory, verify that your site extension works as expected;
5.  Modify the `rollup.config.mjs` file to point the input file path to the extension file you are developing, then bundle it using the `rollup -c` command;
6.  Find your newly generated site extension in the `dist` directory and import it into the Memio application.

## Submitting an Extension

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

### Issue Related

You can fill in the Issue number related to this PR here. If there is no related Issue, please leave it blank. If your PR is merged, the related Issue will be automatically closed. If you want to close multiple Issues, please add another `Close #` separated by a space or comma. For example, `Close #123, Close #456` or `Close #123 Close #456`.

### Description Related

Provide the extension information for the site, including the title, URL link, a unique key, and supported languages.

### Checklist

This checklist helps to identify some of the features included in this extension. Please check the corresponding options according to your extension, so that reviewers can quickly check the content.

> To check an item, change `[ ]` to `[x]`.

### Note

This section contains any additional information or comments you wish to share.

## ⚠️ Disclaimer

**All extensions in this repository are for learning and communication purposes only.** The developers do not own the copyright of the source websites and are not responsible for the legality of third-party website content. Users should comply with relevant laws and regulations and respect the intellectual property rights of the original content creators. Please do not use these extensions for any commercial purposes or illegal activities.
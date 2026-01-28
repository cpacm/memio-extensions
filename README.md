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

### Generate JSON File

You can use `scripts/generate-json.mjs` to generate a JSON file containing information for all extensions under the `app` directory, making it easier to import them into the Memio application.



## ⚠️ Disclaimer

**All extensions in this repository are for learning and communication purposes only.** The developers do not own the copyright of the source websites and are not responsible for the legality of third-party website content. Users should comply with relevant laws and regulations and respect the intellectual property rights of the original content creators. Please do not use these extensions for any commercial purposes or illegal activities.
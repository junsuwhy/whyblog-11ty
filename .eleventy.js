module.exports = function(eleventyConfig) {
  // 複製靜態文件
  eleventyConfig.addPassthroughCopy({"src/assets": "assets"});
  eleventyConfig.addPassthroughCopy({"src/css": "css"});
  
  // 設定 Markdown 解析器選項
  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: "<!-- excerpt -->"
  });
  
  // 日期格式化過濾器
  eleventyConfig.addFilter("formatDate", function(date) {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });
  
  // 添加網址正規化過濾器，優先使用 permalink
  eleventyConfig.addFilter("normalizeUrl", function(item) {
    if (item && item.data && item.data.permalink) {
      return item.data.permalink;
    }
    return item.url;
  });

  // 使用標籤定義集合
  eleventyConfig.addCollection("blog", function(collectionApi) {
    return collectionApi.getFilteredByGlob("content/blog/**/*.md");
  });
  
  eleventyConfig.addCollection("knowledge", function(collectionApi) {
    let collection = collectionApi.getFilteredByGlob("content/knowledge/**/*.md");
    // 確保使用自訂的 permalink
    collection = collection.map(item => {
      if (item.data.permalink) {
        // 直接修改原始物件的 URL
        item.url = item.data.permalink;
        
        // 修改排序路徑以確保Eleventy正確處理
        item.outputPath = item.outputPath.replace(
          item.filePathStem.replace('/content', ''),
          item.data.permalink.replace(/\/$/, '')
        );
        
        // 確保所有使用這個物件的模板都會看到更新的URL
        item.data.page.url = item.data.permalink;
      }
      return item;
    });
    return collection;
  });
  
  // 特別處理src目錄中的索引頁面
  eleventyConfig.addCollection("pages", function(collectionApi) {
    return collectionApi.getFilteredByGlob(["src/**/*.njk", "!src/_includes/**/*", "!src/_layouts/**/*"]);
  });

  // 設定多輸入目錄
  return {
    // 定義多個輸入目錄
    dir: {
      output: "_site",
      includes: "src/_includes",
      layouts: "src/_layouts"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    // 設定多輸入目錄
    pathPrefix: "/",
    // 使用自定義函數來處理檔案路徑
    passthroughFileCopy: true,
    // 自定義 key 與檔案路徑 pattern 的對應
    dataTemplateEngine: false,
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    // 自定義檔案路徑
    eleventyComputed: {
      permalink: data => {
        // 如果文件中有明確設定 permalink，優先使用
        if (data.permalink) {
          return data.permalink;
        }
        
        // 特殊處理 src/ 下的檔案
        if (data.page.inputPath.startsWith('./src/')) {
          // 特殊處理首頁
          if (data.page.inputPath === './src/index.njk') {
            return '/';
          }
          const path = data.page.filePathStem.replace('/src/', '/');
          return path + '/';
        }
        // 特殊處理 content/ 下的檔案
        else if (data.page.inputPath.startsWith('./content/')) {
          return data.page.filePathStem.replace('/content/', '/') + '/';
        }
        return data.permalink;
      }
    }
  };
}
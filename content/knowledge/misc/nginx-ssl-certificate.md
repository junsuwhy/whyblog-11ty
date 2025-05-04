---
layout: post
title: Nginx SSL 憑證檔案與轉檔設定說明
date: 2024-05-01
tags: [knowledge, nginx, ssl, certificate]
permalink: /knowledge/misc/ssl-certificate/
---

# Nginx SSL 憑證檔案與轉檔設定說明

> 本文件整理常見憑證檔案格式、轉檔指令、Nginx 設定範例與驗證／重載指令，可作為日後快速查閱備忘。

<!-- excerpt -->

---

## 1. 常見檔案格式與用途

|副檔名|格式類型|典型檔案名範例|內含資料|主要用途|
|---|---|---|---|---|
|`.key`|**PEM**|`server.key`|私鑰（可能有密碼）|伺服器端僅存放於本機，不可外流|
|`.crt` / `.cer`|**PEM** or **DER**|`example.com.crt`|伺服器憑證（End‑entity）|提供給用戶端驗證網站身分|
|`.pem`|**PEM**|`fullchain.pem`|通常是「憑證 + 中繼」串接|Nginx `ssl_certificate` 常用|
|`.p7b` / `.p7c`|**PKCS#7**|`bundle.p7b`|多張「中繼/根」封裝|先轉成 PEM 用於 Nginx|
|`.pfx` / `.p12`|**PKCS#12**|`cert_bundle.pfx`|憑證 + 私鑰（已加密）|Windows/IIS 或 Java Keystore 匯入|
|`ca‑bundle` / `chain.pem`|**PEM**|`sectigo_chain.pem`|中繼(+根)憑證|Nginx `ssl_trusted_certificate`|

---

## 2. 常用轉檔指令

> 指令皆以 `openssl` 為例，可在 Linux/macOS 直接使用。

|需求|指令範例|
|---|---|
|**DER → PEM**|`openssl x509 -inform DER -in cert.cer -out cert.pem`|
|**PKCS#7 (P7B) → PEM**|`openssl pkcs7 -print_certs -in bundle.p7b -out bundle.pem`|
|**PFX → 憑證(無私鑰)**|`openssl pkcs12 -nokeys -in cert.pfx -out cert.pem`|
|**PFX → 私鑰(有密碼)**|`openssl pkcs12 -nocerts -in cert.pfx -out key.pem`|
|**移除私鑰密碼**|`openssl rsa -in key.pem -out key-nopw.pem`|
|**合併憑證與中繼**|`cat cert.pem bundle.pem > fullchain.pem`|

> 🔖 **小技巧**：PEM 段落之間務必保留一個空白換行，避免 `bad end line` 錯誤。

---

## 3. Nginx 設定範例

### 3.1 單檔 fullchain 寫法（最簡單）

```nginx
server {
    listen 443 ssl http2;
    server_name  example.com www.example.com;

    ssl_certificate      /etc/nginx/ssl/fullchain.pem;   # 憑證+中繼
    ssl_certificate_key  /etc/nginx/ssl/server.key;      # 私鑰 (無密碼)

    ssl_protocols        TLSv1.2 TLSv1.3;
    ssl_ciphers          HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
}
```

### 3.2 分離憑證與鏈（建議）

```nginx
server {
    listen 443 ssl http2;
    server_name  example.com www.example.com;

    ssl_certificate           /etc/nginx/ssl/example.com.crt;  # 只放網站憑證
    ssl_certificate_key       /etc/nginx/ssl/server.key;       # 私鑰 (無密碼)
    ssl_trusted_certificate   /etc/nginx/ssl/chain.pem;        # 中繼(+根)

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8;
}
```

> 建議私鑰與其所在目錄權限如下：

```bash
# 僅 root 能存取目錄
sudo chmod 700 /etc/nginx/ssl

# 私鑰檔僅 root 可讀寫
sudo chown root:root /etc/nginx/ssl/server.key
sudo chmod 600 /etc/nginx/ssl/server.key
```

---

## 4. 檔案驗證與 Nginx 操作指令

### 4.1 驗證私鑰與憑證是否匹配

```bash
openssl rsa  -noout -modulus -in server.key        | openssl md5
openssl x509 -noout -modulus -in example.com.crt   | openssl md5
# 兩串 MD5 值必須相同
```

### 4.2 驗證憑證鏈完整

```bash
openssl verify -CAfile chain.pem example.com.crt   # 顯示 OK 即通過
```

### 4.3 Nginx 語法檢查與重新載入

```bash
sudo nginx -t                          # 檢查設定檔語法
sudo systemctl reload nginx            # 平滑重載，不中斷連線
# 若要完整重啟（有停機風險）
sudo systemctl restart nginx
```

> 每次修改憑證或設定檔後，務必先 `nginx -t` 再 reload，確保不中斷服務。

---

**更新紀錄**

- 2025‑04‑22：首版完成
    

> 如需新增其他案例或指令，請隨時於 Canvas 內編輯！
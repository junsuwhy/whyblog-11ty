---
layout: post
title: Debian／Ubuntu 使用 systemd‑timesyncd 調整 NTP Server 完整教學
date: 2024-05-01
tags: [knowledge, linux, ubuntu, debian, ntp, systemd]
permalink: /knowledge/linux/ntp-setup/
---

## Debian／Ubuntu 使用 systemd‑timesyncd 調整 NTP Server 完整教學

> 適用版本：Debian 10＋、Ubuntu 18.04＋（含 22.04、24.04）  
> 目的：把系統的時間同步來源（NTP Server）改成自家的 `time.server.mydomain.com.tw`，並驗證設定是否生效。

<!-- excerpt -->

---

### 1️⃣　修改 systemd‑timesyncd 的 NTP Server

1. **編輯設定檔**
    
    ```bash
    sudo nano /etc/systemd/timesyncd.conf
    ```
    
    在 `[Time]` 區塊加入或修改 `NTP=`，例如：
    
    ```
    [Time]
    NTP=time.server.mydomain.com.tw
    ```
    
    > 若同時想留備援，可用空白分隔：  
    > `NTP=time.server.mydomain.com.tw 1.1.1.1 8.8.8.8`
    
2. **重新啟動服務並確保開機自動啟用**
    
    ```bash
    sudo systemctl restart systemd-timesyncd
    sudo systemctl enable systemd-timesyncd
    ```
    

---

### 2️⃣　確認 NTP Server 已正確套用

```bash
timedatectl timesync-status      # Debian 12+/Ubuntu 22.04+

# 舊版系統用
timedatectl status
```

重點欄位解讀：

|欄位|代表意思|
|---|---|
|`Server:`|正在使用的 NTP Server，應顯示 `time.server.mydomain.com.tw`|
|`Leap:`|是否閏秒資訊正常|
|`Offset:`|本機時間與伺服器差距，幾十毫秒以內屬正常|
|`Poll:`|下次同步間隔，初期較短，穩定後可長達 64 min|

---

## 🔧 常見 QA／除錯

### Q1：怎麼查我的系統目前跑哪一款 NTP 同步工具？

```bash
systemctl list-unit-files | grep -E 'timesync|ntp|chrony'
```

|看到的服務|代表用的是|狀態|
|---|---|---|
|`systemd-timesyncd.service`|**systemd‑timesyncd**|建議開啟|
|`ntpsec.service`、`ntpd.service`|**ntpsec / ntpd**|二擇一|
|`chrony.service`|**chrony**|建議用於大規模或需要高精度時|

> **原則：只留一套。** 多套同時開會互搶 UDP 123，導致時間漂移。

---

### Q2：如果我現在不是用 systemd‑timesyncd，要怎麼裝回來？

1. 停用現有 NTP 服務（以 ntpsec 為例）
    
    ```bash
    sudo systemctl disable --now ntpsec.service
    ```
    
2. 安裝或重裝 `systemd-timesyncd`
    
    - **Debian 12／Ubuntu 22.04↑**：
        
        ```bash
        sudo apt install --reinstall systemd
        ```
        
        timesyncd 已隨 systemd 打包。
        
    - **舊版（Debian 11 以下）**：
        
        ```bash
        sudo apt install systemd-timesyncd
        ```
        
3. 啟用並立即啟動
    
    ```bash
    sudo systemctl enable --now systemd-timesyncd
    ```
    
4. 依前述步驟設定 `NTP=` 即可。
    

---

### Q3：systemd‑timesyncd 跟其他 NTP 套件差在哪？

|特性|**systemd‑timesyncd**|**chrony**|**ntpsec / ntpd**|
|---|---|---|---|
|角色|輕量 **SNTP Client**|全功能 NTPv4（客戶端＋伺服器）|全功能 NTPv4（客戶端＋伺服器）|
|精準度|ms 級，日常服務足夠|μs 級，收斂快，雲端環境友善|μs 級，可支援 PPS／GPS|
|支援 NTS 加密|❌|✅|✅（ntpsec）|
|可當內網 NTP Server|❌|✅|✅|
|安裝難度|內建、零依賴|需額外安裝|需額外安裝|
|典型使用情境|VM、小型服務、IoT|大量伺服器、高精度需求|科研、金融、想用 NTS|

> 簡單選擇：
> 
> - **只要把時間抓準** → 用 **systemd‑timesyncd**。
>     
> - **要當 NTP 伺服器、雲端大規模** → 考慮 **chrony**。
>     
> - **需要 NTS 或超高精度** → 考慮 **ntpsec**。
>     

---

## ☑️　檢查清單（做完可以逐項打勾）

-  `/etc/systemd/timesyncd.conf` 已寫入正確 `NTP=time.server.mydomain.com.tw`
    
-  `systemctl status systemd-timesyncd` 顯示 `active (running)`
    
-  `timedatectl timesync-status` 的 **Server** 行指向新伺服器
    
-  `Offset` 數值在數十毫秒以內並穩定
    
-  `ss -ulpn | grep :123` 確定只有 `systemd-timesyncd` 佔用 UDP 123
    

全部通過，就代表你的 Debian／Ubuntu 已經成功改用自家 NTP Server，同步無虞！👍
(() => {
    console.log("[B站弹幕增强] 已加载");

    const STORAGE_KEY = "roomAffixes";
    const SEND_BUTTON_SELECTOR = "button.send-btn";
    const CHAT_INPUT_SELECTOR = "textarea.chat-input";

    /**
     * 存储结构：
     * {
     *   "1700301235": { prefix: "前缀", suffix: "后缀" }
     * }
     */
    let roomAffixes = {};

    function getRoomId() {
        const match = location.pathname.match(/^\/(\d+)/);
        return match ? match[1] : "";
    }

    function normalizeConfig(config) {
        return {
            prefix: typeof config.prefix === "string" ? config.prefix : "",
            suffix: typeof config.suffix === "string" ? config.suffix : ""
        };
    }

    function getCurrentConfig() {
        const roomId = getRoomId();
        const config = roomAffixes[roomId];

        return config ? normalizeConfig(config) : null;
    }

    function loadConfigs() {
        chrome.storage.local.get(
            { [STORAGE_KEY]: {} },
            (result) => {
                roomAffixes = result[STORAGE_KEY] || {};
            }
        );
    }

    function getInput() {
        return document.querySelector(CHAT_INPUT_SELECTOR);
    }

    function getSendButton() {
        return document.querySelector(SEND_BUTTON_SELECTOR);
    }

    function setInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value"
        ).set;

        // B 站直播输入框由前端框架托管，直接 input.value = value
        // 可能不会同步到框架状态，所以这里调用原生 setter 后派发 input 事件。
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function applyAffix(input) {
        const config = getCurrentConfig();

        // 未给当前房间配置前后缀时，不修改弹幕内容。
        if (!config) {
            return;
        }

        const { prefix, suffix } = config;
        const text = input.value.trim();

        if (!text) {
            return;
        }

        // 避免用户手动输入过前后缀，或同一次发送流程里被重复处理。
        if (text.startsWith(prefix) && text.endsWith(suffix)) {
            return;
        }

        const enhancedText = prefix + text + suffix;

        setInputValue(input, enhancedText);
        console.log("[弹幕修改]", enhancedText);
    }

    function bindEnterSend(input) {
        if (input.dataset.enhancedEnter) {
            return;
        }

        input.dataset.enhancedEnter = "true";

        // 捕获阶段先改输入框内容，再让 B 站原本的回车发送逻辑继续执行。
        input.addEventListener(
            "keydown",
            (event) => {
                const isPlainEnter =
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.ctrlKey &&
                    !event.altKey &&
                    !event.metaKey;

                if (isPlainEnter) {
                    applyAffix(input);
                }
            },
            true
        );
    }

    function bindButtonSend(input, button) {
        if (button.dataset.enhanced) {
            return;
        }

        button.dataset.enhanced = "true";

        // 捕获阶段先改输入框内容，再交给 B 站原本的点击发送逻辑。
        button.addEventListener(
            "click",
            () => {
                applyAffix(input);
            },
            true
        );
    }

    function enhance() {
        const input = getInput();
        const button = getSendButton();

        if (!input || !button) {
            return;
        }

        bindEnterSend(input);
        bindButtonSend(input, button);
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes[STORAGE_KEY]) {
            roomAffixes = changes[STORAGE_KEY].newValue || {};
        }
    });

    loadConfigs();

    // B 站直播页是动态渲染的，输入框和按钮可能稍后才出现。
    setInterval(enhance, 1000);
})();

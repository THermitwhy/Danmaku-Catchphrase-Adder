const STORAGE_KEY = "roomAffixes";

const elements = {
    roomInput: document.getElementById("room-id"),
    prefixInput: document.getElementById("prefix"),
    suffixInput: document.getElementById("suffix"),
    saveButton: document.getElementById("save"),
    currentRoom: document.getElementById("current-room"),
    configList: document.getElementById("config-list")
};

/**
 * 和 content.js 共用同一份存储：
 * {
 *   "1700301235": { prefix: "前缀", suffix: "后缀" }
 * }
 */
let roomAffixes = {};

function parseRoomId(url) {
    try {
        const parsedUrl = new URL(url);
        const match = parsedUrl.pathname.match(/^\/(\d+)/);

        return match ? match[1] : "";
    } catch (error) {
        return "";
    }
}

function normalizeConfig(config) {
    return {
        prefix: typeof config.prefix === "string" ? config.prefix : "",
        suffix: typeof config.suffix === "string" ? config.suffix : ""
    };
}

function loadConfigs() {
    chrome.storage.local.get(
        { [STORAGE_KEY]: {} },
        (result) => {
            roomAffixes = result[STORAGE_KEY] || {};
            renderConfigList();
        }
    );
}

function saveConfigs(nextConfigs) {
    roomAffixes = nextConfigs;

    chrome.storage.local.set(
        { [STORAGE_KEY]: nextConfigs },
        renderConfigList
    );
}

function createTextInput(value, placeholder) {
    const input = document.createElement("input");

    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;

    return input;
}

function createDeleteButton(roomId) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "delete";
    button.textContent = "删";
    button.title = "删除";
    button.addEventListener("click", () => {
        const nextConfigs = { ...roomAffixes };

        delete nextConfigs[roomId];
        saveConfigs(nextConfigs);
    });

    return button;
}

function saveConfigRow(originalRoomId, rowInputs) {
    const nextRoomId = rowInputs.room.value.trim();

    if (!nextRoomId) {
        rowInputs.room.focus();
        return;
    }

    const nextConfigs = { ...roomAffixes };

    // 房间号本身允许编辑，所以保存时要先删旧 key，再写新 key。
    delete nextConfigs[originalRoomId];
    nextConfigs[nextRoomId] = {
        prefix: rowInputs.prefix.value,
        suffix: rowInputs.suffix.value
    };

    saveConfigs(nextConfigs);
}

function createConfigRow(roomId, config) {
    const safeConfig = normalizeConfig(config);
    const row = document.createElement("div");
    const rowInputs = {
        room: createTextInput(roomId, "房间号"),
        prefix: createTextInput(safeConfig.prefix, "前缀"),
        suffix: createTextInput(safeConfig.suffix, "后缀")
    };
    const deleteButton = createDeleteButton(roomId);

    row.className = "config-row";

    // 已保存配置采用失焦/回车后的 change 自动保存，减少额外按钮占用。
    Object.values(rowInputs).forEach((input) => {
        input.addEventListener("change", () => {
            saveConfigRow(roomId, rowInputs);
        });
    });

    row.append(
        rowInputs.room,
        rowInputs.prefix,
        rowInputs.suffix,
        deleteButton
    );

    return row;
}

function renderEmptyState() {
    const empty = document.createElement("div");

    empty.className = "empty";
    empty.textContent = "暂无配置。保存后只会在对应直播间生效。";
    elements.configList.appendChild(empty);
}

function renderConfigList() {
    elements.configList.textContent = "";

    const entries = Object.entries(roomAffixes)
        .sort(([leftRoom], [rightRoom]) => leftRoom.localeCompare(rightRoom));

    if (!entries.length) {
        renderEmptyState();
        return;
    }

    entries.forEach(([roomId, config]) => {
        elements.configList.appendChild(createConfigRow(roomId, config));
    });
}

function saveFormConfig() {
    const roomId = elements.roomInput.value.trim();

    if (!roomId) {
        elements.roomInput.focus();
        return;
    }

    saveConfigs({
        ...roomAffixes,
        [roomId]: {
            prefix: elements.prefixInput.value,
            suffix: elements.suffixInput.value
        }
    });
}

function fillCurrentRoomFromActiveTab() {
    chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        (tabs) => {
            const roomId = tabs[0] ? parseRoomId(tabs[0].url) : "";

            if (!roomId) {
                return;
            }

            elements.roomInput.value = roomId;
            elements.currentRoom.textContent = `当前房间号：${roomId}`;
        }
    );
}

elements.saveButton.addEventListener("click", saveFormConfig);

fillCurrentRoomFromActiveTab();
loadConfigs();
